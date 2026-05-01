import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/exam-summary?branch=X&assessment_group=?&student_group=?
 *
 * Returns batch-wise exam analytics with subject breakdowns, toppers, weak students.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const branch = request.nextUrl.searchParams.get("branch");
    const assessmentGroupFilter = request.nextUrl.searchParams.get("assessment_group");
    const studentGroupFilter = request.nextUrl.searchParams.get("student_group");

    if (!branch) {
      return NextResponse.json({ error: "branch param required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch assessment plans for this branch
    const planFilters: (string | number)[][] = [
      ["custom_branch", "=", branch],
      ["docstatus", "=", 1],
    ];
    if (assessmentGroupFilter) planFilters.push(["assessment_group", "=", assessmentGroupFilter]);
    if (studentGroupFilter) planFilters.push(["student_group", "=", studentGroupFilter]);

    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify(planFilters),
        fields: JSON.stringify(["name", "student_group", "course", "assessment_group", "maximum_assessment_score", "program"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: {
      name: string; student_group: string; course: string;
      assessment_group: string; maximum_assessment_score: number; program: string;
    }[] = plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    if (plans.length === 0) {
      return NextResponse.json({
        batches: [],
        overall: { total_exams: 0, total_students_assessed: 0, avg_score_pct: 0, overall_pass_rate: 0 },
      });
    }

    // 2. Fetch all results
    const planNames = plans.map((p) => p.name);
    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "in", planNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "student_name", "assessment_plan",
          "course", "total_score", "maximum_score", "grade",
        ]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const results: {
      student: string; student_name: string; assessment_plan: string;
      course: string; total_score: number; maximum_score: number; grade: string;
    }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

    // 3. Fetch grading scale
    const gsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Grading%20Scale/SmartUp%20Grading%20Scale`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const gs = gsRes.ok ? (await gsRes.json()).data : null;
    const intervals: { grade_code: string; threshold: number }[] =
      gs?.intervals?.sort((a: { threshold: number }, b: { threshold: number }) => b.threshold - a.threshold) ?? [];

    function getGrade(pct: number): string {
      for (const iv of intervals) {
        if (pct >= iv.threshold) return iv.grade_code;
      }
      return intervals[intervals.length - 1]?.grade_code ?? "";
    }

    // Build plan lookup
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    // 4. Group by (student_group, assessment_group) → batch academic summary
    const batchKey = (sg: string, ag: string) => `${sg}|||${ag}`;
    const batchGroups = new Map<string, {
      student_group: string;
      program: string;
      assessment_group: string;
      subjectMap: Map<string, { scores: number[]; maxScores: number[]; grades: string[] }>;
      studentResults: Map<string, { subjects: { course: string; score: number; max: number; pct: number; grade: string; passed: boolean }[] }>;
    }>();

    // Seed batchGroups from ALL plans so batches without results still appear in the list.
    // Without this, only batches that have at least one result row are shown, causing
    // "Total Exams: N" to disagree with the class list (which shows fewer rows).
    for (const p of plans) {
      const key = batchKey(p.student_group, p.assessment_group);
      if (!batchGroups.has(key)) {
        batchGroups.set(key, {
          student_group: p.student_group,
          program: p.program || "",
          assessment_group: p.assessment_group,
          subjectMap: new Map(),
          studentResults: new Map(),
        });
      }
    }

    for (const r of results) {
      const plan = planLookup.get(r.assessment_plan);
      if (!plan) continue;

      const key = batchKey(plan.student_group, plan.assessment_group);
      if (!batchGroups.has(key)) {
        batchGroups.set(key, {
          student_group: plan.student_group,
          program: plan.program || "",
          assessment_group: plan.assessment_group,
          subjectMap: new Map(),
          studentResults: new Map(),
        });
      }
      const bg = batchGroups.get(key)!;

      // Subject analytics
      if (!bg.subjectMap.has(r.course)) {
        bg.subjectMap.set(r.course, { scores: [], maxScores: [], grades: [] });
      }
      const subj = bg.subjectMap.get(r.course)!;
      subj.scores.push(r.total_score);
      subj.maxScores.push(r.maximum_score || plan.maximum_assessment_score);
      const pct = r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0;
      subj.grades.push(r.grade || getGrade(pct));

      // Student results
      if (!bg.studentResults.has(r.student)) {
        bg.studentResults.set(r.student, { subjects: [] });
      }
      const sr = bg.studentResults.get(r.student)!;
      const scorePct = r.maximum_score > 0 ? Math.round((r.total_score / r.maximum_score) * 100 * 10) / 10 : 0;
      sr.subjects.push({
        course: r.course,
        score: r.total_score,
        max: r.maximum_score || plan.maximum_assessment_score,
        pct: scorePct,
        grade: r.grade || getGrade(scorePct),
        passed: scorePct >= 33,
      });
    }

    // 5. Build batch summaries
    const batchSummaries = Array.from(batchGroups.values()).map((bg) => {
      const subjects = Array.from(bg.subjectMap.entries()).map(([course, data]) => {
        const total = data.scores.length;
        const avgScore = total > 0 ? data.scores.reduce((a, b) => a + b, 0) / total : 0;
        const maxPossible = data.maxScores.length > 0 ? Math.max(...data.maxScores) : 0;
        const avgPct = maxPossible > 0 ? Math.round((avgScore / maxPossible) * 100 * 10) / 10 : 0;
        const passCount = data.scores.filter((s, i) => {
          const m = data.maxScores[i] || maxPossible;
          return m > 0 && (s / m) * 100 >= 33;
        }).length;

        const gradeDist: Record<string, number> = {};
        for (const g of data.grades) {
          gradeDist[g] = (gradeDist[g] || 0) + 1;
        }

        return {
          course,
          total_students: total,
          avg_score: Math.round(avgScore * 10) / 10,
          max_score: total > 0 ? Math.max(...data.scores) : 0,
          min_score: total > 0 ? Math.min(...data.scores) : 0,
          maximum_possible: maxPossible,
          avg_pct: avgPct,
          pass_count: passCount,
          fail_count: total - passCount,
          pass_rate: total > 0 ? Math.round((passCount / total) * 100 * 10) / 10 : 0,
          grade_distribution: gradeDist,
        };
      });

      // Toppers & weak students
      const studentAgg = Array.from(bg.studentResults.entries()).map(([student, data]) => {
        const totalScore = data.subjects.reduce((s, sub) => s + sub.score, 0);
        const totalMax = data.subjects.reduce((s, sub) => s + sub.max, 0);
        const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;
        const failedSubjects = data.subjects.filter((s) => !s.passed).map((s) => s.course);
        return { student, pct: overallPct, totalScore, totalMax, failedSubjects, passed: failedSubjects.length === 0 };
      });

      // Look up student names from results
      const nameMap = new Map<string, string>();
      for (const r of results) {
        if (r.student_name) nameMap.set(r.student, r.student_name);
      }

      studentAgg.sort((a, b) => b.pct - a.pct);
      const toppers = studentAgg.slice(0, 5).map((s, i) => ({
        student: s.student,
        student_name: nameMap.get(s.student) || s.student,
        pct: s.pct,
        total_score: s.totalScore,
        total_max: s.totalMax,
        rank: i + 1,
      }));
      const weakStudents = studentAgg
        .filter((s) => s.failedSubjects.length > 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 10)
        .map((s) => ({
          student: s.student,
          student_name: nameMap.get(s.student) || s.student,
          pct: s.pct,
          total_score: s.totalScore,
          total_max: s.totalMax,
          failed_subjects: s.failedSubjects,
        }));

      // All students with full classification
      const allStudentsList = studentAgg.map((s, i) => ({
        student: s.student,
        student_name: nameMap.get(s.student) || s.student,
        pct: s.pct,
        total_score: s.totalScore,
        total_max: s.totalMax,
        rank: i + 1,
        passed: s.passed,
        failed_subjects: s.failedSubjects,
        grade: getGrade(s.pct),
        subject_scores: bg.studentResults.get(s.student)?.subjects ?? [],
      }));

      const passCount = studentAgg.filter((s) => s.passed).length;
      const allPcts = studentAgg.map((s) => s.pct);
      const avgPct = allPcts.length > 0
        ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
        : 0;

      return {
        student_group: bg.student_group,
        program: bg.program,
        assessment_group: bg.assessment_group,
        subjects,
        total_students: bg.studentResults.size,
        overall_pass_rate: studentAgg.length > 0
          ? Math.round((passCount / studentAgg.length) * 100 * 10) / 10
          : 0,
        overall_avg_pct: avgPct,
        toppers,
        weak_students: weakStudents,
        all_students: allStudentsList,
      };
    });

    // 6. Overall
    const allStudents = new Set(results.map((r) => r.student));
    const allPcts = Array.from(batchGroups.values()).flatMap((bg) =>
      Array.from(bg.studentResults.entries()).map(([, data]) => {
        const totalScore = data.subjects.reduce((s, sub) => s + sub.score, 0);
        const totalMax = data.subjects.reduce((s, sub) => s + sub.max, 0);
        return totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      }),
    );
    const overallAvg = allPcts.length > 0
      ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
      : 0;
    const overallPass = allPcts.filter((p) => p >= 33).length;

    return NextResponse.json({
      batches: batchSummaries,
      overall: {
        total_exams: plans.length,
        total_students_assessed: allStudents.size,
        avg_score_pct: overallAvg,
        overall_pass_rate: allPcts.length > 0
          ? Math.round((overallPass / allPcts.length) * 100 * 10) / 10
          : 0,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/exam-summary] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
