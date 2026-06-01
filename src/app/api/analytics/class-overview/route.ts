import { NextRequest, NextResponse } from "next/server";

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

    // 2. Group batches by program
    const programMap = new Map<string, { batches: string[]; branches: Set<string> }>();
    for (const b of allBatches) {
      const prog = b.program?.trim() || "Uncategorized";
      if (!programMap.has(prog)) programMap.set(prog, { batches: [], branches: new Set() });
      programMap.get(prog)!.batches.push(b.name);
      if (b.custom_branch) programMap.get(prog)!.branches.add(b.custom_branch);
    }

    if (programMap.size === 0) {
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

    // 3. Aggregate metrics per program in parallel
    const classResults = await Promise.all(
      Array.from(programMap.entries()).map(async ([program, pd]) => {
        const batchNames = pd.batches;

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

        const uniqueStudents = new Set(attRecords.map((r) => r.student));
        const totalStudents = uniqueStudents.size;
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
          total_branches: pd.branches.size,
          total_batches: batchNames.length,
          avg_attendance_pct: avgAttPct,
          avg_exam_score_pct: avgExamScore,
          pass_rate: passRate,
          chronic_absentees: chronicAbsentees,
        };
      }),
    );

    const validClasses = classResults
      .filter((c) => c.total_batches > 0)
      .sort((a, b) => a.program.localeCompare(b.program));

    return NextResponse.json({
      classes: validClasses,
      overall: {
        total_students: validClasses.reduce((s, c) => s + c.total_students, 0),
        avg_attendance_pct:
          validClasses.length > 0
            ? Math.round(validClasses.reduce((s, c) => s + c.avg_attendance_pct, 0) / validClasses.length)
            : 0,
        avg_exam_score_pct:
          validClasses.length > 0
            ? Math.round(validClasses.reduce((s, c) => s + c.avg_exam_score_pct, 0) / validClasses.length)
            : 0,
        pass_rate:
          validClasses.length > 0
            ? Math.round(validClasses.reduce((s, c) => s + c.pass_rate, 0) / validClasses.length)
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
