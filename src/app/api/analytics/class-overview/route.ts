import { NextRequest, NextResponse } from "next/server";
import {
  compareAcademicPrograms,
  getActiveStudentsByLatestProgram,
  normalizeProgramLabel,
} from "@/lib/server/analyticsEnrollment";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getAcademicWindowUTC(today: Date) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const startYear = month >= 4 ? year : year - 1;
  return { start: `${startYear}-05-01`, end: formatDateUTC(today) };
}

/**
 * GET /api/analytics/class-overview
 *
 * Returns per-program (class) aggregated metrics across all branches.
 * Level 1 of the new class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

    // 1. Fetch all active Student Groups (batches) across all branches
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([["group_based_on", "=", "Batch"], ["disabled", "=", 0]]),
        fields: JSON.stringify(["name", "program", "custom_branch"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const allBatches: { name: string; program: string; custom_branch: string }[] =
      sgRes.ok ? (await sgRes.json()).data ?? [] : [];

    const activeStudents = await getActiveStudentsByLatestProgram(auth);
    const categorizedStudents = activeStudents.filter((student) => student.program !== "Uncategorized");

    // 2. Build class list from active students' latest submitted Program Enrollment.
    const exactProgramCounts = new Map<string, { students: Set<string>; branches: Set<string>; batches: Set<string> }>();
    const normalizedProgramCounts = new Map<string, string>();
    for (const student of categorizedStudents) {
      if (!exactProgramCounts.has(student.program)) {
        exactProgramCounts.set(student.program, {
          students: new Set(),
          branches: new Set(),
          batches: new Set(),
        });
      }
      const programEntry = exactProgramCounts.get(student.program)!;
      programEntry.students.add(student.student);
      if (student.branch) programEntry.branches.add(student.branch);
      if (student.batch_name) programEntry.batches.add(student.batch_name);
      if (!normalizedProgramCounts.has(student.normalized_program)) {
        normalizedProgramCounts.set(student.normalized_program, student.program);
      }
    }

    // 3. Map active batch docs to the resolved program names so metrics can still query schedules/exams.
    const programMap = new Map<string, { batches: string[]; branches: Set<string> }>();
    for (const b of allBatches) {
      const rawProgram = b.program?.trim() || "Uncategorized";
      const resolvedProgram =
        exactProgramCounts.has(rawProgram)
          ? rawProgram
          : normalizedProgramCounts.get(normalizeProgramLabel(rawProgram)) ?? rawProgram;
      if (!programMap.has(resolvedProgram)) {
        programMap.set(resolvedProgram, { batches: [], branches: new Set() });
      }
      programMap.get(resolvedProgram)!.batches.push(b.name);
      if (b.custom_branch) programMap.get(resolvedProgram)!.branches.add(b.custom_branch);
    }

    if (exactProgramCounts.size === 0) {
      return NextResponse.json({
        classes: [],
        overall: {
          total_students: 0,
          avg_attendance_pct: 0,
          avg_exam_score_pct: 0,
          pass_rate: 0,
          chronic_absentees: 0,
        },
      });
    }

    // 4. Aggregate metrics per program in parallel
    const classResults = await Promise.all(
      Array.from(exactProgramCounts.entries()).map(async ([program, counts]) => {
        const pd = programMap.get(program);
        const batchNames = pd?.batches ?? [];

        // 3a. Attendance records for this program's batches
        const attRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
            filters: JSON.stringify([
              ["student_group", "in", batchNames],
              ["date", ">=", fromDate],
              ["date", "<=", toDate],
            ]),
            fields: JSON.stringify(["student", "status"]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const attRecords: { student: string; status: string }[] =
          attRes.ok ? (await attRes.json()).data ?? [] : [];

        const totalStudents = counts.students.size;
        const totalAtt = attRecords.length;
        const presentCount = attRecords.filter((r) => r.status === "Present" || r.status === "Late").length;
        const avgAttPct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 1000) / 10 : 0;

        // Chronic absentees
        const attByStudent = new Map<string, { present: number; total: number }>();
        for (const r of attRecords) {
          if (!attByStudent.has(r.student)) attByStudent.set(r.student, { present: 0, total: 0 });
          const s = attByStudent.get(r.student)!;
          s.total++;
          if (r.status === "Present" || r.status === "Late") s.present++;
        }
        const chronicAbsentees = Array.from(attByStudent.values()).filter(
          (s) => s.total >= 3 && (s.present / s.total) * 100 < 75,
        ).length;

        // 3b. Exam data
        const plansRes = await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
            filters: JSON.stringify([
              ["student_group", "in", batchNames],
              ["docstatus", "=", 1],
            ]),
            fields: JSON.stringify(["name"]),
            limit_page_length: "500",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const plans: { name: string }[] = plansRes.ok ? (await plansRes.json()).data ?? [] : [];

        let avgExamScore = 0;
        let passRate = 0;

        if (plans.length > 0) {
          const planNames = plans.map((p) => p.name);
          const resultsRes = await fetch(
            `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
              filters: JSON.stringify([
                ["assessment_plan", "in", planNames],
                ["docstatus", "=", 1],
              ]),
              fields: JSON.stringify(["student", "total_score", "maximum_score"]),
              limit_page_length: "5000",
            })}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          const examResults: { student: string; total_score: number; maximum_score: number }[] =
            resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

          const studentScores = new Map<string, { score: number; max: number }>();
          for (const r of examResults) {
            if (!studentScores.has(r.student)) studentScores.set(r.student, { score: 0, max: 0 });
            const ss = studentScores.get(r.student)!;
            ss.score += r.total_score;
            ss.max += r.maximum_score;
          }
          const pcts = Array.from(studentScores.values())
            .filter((s) => s.max > 0)
            .map((s) => (s.score / s.max) * 100);
          avgExamScore =
            pcts.length > 0
              ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10
              : 0;
          const passed = pcts.filter((p) => p >= 33).length;
          passRate = pcts.length > 0 ? Math.round((passed / pcts.length) * 1000) / 10 : 0;
        }

        return {
          program,
          total_students: totalStudents,
          total_branches: counts.branches.size,
          total_batches: counts.batches.size,
          avg_attendance_pct: avgAttPct,
          avg_exam_score_pct: avgExamScore,
          pass_rate: passRate,
          chronic_absentees: chronicAbsentees,
        };
      }),
    );

    const validClasses = classResults
      .filter((c) => c.total_students > 0)
      .sort((a, b) => compareAcademicPrograms(a.program, b.program));

    return NextResponse.json({
      classes: validClasses,
      overall: {
        total_students: categorizedStudents.length,
        avg_attendance_pct: categorizedStudents.length > 0
          ? Math.round(validClasses.reduce((sum, cls) => sum + cls.avg_attendance_pct * cls.total_students, 0) / categorizedStudents.length)
          : 0,
        avg_exam_score_pct: categorizedStudents.length > 0
          ? Math.round(validClasses.reduce((sum, cls) => sum + cls.avg_exam_score_pct * cls.total_students, 0) / categorizedStudents.length)
          : 0,
        pass_rate: categorizedStudents.length > 0
          ? Math.round(validClasses.reduce((sum, cls) => sum + cls.pass_rate * cls.total_students, 0) / categorizedStudents.length)
          : 0,
        chronic_absentees: validClasses.reduce((s, c) => s + c.chronic_absentees, 0),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/class-overview] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
