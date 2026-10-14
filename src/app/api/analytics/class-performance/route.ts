import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import { requireAuth } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

export interface SubjectBreakdown {
  course: string;
  total_students: number;
  avg_score: number;
  max_score: number;
  maximum_possible: number;
  avg_pct: number;
  pass_count: number;
  pass_rate: number;
}

export interface ClassExamPoint {
  exam_key: string;
  exam_title: string;
  assessment_group: string;
  schedule_date: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  subject_count: number;
  students_appeared: number;
  total_enrolled: number;
  students_absent: number;
  absent_rate: number;
  turnout_rate: number;
  batch_scores?: Record<
    string,
    {
      batch_code: string;
      total_score: number;
      maximum_score: number;
      percentage: number;
      students_appeared: number;
      total_enrolled: number;
      students_absent: number;
      absent_rate: number;
    }
  >;
  class_scores?: Record<
    string,
    {
      program: string;
      total_score: number;
      maximum_score: number;
      percentage: number;
      students_appeared: number;
      total_enrolled: number;
      students_absent: number;
      absent_rate: number;
    }
  >;
  subjects: Array<{
    course: string;
    total_score: number;
    maximum_score: number;
    percentage: number;
  }>;
}

export interface BatchComparison {
  student_group: string;
  student_group_name: string;
  student_count: number;
  avg_pct: number;
  exam_count: number;
  top_score: number;
}

export interface ClassStudentRanking {
  student: string;
  student_name: string;
  batch: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  exams_appeared: number;
  grade: string;
  rank: number;
}

function calculateGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  return "F";
}

/**
 * GET /api/analytics/class-performance
 * Query parameters:
 *  - branch: string (e.g. "Smart Up Palluruthy")
 *  - program: optional string (e.g. "10th State")
 *
 * If no program is specified, returns the list of available active classes for the branch.
 * If program is specified, returns full aggregated performance metrics, exam timeline,
 * batch comparisons, subject breakdowns, and student rankings.
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch");
  const program = searchParams.get("program");

  if (!branch) {
    // Return all active branches that have student groups
    const allGroupsRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify(["name", "custom_branch", "program"]),
      filters: JSON.stringify([
        ["group_based_on", "=", "Batch"],
        ["disabled", "=", 0],
      ]),
      limit_page_length: "500",
    });
    const allGroups = (allGroupsRes.data ?? []) as Array<{ name: string; custom_branch?: string; program?: string }>;
    
    // Also fetch master branches/companies
    const compRes = await frappeAdminGet("resource/Company", {
      fields: JSON.stringify(["name"]),
      limit_page_length: "50",
    });
    const companies = (compRes.data ?? []) as Array<{ name: string }>;

    const branchSummaryMap = new Map<string, { branch: string; batchCount: number; programs: Set<string> }>();
    for (const c of companies) {
      branchSummaryMap.set(c.name, { branch: c.name, batchCount: 0, programs: new Set() });
    }

    for (const g of allGroups) {
      const b = g.custom_branch || "Smart Up";
      if (!branchSummaryMap.has(b)) {
        branchSummaryMap.set(b, { branch: b, batchCount: 0, programs: new Set() });
      }
      const entry = branchSummaryMap.get(b)!;
      entry.batchCount += 1;
      if (g.program) entry.programs.add(g.program);
    }

    // Fetch student counts per branch
    const studentsRes = await frappeAdminGet("resource/Student", {
      fields: JSON.stringify(["name", "custom_branch"]),
      filters: JSON.stringify([["enabled", "=", 1]]),
      limit_page_length: "5000",
    });
    const studentsList = (studentsRes.data ?? []) as Array<{ name: string; custom_branch?: string }>;
    const branchStudentsCountMap = new Map<string, number>();
    for (const s of studentsList) {
      const b = s.custom_branch || "Smart Up";
      branchStudentsCountMap.set(b, (branchStudentsCountMap.get(b) || 0) + 1);
    }

    // Fetch exam results summary per branch for pass rate & avg score
    const examResultsRes = await frappeAdminGet("resource/Assessment Result", {
      fields: JSON.stringify(["name", "custom_branch", "total_score", "maximum_score"]),
      filters: JSON.stringify([["docstatus", "=", 1]]),
      limit_page_length: "5000",
    });
    const resultsList = (examResultsRes.data ?? []) as Array<{ name: string; custom_branch?: string; total_score: number; maximum_score: number }>;
    
    const branchExamStatsMap = new Map<string, { totalScore: number; maxScore: number; count: number; passedCount: number }>();
    for (const r of resultsList) {
      const b = r.custom_branch || "Smart Up";
      if (!branchExamStatsMap.has(b)) {
        branchExamStatsMap.set(b, { totalScore: 0, maxScore: 0, count: 0, passedCount: 0 });
      }
      const st = branchExamStatsMap.get(b)!;
      st.totalScore += Number(r.total_score || 0);
      st.maxScore += Number(r.maximum_score || 0);
      st.count += 1;
      if (r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 33) {
        st.passedCount += 1;
      }
    }

    const branchesList = Array.from(branchSummaryMap.values())
      .filter((b) => b.batchCount > 0 || (b.branch !== "Smart Up" && b.branch !== "Head Office"))
      .map((b) => {
        const est = branchExamStatsMap.get(b.branch);
        const avgScore = est && est.maxScore > 0 ? Math.round((est.totalScore / est.maxScore) * 100 * 10) / 10 : 0;
        const passRate = est && est.count > 0 ? Math.round((est.passedCount / est.count) * 100 * 10) / 10 : 0;

        return {
          branch: b.branch,
          batchCount: b.batchCount,
          studentCount: branchStudentsCountMap.get(b.branch) || 0,
          avgScore,
          passRate,
          classes: Array.from(b.programs).sort(),
        };
      })
      .sort((a, b) => b.studentCount - a.studentCount);

    return NextResponse.json({
      branches: branchesList,
    });
  }

  try {
    // 1. Fetch all active student groups (batches) for this branch
    const sgRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify(["name", "student_group_name", "program", "batch", "academic_year"]),
      filters: JSON.stringify([
        ["custom_branch", "=", branch],
        ["group_based_on", "=", "Batch"],
        ["disabled", "=", 0],
      ]),
      limit_page_length: "200",
    });

    const groups = (sgRes.data ?? []) as Array<{
      name: string;
      student_group_name?: string;
      program?: string;
      batch?: string;
      academic_year?: string;
    }>;

    // Distinct list of classes (programs) available for this branch
    const classCountMap = new Map<string, number>();
    const classBatchesMap = new Map<string, Array<{ name: string; student_group_name: string; batch_code: string }>>();

    for (const g of groups) {
      if (g.program) {
        classCountMap.set(g.program, (classCountMap.get(g.program) || 0) + 1);
        if (!classBatchesMap.has(g.program)) {
          classBatchesMap.set(g.program, []);
        }
        // Extract clean batch code like "A", "B", "C"
        // e.g. "Palluruthy-10th State-A" -> "A"
        let batchCode = "";
        const m = g.name.match(/-([A-Z0-9]{1,2})$/i);
        if (m && m[1]) {
          batchCode = m[1].toUpperCase();
        } else if (g.batch && g.batch.length <= 3) {
          batchCode = g.batch.toUpperCase();
        } else {
          const parts = g.name.split("-");
          const last = parts[parts.length - 1]?.trim();
          batchCode = last && last.length <= 3 ? last.toUpperCase() : g.student_group_name || g.name;
        }

        classBatchesMap.get(g.program)!.push({
          name: g.name,
          student_group_name: g.student_group_name || g.name,
          batch_code: batchCode,
        });
      }
    }

    const availableClasses = Array.from(classCountMap.keys()).sort((a, b) => a.localeCompare(b));

    // If only classes requested (or no program specified), return available classes
    if (!program) {
      return NextResponse.json({
        branch,
        classes: availableClasses,
        classBatchCounts: Object.fromEntries(classCountMap),
        classBatches: Object.fromEntries(classBatchesMap),
      });
    }

    const isAllClasses = program === "all";

    const requestedBatch = searchParams.get("batch") || searchParams.get("student_group");

    // 2. Filter relevant batches for this program (or all programs if program === "all")
    const allProgramBatches = isAllClasses
      ? groups
      : groups.filter((g) => g.program === program);
      
    const relevantBatches = requestedBatch
      ? allProgramBatches.filter((g) => g.name === requestedBatch || g.batch === requestedBatch || g.name.endsWith(`-${requestedBatch}`))
      : allProgramBatches;
    const batchNames = relevantBatches.map((g) => g.name);

    if (batchNames.length === 0) {
      return NextResponse.json({
        branch,
        program,
        batch: requestedBatch || null,
        classes: availableClasses,
        classBatches: Object.fromEntries(classBatchesMap),
        stats: {
          overallAvg: 0,
          totalExams: 0,
          highestScore: 0,
          trend: 0,
          bestExam: "—",
          totalStudents: 0,
        },
        timeline: [],
        batches: [],
        subjects: [],
        students: [],
      });
    }

    // 2b. Fetch full student group rosters to calculate batch strength and absent counts
    const batchStudentMap = new Map<string, Set<string>>();
    await Promise.all(
      relevantBatches.map(async (b) => {
        try {
          const detailRes = await frappeAdminGet(`resource/Student Group/${encodeURIComponent(b.name)}`);
          const detail = detailRes.data as { students?: Array<{ student: string; active?: number }> } | undefined;
          const activeStudents = (detail?.students || [])
            .filter((s) => s.active !== 0)
            .map((s) => s.student);
          batchStudentMap.set(b.name, new Set(activeStudents));
        } catch {
          batchStudentMap.set(b.name, new Set());
        }
      })
    );

    // 3. Fetch Assessment Plans for these batches
    const plansRes = await frappeAdminGet("resource/Assessment Plan", {
      fields: JSON.stringify([
        "name",
        "student_group",
        "course",
        "assessment_name",
        "assessment_group",
        "schedule_date",
        "maximum_assessment_score",
        "program",
      ]),
      filters: JSON.stringify([
        ["student_group", "in", batchNames],
        ["docstatus", "=", 1],
      ]),
      limit_page_length: "500",
    });

    const plans = (plansRes.data ?? []) as Array<{
      name: string;
      student_group: string;
      course: string;
      assessment_name?: string;
      assessment_group: string;
      schedule_date?: string;
      maximum_assessment_score?: number;
      program?: string;
    }>;

    const planNames = plans.map((p) => p.name);
    const planLookup = new Map<string, (typeof plans)[0]>();
    for (const p of plans) {
      planLookup.set(p.name, p);
    }

    // 4. Fetch Assessment Results for these plans
    let results: Array<{
      name: string;
      student: string;
      student_name?: string;
      course: string;
      assessment_plan: string;
      assessment_group: string;
      total_score: number;
      maximum_score: number;
      grade?: string;
      creation?: string;
    }> = [];

    if (planNames.length > 0) {
      // Chunk plan names if necessary
      const CHUNK_SIZE = 100;
      for (let i = 0; i < planNames.length; i += CHUNK_SIZE) {
        const chunk = planNames.slice(i, i + CHUNK_SIZE);
        const res = await frappeAdminGet("resource/Assessment Result", {
          fields: JSON.stringify([
            "name",
            "student",
            "student_name",
            "course",
            "assessment_plan",
            "assessment_group",
            "total_score",
            "maximum_score",
            "grade",
            "creation",
          ]),
          filters: JSON.stringify([
            ["assessment_plan", "in", chunk],
            ["docstatus", "=", 1],
          ]),
          limit_page_length: "5000",
        });
        results = results.concat((res.data ?? []) as typeof results);
      }
    }

    // 5. Roll up into Exam Timeline Events across the Class
    const examMap = new Map<
      string,
      {
        exam_key: string;
        exam_title: string;
        assessment_group: string;
        schedule_date: string;
        subjectMap: Map<string, { total_score: number; maximum_score: number }>;
        studentsSet: Set<string>;
        batchScoreMap: Map<
          string,
          { batch_code: string; total_score: number; maximum_score: number; students: Set<string> }
        >;
        classScoreMap: Map<
          string,
          { program: string; total_score: number; maximum_score: number; students: Set<string>; batches: Set<string> }
        >;
      }
    >();

    // 6. Roll up into Batch comparison
    const batchMap = new Map<
      string,
      {
        total_score: number;
        maximum_score: number;
        students: Set<string>;
        exams: Set<string>;
      }
    >();
    for (const b of batchNames) {
      batchMap.set(b, {
        total_score: 0,
        maximum_score: 0,
        students: new Set(),
        exams: new Set(),
      });
    }

    // 7. Roll up Subject Breakdown
    const subjectStats = new Map<
      string,
      {
        scores: number[];
        maxScores: number[];
        passCount: number;
      }
    >();

    // 8. Roll up Student Rankings
    const studentStats = new Map<
      string,
      {
        student_name: string;
        batch: string;
        total_score: number;
        maximum_score: number;
        examsSet: Set<string>;
      }
    >();

    for (const r of results) {
      const plan = planLookup.get(r.assessment_plan);
      let group = r.assessment_group || plan?.assessment_group || "Other";
      const planTitle = plan?.assessment_name || "";
      const date = plan?.schedule_date || r.creation?.split(" ")[0] || "";

      // Check if this is a Weekly Exam (either from group, plan title, or course title)
      const isWeekly =
        group.toLowerCase().includes("weekly") ||
        planTitle.toLowerCase().includes("weekly") ||
        (r.assessment_plan || "").toLowerCase().includes("weekly");

      let examTitle = group;
      let examKey = `${group}::${examTitle}`;

      if (isWeekly) {
        group = "Weekly Exam";
        // Calculate the Monday-to-Sunday week window
        // Monday = start of week, Sunday = end of week
        let weekKey = "weekly_general";
        let weekTitle = "Weekly Exam";

        if (date) {
          try {
            const dt = new Date(date + "T00:00:00");
            if (!isNaN(dt.getTime())) {
              const day = dt.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
              // Distance to Monday: if Sunday (0), distance is -6 days; otherwise 1 - day
              const diffToMonday = day === 0 ? -6 : 1 - day;
              const monday = new Date(dt);
              monday.setDate(dt.getDate() + diffToMonday);

              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);

              const monStr = monday.toISOString().split("T")[0];
              const monMonth = monday.toLocaleDateString("en-US", { month: "short" });
              const sunMonth = sunday.toLocaleDateString("en-US", { month: "short" });
              const monDay = monday.getDate();
              const sunDay = sunday.getDate();

              weekKey = `Weekly Exam::Week_${monStr}`;
              if (monMonth === sunMonth) {
                weekTitle = `Weekly Exam (${monDay}-${sunDay} ${monMonth})`;
              } else {
                weekTitle = `Weekly Exam (${monDay} ${monMonth} - ${sunDay} ${sunMonth})`;
              }
            }
          } catch {
            weekKey = `Weekly Exam::${date}`;
            weekTitle = `Weekly Exam (${date})`;
          }
        }

        examTitle = weekTitle;
        examKey = weekKey;
      } else if (planTitle && !planTitle.toLowerCase().includes((r.course || "").toLowerCase())) {
        examTitle = planTitle;
        examKey = `${group}::${examTitle}`;
      }

      // Exam timeline entry
      if (!examMap.has(examKey)) {
        examMap.set(examKey, {
          exam_key: examKey,
          exam_title: examTitle,
          assessment_group: group,
          schedule_date: date,
          subjectMap: new Map(),
          studentsSet: new Set(),
          batchScoreMap: new Map<
            string,
            { batch_code: string; total_score: number; maximum_score: number; students: Set<string> }
          >(),
          classScoreMap: new Map<
            string,
            { program: string; total_score: number; maximum_score: number; students: Set<string>; batches: Set<string> }
          >(),
        });
      }
      const examObj = examMap.get(examKey)!;
      if (date && (!examObj.schedule_date || date < examObj.schedule_date)) {
        examObj.schedule_date = date;
      }
      examObj.studentsSet.add(r.student);

      const maxScore = Number(r.maximum_score || plan?.maximum_assessment_score || 100);
      const score = Number(r.total_score || 0);

      const courseName = r.course || "General";
      const subj = examObj.subjectMap.get(courseName);
      if (subj) {
        subj.total_score += score;
        subj.maximum_score += maxScore;
      } else {
        examObj.subjectMap.set(courseName, { total_score: score, maximum_score: maxScore });
      }

      // Track batch scores per exam point
      if (plan?.student_group) {
        if (!examObj.batchScoreMap.has(plan.student_group)) {
          let bCode = "";
          const m = plan.student_group.match(/-([A-Z0-9]{1,2})$/i);
          if (m && m[1]) {
            bCode = m[1].toUpperCase();
          } else {
            const parts = plan.student_group.split("-");
            const lastPart = parts[parts.length - 1]?.trim();
            bCode = lastPart && lastPart.length <= 3 ? lastPart.toUpperCase() : plan.student_group;
          }
          examObj.batchScoreMap.set(plan.student_group, {
            batch_code: bCode,
            total_score: 0,
            maximum_score: 0,
            students: new Set(),
          });
        }
        const bs = examObj.batchScoreMap.get(plan.student_group)!;
        bs.total_score += score;
        bs.maximum_score += maxScore;
        bs.students.add(r.student);

        // Also track class scores per exam point
        const progName = plan.program || groups.find((g) => g.name === plan.student_group)?.program;
        if (progName) {
          if (!examObj.classScoreMap.has(progName)) {
            examObj.classScoreMap.set(progName, {
              program: progName,
              total_score: 0,
              maximum_score: 0,
              students: new Set(),
              batches: new Set(),
            });
          }
          const cs = examObj.classScoreMap.get(progName)!;
          cs.total_score += score;
          cs.maximum_score += maxScore;
          cs.students.add(r.student);
          cs.batches.add(plan.student_group);
        }
      }

      // Batch rollup
      if (plan?.student_group && batchMap.has(plan.student_group)) {
        const bm = batchMap.get(plan.student_group)!;
        bm.total_score += score;
        bm.maximum_score += maxScore;
        bm.students.add(r.student);
        bm.exams.add(examKey);
      }

      // Subject stats
      if (!subjectStats.has(courseName)) {
        subjectStats.set(courseName, { scores: [], maxScores: [], passCount: 0 });
      }
      const ss = subjectStats.get(courseName)!;
      ss.scores.push(score);
      ss.maxScores.push(maxScore);
      if (maxScore > 0 && (score / maxScore) * 100 >= 33) {
        ss.passCount += 1;
      }

      // Student rankings
      if (!studentStats.has(r.student)) {
        studentStats.set(r.student, {
          student_name: r.student_name || r.student,
          batch: plan?.student_group || "",
          total_score: 0,
          maximum_score: 0,
          examsSet: new Set(),
        });
      }
      const st = studentStats.get(r.student)!;
      st.total_score += score;
      st.maximum_score += maxScore;
      st.examsSet.add(examKey);
    }

    // Convert exam timeline
    const timeline: ClassExamPoint[] = Array.from(examMap.values()).map((e) => {
      let totalEarned = 0;
      let totalMax = 0;
      const subjects = Array.from(e.subjectMap.entries()).map(([cName, sData]) => {
        totalEarned += sData.total_score;
        totalMax += sData.maximum_score;
        return {
          course: cName,
          total_score: sData.total_score,
          maximum_score: sData.maximum_score,
          percentage:
            sData.maximum_score > 0
              ? Math.round((sData.total_score / sData.maximum_score) * 100 * 10) / 10
              : 0,
        };
      });

      const overallPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100 * 10) / 10 : 0;

      // Calculate total enrolled across all batches that participated in this exam
      const enrolledStudentsSet = new Set<string>();
      e.batchScoreMap.forEach((_, bName) => {
        const batchStudents = batchStudentMap.get(bName);
        if (batchStudents) {
          batchStudents.forEach((stu) => enrolledStudentsSet.add(stu));
        }
      });
      // Fallback: If no batch roster was found, enrolled is at least the students who appeared
      const examEnrolled = Math.max(enrolledStudentsSet.size, e.studentsSet.size);
      const examAppeared = e.studentsSet.size;
      const examAbsent = Math.max(0, examEnrolled - examAppeared);
      const examAbsentRate = examEnrolled > 0 ? Math.round((examAbsent / examEnrolled) * 100 * 10) / 10 : 0;
      const examTurnoutRate = examEnrolled > 0 ? Math.round((examAppeared / examEnrolled) * 100 * 10) / 10 : 0;

      const batchScoresObj: Record<
        string,
        {
          batch_code: string;
          total_score: number;
          maximum_score: number;
          percentage: number;
          students_appeared: number;
          total_enrolled: number;
          students_absent: number;
          absent_rate: number;
        }
      > = {};

      e.batchScoreMap.forEach((bData, bName) => {
        const bPct =
          bData.maximum_score > 0
            ? Math.round((bData.total_score / bData.maximum_score) * 100 * 10) / 10
            : 0;
        const bEnrolledRoster = batchStudentMap.get(bName);
        const bEnrolled = Math.max(bEnrolledRoster?.size ?? 0, bData.students.size);
        const bAppeared = bData.students.size;
        const bAbsent = Math.max(0, bEnrolled - bAppeared);
        const bAbsentRate = bEnrolled > 0 ? Math.round((bAbsent / bEnrolled) * 100 * 10) / 10 : 0;

        batchScoresObj[bName] = {
          batch_code: bData.batch_code,
          total_score: bData.total_score,
          maximum_score: bData.maximum_score,
          percentage: bPct,
          students_appeared: bAppeared,
          total_enrolled: bEnrolled,
          students_absent: bAbsent,
          absent_rate: bAbsentRate,
        };
      });

      const classScoresObj: Record<
        string,
        {
          program: string;
          total_score: number;
          maximum_score: number;
          percentage: number;
          students_appeared: number;
          total_enrolled: number;
          students_absent: number;
          absent_rate: number;
        }
      > = {};

      e.classScoreMap.forEach((cData, pName) => {
        const cPct =
          cData.maximum_score > 0
            ? Math.round((cData.total_score / cData.maximum_score) * 100 * 10) / 10
            : 0;
        const classEnrolledSet = new Set<string>();
        cData.batches.forEach((bName) => {
          const bs = batchStudentMap.get(bName);
          if (bs) bs.forEach((stu) => classEnrolledSet.add(stu));
        });
        const cEnrolled = Math.max(classEnrolledSet.size, cData.students.size);
        const cAppeared = cData.students.size;
        const cAbsent = Math.max(0, cEnrolled - cAppeared);
        const cAbsentRate = cEnrolled > 0 ? Math.round((cAbsent / cEnrolled) * 100 * 10) / 10 : 0;

        classScoresObj[pName] = {
          program: cData.program,
          total_score: cData.total_score,
          maximum_score: cData.maximum_score,
          percentage: cPct,
          students_appeared: cAppeared,
          total_enrolled: cEnrolled,
          students_absent: cAbsent,
          absent_rate: cAbsentRate,
        };
      });

      return {
        exam_key: e.exam_key,
        exam_title: e.exam_title,
        assessment_group: e.assessment_group,
        schedule_date: e.schedule_date,
        total_score: totalEarned,
        maximum_score: totalMax,
        percentage: overallPct,
        subject_count: subjects.length,
        students_appeared: examAppeared,
        total_enrolled: examEnrolled,
        students_absent: examAbsent,
        absent_rate: examAbsentRate,
        turnout_rate: examTurnoutRate,
        batch_scores: batchScoresObj,
        class_scores: classScoresObj,
        subjects,
      };
    });

    timeline.sort((a, b) => (a.schedule_date || "").localeCompare(b.schedule_date || ""));

    // Overall KPI calculations
    let totalScoreAll = 0;
    let totalMaxAll = 0;
    timeline.forEach((t) => {
      totalScoreAll += t.total_score;
      totalMaxAll += t.maximum_score;
    });

    const overallAvg = totalMaxAll > 0 ? Math.round((totalScoreAll / totalMaxAll) * 100 * 10) / 10 : 0;

    let bestExam = "—";
    let highestScore = 0;
    timeline.forEach((t) => {
      if (t.percentage > highestScore) {
        highestScore = t.percentage;
        bestExam = `${t.exam_title} (${t.percentage}%)`;
      }
    });

    let trend = 0;
    if (timeline.length >= 2) {
      const recent = timeline[timeline.length - 1].percentage;
      const prev = timeline[timeline.length - 2].percentage;
      trend = Math.round((recent - prev) * 10) / 10;
    }

    // Batch comparisons
    const batchComparisons: BatchComparison[] = relevantBatches.map((b) => {
      const bData = batchMap.get(b.name);
      const avg =
        bData && bData.maximum_score > 0
          ? Math.round((bData.total_score / bData.maximum_score) * 100 * 10) / 10
          : 0;

      return {
        student_group: b.name,
        student_group_name: b.student_group_name || b.name,
        student_count: bData ? bData.students.size : 0,
        avg_pct: avg,
        exam_count: bData ? bData.exams.size : 0,
        top_score: 0,
      };
    });

    // Subject breakdown
    const subjectBreakdown: SubjectBreakdown[] = Array.from(subjectStats.entries()).map(
      ([course, ss]) => {
        const count = ss.scores.length;
        const total = ss.scores.reduce((a, b) => a + b, 0);
        const totalMax = ss.maxScores.reduce((a, b) => a + b, 0);
        const avgPct = totalMax > 0 ? Math.round((total / totalMax) * 100 * 10) / 10 : 0;
        const passRate = count > 0 ? Math.round((ss.passCount / count) * 100 * 10) / 10 : 0;

        return {
          course,
          total_students: count,
          avg_score: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
          max_score: count > 0 ? Math.max(...ss.scores) : 0,
          maximum_possible: count > 0 ? Math.max(...ss.maxScores) : 0,
          avg_pct: avgPct,
          pass_count: ss.passCount,
          pass_rate: passRate,
        };
      },
    );

    subjectBreakdown.sort((a, b) => b.avg_pct - a.avg_pct);

    // Student rankings
    const studentRankings: ClassStudentRanking[] = Array.from(studentStats.entries()).map(
      ([student, st]) => {
        const pct =
          st.maximum_score > 0
            ? Math.round((st.total_score / st.maximum_score) * 100 * 10) / 10
            : 0;
        return {
          student,
          student_name: st.student_name,
          batch: st.batch,
          total_score: st.total_score,
          maximum_score: st.maximum_score,
          percentage: pct,
          exams_appeared: st.examsSet.size,
          grade: calculateGrade(pct),
          rank: 0,
        };
      },
    );

    studentRankings.sort((a, b) => b.percentage - a.percentage);
    studentRankings.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    const allBatchesForProgram = allProgramBatches.map((b) => {
      let code = "";
      const m = b.name.match(/-([A-Z0-9]{1,2})$/i);
      if (m && m[1]) {
        code = m[1].toUpperCase();
      } else if (b.batch && b.batch.length <= 3) {
        code = b.batch.toUpperCase();
      } else {
        const parts = b.name.split("-");
        const lastPart = parts[parts.length - 1]?.trim();
        code = lastPart && lastPart.length <= 3 ? lastPart.toUpperCase() : b.student_group_name || b.name;
      }
      return {
        name: b.name,
        student_group_name: b.student_group_name || b.name,
        batch_code: code,
      };
    });

    return NextResponse.json({
      branch,
      program,
      batch: requestedBatch || null,
      classes: availableClasses,
      classBatches: Object.fromEntries(classBatchesMap),
      allBatches: allBatchesForProgram,
      stats: {
        overallAvg,
        totalExams: timeline.length,
        highestScore,
        trend,
        bestExam,
        totalStudents: studentRankings.length,
      },
      timeline,
      batches: batchComparisons,
      subjects: subjectBreakdown,
      students: studentRankings,
    });
  } catch (error) {
    console.error("Failed to fetch class performance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch class performance" },
      { status: 500 },
    );
  }
}
