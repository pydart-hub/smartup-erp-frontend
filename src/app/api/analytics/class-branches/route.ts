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
 * GET /api/analytics/class-branches?program=X
 *
 * Returns per-branch metrics for a given program, plus subject aggregates.
 * Level 2 of the class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    if (!program) {
      return NextResponse.json({ error: "program param required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

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

    // 2. Fetch all batches for this program
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

    // Group by branch
    const branchBatches = new Map<string, string[]>();
    for (const b of batches) {
      const br = b.custom_branch || "Unknown";
      if (!branchBatches.has(br)) branchBatches.set(br, []);
      branchBatches.get(br)!.push(b.name);
    }

    if (branchBatches.size === 0) {
      return NextResponse.json({
        program,
        branches: [],
        subjects: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_exam_score_pct: 0, pass_rate: 0 },
      });
    }

    const allBatchNames = batches.map((b) => b.name);
    const batchToBranch = new Map<string, string>();
    for (const [branch, batchList] of branchBatches.entries()) {
      for (const b of batchList) batchToBranch.set(b, branch);
    }

    // 3. Fetch all attendance + exam plans in parallel
    const [attRes, plansRes] = await Promise.all([
      fetch(
        `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
          filters: JSON.stringify([
            ["student_group", "in", allBatchNames],
            ["date", ">=", fromDate],
            ["date", "<=", toDate],
          ]),
          fields: JSON.stringify(["student", "status", "student_group"]),
          limit_page_length: "0",
        })}`,
        { headers: { Authorization: auth }, cache: "no-store" },
      ),
      fetch(
        `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
          filters: JSON.stringify([
            ["student_group", "in", allBatchNames],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify(["name", "student_group", "course"]),
          limit_page_length: "500",
        })}`,
        { headers: { Authorization: auth }, cache: "no-store" },
      ),
    ]);

    const attRecords: { student: string; status: string; student_group: string }[] =
      attRes.ok ? (await attRes.json()).data ?? [] : [];
    const plans: { name: string; student_group: string; course: string }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    // 4. Fetch exam results
    let examResults: {
      student: string;
      total_score: number;
      maximum_score: number;
      course: string;
      assessment_plan: string;
    }[] = [];
    if (plans.length > 0) {
      const planNames = plans.map((p) => p.name);
      const resultsRes = await fetch(
        `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
          filters: JSON.stringify([
            ["assessment_plan", "in", planNames],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify([
            "student",
            "total_score",
            "maximum_score",
            "course",
            "assessment_plan",
          ]),
          limit_page_length: "5000",
        })}`,
        { headers: { Authorization: auth }, cache: "no-store" },
      );
      examResults = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];
    }

    const planLookup = new Map(plans.map((p) => [p.name, p]));
    const planToBranch = new Map<string, string>();
    for (const p of plans) {
      const branch = batchToBranch.get(p.student_group);
      if (branch) planToBranch.set(p.name, branch);
    }

    // 5. Per-branch attendance stats
    const branchAttMap = new Map<string, { byStudent: Map<string, { p: number; t: number }> }>();
    for (const [branch] of branchBatches.entries()) {
      branchAttMap.set(branch, { byStudent: new Map() });
    }
    for (const r of attRecords) {
      const branch = batchToBranch.get(r.student_group);
      if (!branch) continue;
      const bm = branchAttMap.get(branch)!;
      if (!bm.byStudent.has(r.student)) bm.byStudent.set(r.student, { p: 0, t: 0 });
      const s = bm.byStudent.get(r.student)!;
      s.t++;
      if (r.status === "Present" || r.status === "Late") s.p++;
    }

    // 6. Per-branch exam stats + subject data
    const branchExamMap = new Map<
      string,
      { byStudent: Map<string, { score: number; max: number }> }
    >();
    const subjectGlobal = new Map<
      string,
      { scores: number[]; maxs: number[]; branches: Set<string> }
    >();
    for (const [branch] of branchBatches.entries()) {
      branchExamMap.set(branch, { byStudent: new Map() });
    }
    for (const r of examResults) {
      const branch = planToBranch.get(r.assessment_plan);
      if (!branch) continue;
      const em = branchExamMap.get(branch)!;
      if (!em.byStudent.has(r.student)) em.byStudent.set(r.student, { score: 0, max: 0 });
      em.byStudent.get(r.student)!.score += r.total_score;
      em.byStudent.get(r.student)!.max += r.maximum_score;
      if (!subjectGlobal.has(r.course)) subjectGlobal.set(r.course, { scores: [], maxs: [], branches: new Set() });
      const sg = subjectGlobal.get(r.course)!;
      sg.scores.push(r.total_score);
      sg.maxs.push(r.maximum_score);
      sg.branches.add(branch);
    }

    // 7. Build branch results
    const branchResults = Array.from(branchBatches.entries())
      .map(([branch, batchList]) => {
        const attData = branchAttMap.get(branch)!;
        const examData = branchExamMap.get(branch)!;

        const attValues = Array.from(attData.byStudent.values());
        const totalStudents = attValues.length;
        const totalP = attValues.reduce((s, v) => s + v.p, 0);
        const totalT = attValues.reduce((s, v) => s + v.t, 0);
        const avgAttPct = totalT > 0 ? Math.round((totalP / totalT) * 1000) / 10 : 0;
        const chronicAbsentees = attValues.filter(
          (s) => s.t >= 3 && (s.p / s.t) * 100 < 75,
        ).length;

        const examPcts = Array.from(examData.byStudent.values())
          .filter((s) => s.max > 0)
          .map((s) => (s.score / s.max) * 100);
        const avgExamScore =
          examPcts.length > 0
            ? Math.round((examPcts.reduce((a, b) => a + b, 0) / examPcts.length) * 10) / 10
            : 0;
        const passed = examPcts.filter((p) => p >= 33).length;
        const passRate =
          examPcts.length > 0 ? Math.round((passed / examPcts.length) * 1000) / 10 : 0;

        return {
          branch,
          branch_name: companyNameMap.get(branch) ?? branch,
          total_students: totalStudents,
          total_batches: batchList.length,
          avg_attendance_pct: avgAttPct,
          avg_exam_score_pct: avgExamScore,
          pass_rate: passRate,
          chronic_absentees: chronicAbsentees,
        };
      })
      .filter((b) => b.total_batches > 0)
      .sort((a, b) => b.avg_exam_score_pct - a.avg_exam_score_pct);

    // 8. Subject summary
    const subjects = Array.from(subjectGlobal.entries())
      .map(([subject, d]) => {
        const total = d.scores.length;
        const maxPossible = d.maxs.length > 0 ? Math.max(...d.maxs) : 0;
        const avgScore = total > 0 ? d.scores.reduce((a, b) => a + b, 0) / total : 0;
        const avgPct = maxPossible > 0 ? Math.round((avgScore / maxPossible) * 1000) / 10 : 0;
        const passed = d.scores.filter(
          (s, i) => d.maxs[i] > 0 && (s / d.maxs[i]) * 100 >= 33,
        ).length;
        return {
          subject,
          total_students: total,
          avg_score_pct: avgPct,
          pass_rate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
          branches_count: d.branches.size,
        };
      })
      .sort((a, b) => b.avg_score_pct - a.avg_score_pct);

    const overall =
      branchResults.length > 0
        ? {
            total_students: branchResults.reduce((s, b) => s + b.total_students, 0),
            avg_attendance_pct: Math.round(
              branchResults.reduce((s, b) => s + b.avg_attendance_pct, 0) / branchResults.length,
            ),
            avg_exam_score_pct: Math.round(
              branchResults.reduce((s, b) => s + b.avg_exam_score_pct, 0) / branchResults.length,
            ),
            pass_rate: Math.round(
              branchResults.reduce((s, b) => s + b.pass_rate, 0) / branchResults.length,
            ),
          }
        : { total_students: 0, avg_attendance_pct: 0, avg_exam_score_pct: 0, pass_rate: 0 };

    return NextResponse.json({ program, branches: branchResults, subjects, overall });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/class-branches] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
