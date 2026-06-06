import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type ProgramCourse = { course: string; course_name?: string; required?: number };

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
 * GET /api/analytics/subject-branches?program=X&subject=X
 *
 * Cross-branch comparison for a specific subject within a program.
 * Level 4 of the class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    const subject = request.nextUrl.searchParams.get("subject");
    if (!program || !subject) {
      return NextResponse.json(
        { error: "program and subject params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

    const programRes = await fetch(
      `${FRAPPE_URL}/api/resource/Program/${encodeURIComponent(program)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const programDoc: { courses?: ProgramCourse[] } =
      programRes.ok ? (await programRes.json()).data ?? {} : {};
    const programCourses = new Set(
      (programDoc.courses ?? [])
        .map((item) => item.course?.trim())
        .filter((course): course is string => Boolean(course)),
    );

    if (programCourses.size > 0 && !programCourses.has(subject)) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, health_score: 0 },
      });
    }

    // 1. Get company name map
    const companiesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Company?${new URLSearchParams({
        filters: JSON.stringify([["is_group", "=", 0]]),
        fields: JSON.stringify(["name", "company_name"]),
        limit_page_length: "50",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const companies: { name: string; company_name: string }[] =
      companiesRes.ok ? (await companiesRes.json()).data ?? [] : [];
    const companyNameMap = new Map(companies.map((c) => [c.name, c.company_name]));

    // 2. Batches for this program
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([
          ["program", "=", program],
          ["group_based_on", "=", "Batch"],
          ["disabled", "=", 0],
        ]),
        fields: JSON.stringify(["name", "custom_branch"]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batches: { name: string; custom_branch: string }[] =
      sgRes.ok ? (await sgRes.json()).data ?? [] : [];

    if (batches.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, health_score: 0 },
      });
    }

    const batchNames = batches.map((b) => b.name);
    const batchToBranch = new Map(batches.map((b) => [b.name, b.custom_branch]));

    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["schedule_date", ">=", fromDate],
          ["schedule_date", "<=", toDate],
        ]),
        fields: JSON.stringify(["name", "student_group"]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const schedules: { name: string; student_group: string }[] =
      schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];
    const scheduleToBranch = new Map(
      schedules.map((schedule) => [schedule.name, batchToBranch.get(schedule.student_group) ?? ""]),
    );

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

    // 3. Assessment plans for this subject in these batches
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "student_group"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; student_group: string }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    const planNames = plans.map((p) => p.name);
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    // 4. Results for this subject
    const results: {
      student: string;
      total_score: number;
      maximum_score: number;
      assessment_plan: string;
    }[] = planNames.length > 0
      ? await (async () => {
          const resultsRes = await fetch(
            `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
              filters: JSON.stringify([
                ["assessment_plan", "in", planNames],
                ["docstatus", "=", 1],
              ]),
              fields: JSON.stringify(["student", "total_score", "maximum_score", "assessment_plan"]),
              limit_page_length: "5000",
            })}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          return resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];
        })()
      : [];

    // 5. Aggregate per branch
    const branchData = new Map<
      string,
      { scores: number[]; maxs: number[]; attendanceByStudent: Map<string, { p: number; t: number }> }
    >();
    for (const batch of batches) {
      const branch = batch.custom_branch;
      if (!branchData.has(branch)) {
        branchData.set(branch, { scores: [], maxs: [], attendanceByStudent: new Map() });
      }
    }
    for (const record of attendanceRecords) {
      const branch = record.course_schedule ? scheduleToBranch.get(record.course_schedule) : undefined;
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, { scores: [], maxs: [], attendanceByStudent: new Map() });
      }
      const data = branchData.get(branch)!;
      if (!data.attendanceByStudent.has(record.student)) {
        data.attendanceByStudent.set(record.student, { p: 0, t: 0 });
      }
      const stats = data.attendanceByStudent.get(record.student)!;
      stats.t++;
      if (record.status === "Present" || record.status === "Late") stats.p++;
    }
    for (const r of results) {
      const plan = planLookup.get(r.assessment_plan);
      if (!plan) continue;
      const branch = batchToBranch.get(plan.student_group);
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, { scores: [], maxs: [], attendanceByStudent: new Map() });
      }
      branchData.get(branch)!.scores.push(r.total_score);
      branchData.get(branch)!.maxs.push(r.maximum_score);
    }

    const branchResults = Array.from(branchData.entries())
      .map(([branch, d]) => {
        const total = d.scores.length;
        const maxPossible = d.maxs.length > 0 ? Math.max(...d.maxs) : 0;
        const avgScore = total > 0 ? d.scores.reduce((a, b) => a + b, 0) / total : 0;
        const avgPct =
          maxPossible > 0 ? Math.round((avgScore / maxPossible) * 1000) / 10 : 0;
        const attendanceValues = Array.from(d.attendanceByStudent.values());
        const attendancePct =
          attendanceValues.length > 0
            ? Math.round(
                (attendanceValues.reduce((sum, value) => sum + (value.t > 0 ? (value.p / value.t) * 100 : 0), 0) /
                  attendanceValues.length) *
                  10,
              ) / 10
            : 0;
        const passed = d.scores.filter(
          (s, i) => d.maxs[i] > 0 && (s / d.maxs[i]) * 100 >= 33,
        ).length;
        const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
        const healthScore = Math.round(attendancePct * 0.4 + avgPct * 0.35 + passRate * 0.25);
        return {
          branch,
          branch_name: companyNameMap.get(branch) ?? branch,
          total_students: Math.max(total, attendanceValues.length),
          avg_attendance_pct: attendancePct,
          avg_score_pct: avgPct,
          pass_rate: passRate,
          avg_score: Math.round(avgScore * 10) / 10,
          maximum_possible: maxPossible,
          health_score: healthScore,
        };
      })
      .sort((a, b) => b.health_score - a.health_score || b.avg_score_pct - a.avg_score_pct);

    const allPcts = results
      .filter((r) => r.maximum_score > 0)
      .map((r) => (r.total_score / r.maximum_score) * 100);
    const allAttendancePcts = Array.from(branchData.values()).flatMap((data) =>
      Array.from(data.attendanceByStudent.values()).map((value) =>
        value.t > 0 ? (value.p / value.t) * 100 : 0,
      ),
    );
    const overallAttendance =
      allAttendancePcts.length > 0
        ? Math.round((allAttendancePcts.reduce((sum, value) => sum + value, 0) / allAttendancePcts.length) * 10) / 10
        : 0;
    const overallPassRate =
      allPcts.length > 0
        ? Math.round((allPcts.filter((p) => p >= 33).length / allPcts.length) * 1000) / 10
        : 0;
    const overall = {
      total_students: Math.max(results.length, allAttendancePcts.length),
      avg_attendance_pct: overallAttendance,
      avg_score_pct:
        allPcts.length > 0
          ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
          : 0,
      pass_rate: overallPassRate,
      health_score: Math.round(overallAttendance * 0.4 + (allPcts.length > 0
        ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
        : 0) * 0.35 + overallPassRate * 0.25),
    };

    return NextResponse.json({ program, subject, branches: branchResults, overall });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/subject-branches] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
