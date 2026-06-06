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
 * GET /api/analytics/subject-branch-students?program=X&subject=X&branch=X
 *
 * Returns branch-level student rankings for a single subject within a program.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    const subject = request.nextUrl.searchParams.get("subject");
    const branch = request.nextUrl.searchParams.get("branch");

    if (!program || !subject || !branch) {
      return NextResponse.json(
        { error: "program, subject and branch params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([
          ["program", "=", program],
          ["custom_branch", "=", branch],
          ["group_based_on", "=", "Batch"],
          ["disabled", "=", 0],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batchDocs: { name: string }[] = sgRes.ok ? (await sgRes.json()).data ?? [] : [];
    const batchNames = batchDocs.map((b) => b.name);

    if (batchNames.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branch,
        students: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, highest_score_pct: 0, health_score: 0 },
      });
    }

    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["schedule_date", ">=", fromDate],
          ["schedule_date", "<=", toDate],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const schedules: { name: string }[] = schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];
    const subjectScheduleNames = new Set(schedules.map((schedule) => schedule.name));

    const attendanceRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["date", ">=", fromDate],
          ["date", "<=", toDate],
        ]),
        fields: JSON.stringify(["student", "status", "course_schedule"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attendanceRecords: { student: string; status: string; course_schedule?: string }[] =
      attendanceRes.ok ? (await attendanceRes.json()).data ?? [] : [];

    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "student_group", "maximum_assessment_score"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; student_group: string; maximum_assessment_score: number }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    if (plans.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branch,
        students: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, highest_score_pct: 0, health_score: 0 },
      });
    }

    const planNames = plans.map((p) => p.name);
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "in", planNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "student",
          "student_name",
          "assessment_plan",
          "total_score",
          "maximum_score",
          "grade",
        ]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const results: {
      student: string;
      student_name: string;
      assessment_plan: string;
      total_score: number;
      maximum_score: number;
      grade: string;
    }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

    const attendanceByStudent = new Map<string, { p: number; t: number }>();
    for (const record of attendanceRecords) {
      if (!record.course_schedule || !subjectScheduleNames.has(record.course_schedule)) continue;
      if (!attendanceByStudent.has(record.student)) {
        attendanceByStudent.set(record.student, { p: 0, t: 0 });
      }
      const stats = attendanceByStudent.get(record.student)!;
      stats.t++;
      if (record.status === "Present" || record.status === "Late") stats.p++;
    }

    const studentMap = new Map<string, {
      student: string;
      student_name: string;
      student_group: string;
      score: number;
      maximum_score: number;
      grade: string;
    }>();

    for (const row of results) {
      const max = row.maximum_score || planLookup.get(row.assessment_plan)?.maximum_assessment_score || 0;
      if (!studentMap.has(row.student)) {
        studentMap.set(row.student, {
          student: row.student,
          student_name: row.student_name || row.student,
          student_group: planLookup.get(row.assessment_plan)?.student_group ?? "",
          score: 0,
          maximum_score: 0,
          grade: row.grade || "",
        });
      }
      const entry = studentMap.get(row.student)!;
      entry.score += row.total_score || 0;
      entry.maximum_score += max;
      if (!entry.grade && row.grade) entry.grade = row.grade;
    }

    const students = Array.from(studentMap.values())
      .map((row) => {
        const percentage = row.maximum_score > 0 ? Math.round((row.score / row.maximum_score) * 1000) / 10 : 0;
        const attendance = attendanceByStudent.get(row.student);
        const attendancePct = attendance && attendance.t > 0
          ? Math.round(((attendance.p / attendance.t) * 100) * 10) / 10
          : 0;
        const passed = percentage >= 33;
        const healthScore = Math.round(attendancePct * 0.4 + percentage * 0.35 + (passed ? 100 : 0) * 0.25);
        return {
          ...row,
          attendance_pct: attendancePct,
          percentage,
          passed,
          health_score: healthScore,
        };
      })
      .sort((a, b) => b.health_score - a.health_score || b.percentage - a.percentage);

    let currentRank = 1;
    const ranked = students.map((student, index) => {
      if (index > 0 && student.percentage < students[index - 1].percentage) {
        currentRank = index + 1;
      }
      return { ...student, rank: currentRank };
    });

    const totalStudents = ranked.length;
    const attendancePercentages = ranked.map((student) => student.attendance_pct);
    const percentages = ranked.map((student) => student.percentage);
    const avgScorePct =
      totalStudents > 0
        ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / totalStudents) * 10) / 10
        : 0;
    const avgAttendancePct =
      totalStudents > 0
        ? Math.round((attendancePercentages.reduce((sum, value) => sum + value, 0) / totalStudents) * 10) / 10
        : 0;
    const passCount = ranked.filter((student) => student.passed).length;
    const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 1000) / 10 : 0;

    return NextResponse.json({
      program,
      subject,
      branch,
      students: ranked,
      overall: {
        total_students: totalStudents,
        avg_attendance_pct: avgAttendancePct,
        avg_score_pct: avgScorePct,
        pass_rate: passRate,
        highest_score_pct: percentages.length > 0 ? Math.max(...percentages) : 0,
        health_score: Math.round(avgAttendancePct * 0.4 + avgScorePct * 0.35 + passRate * 0.25),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/subject-branch-students] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
