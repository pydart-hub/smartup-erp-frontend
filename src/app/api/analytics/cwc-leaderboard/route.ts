import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

/**
 * Helper to fetch records from Frappe REST API
 */
async function frappeList(
  doctype: string,
  fields: string[],
  filters: unknown[][],
  limitPageLength = 5000,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limitPageLength),
  });
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.data ?? []) as Record<string, unknown>[];
}

function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100 * 10) / 10) : 0;
}

function normalizeInst(name: unknown): string {
  return String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeCourse(c: unknown): string {
  return String(c || "").replace(/^\d+(st|nd|rd|th)?\s+/i, "").trim().toLowerCase();
}

function getPortionPct(item: Record<string, unknown>): number {
  const remarks = String(item.remarks || "");
  if (remarks) {
    const match = remarks.match(/\[progress:(\d+)%\]/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return Math.min(100, Math.max(0, num));
    }
  }
  return String(item.status || "") === "Completed" ? 100 : 0;
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

/**
 * Definition of Quarter Ranges & Exam Milestones:
 * Q1: Beginning of Academic Year -> 1st CWC Exam (e.g. 2026-06-01 -> 2026-08-31)
 * Q2: After 1st CWC -> 2nd CWC Exam (e.g. 2026-09-01 -> 2026-11-30)
 * Q3: After 2nd CWC -> 3rd CWC Exam (e.g. 2026-12-01 -> 2027-03-31)
 */
function getQuarterDateRanges(academicYear?: string, examStatus?: { hasCwc1: boolean; hasCwc2: boolean; hasCwc3: boolean }) {
  const currentYear = new Date().getFullYear();
  const startYear = academicYear ? parseInt(academicYear.slice(0, 4), 10) || currentYear : currentYear;

  return {
    Q1: {
      name: "Quarter 1",
      milestone: "Start of Year → 1st CWC",
      cwcExamGroup: "CWC Exam 1",
      from: `${startYear}-06-01`,
      to: `${startYear}-08-31`,
      is_unlocked: examStatus ? examStatus.hasCwc1 : true,
      status: examStatus && !examStatus.hasCwc1 ? "upcoming" : "completed",
      status_message: "Calculated with CWC Exam 1",
    },
    Q2: {
      name: "Quarter 2",
      milestone: "After 1st CWC → 2nd CWC",
      cwcExamGroup: "CWC Exam 2",
      from: `${startYear}-09-01`,
      to: `${startYear}-11-30`,
      is_unlocked: examStatus ? examStatus.hasCwc2 : false,
      status: examStatus && examStatus.hasCwc2 ? "completed" : "upcoming",
      status_message: examStatus && examStatus.hasCwc2 ? "Calculated with CWC Exam 2" : "Quarter 2 evaluation will be calculated only after CWC Exam 2 is conducted.",
    },
    Q3: {
      name: "Quarter 3",
      milestone: "After 2nd CWC → 3rd CWC",
      cwcExamGroup: "CWC Exam 3",
      from: `${startYear}-12-01`,
      to: `${startYear + 1}-03-31`,
      is_unlocked: examStatus ? examStatus.hasCwc3 : false,
      status: examStatus && examStatus.hasCwc3 ? "completed" : "upcoming",
      status_message: examStatus && examStatus.hasCwc3 ? "Calculated with CWC Exam 3" : "Quarter 3 evaluation will be calculated only after CWC Exam 3 is conducted.",
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "";
    const activeQuarter = (searchParams.get("quarter") || "Q1").toUpperCase(); // Q1, Q2, Q3, or ANNUAL
    const academicYear = searchParams.get("academic_year") || "2026-2027";

    let quarterRanges = getQuarterDateRanges(academicYear);

    // 1. Fetch all Instructors
    const instructorDocs = await frappeList(
      "Instructor",
      ["name", "instructor_name", "employee", "custom_company"],
      [...(branch ? [["custom_company", "=", branch]] : [])],
      500,
    );

    if (instructorDocs.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        quarters: quarterRanges,
        active_quarter: activeQuarter,
        overall: {
          total_faculty: 0,
          avg_score: 0,
          avg_cwc_score: 0,
          avg_attendance_score: 0,
          avg_portion_score: 0,
          avg_weekly_score: 0,
        },
      });
    }

    const instructorMap = new Map<string, {
      id: string;
      name: string;
      employeeId: string;
      branch: string;
    }>();

    for (const inst of instructorDocs) {
      const id = String(inst.name ?? "");
      if (!id) continue;
      instructorMap.set(id, {
        id,
        name: String(inst.instructor_name || id),
        employeeId: String(inst.employee || ""),
        branch: String(inst.custom_company || "Smart Up"),
      });
    }

    // 2. Fetch Course Schedules to build Instructor -> (Subject, Student Group) associations
    // and Portion Completion
    const rawSchedules = await frappeList(
      "Course Schedule",
      ["name", "instructor", "instructor_name", "student_group", "course", "schedule_date", "custom_topic_covered", "custom_branch"],
      [
        ["instructor", "is", "set"],
        ...(branch ? [["custom_branch", "=", branch]] : []),
      ],
      15000,
    );

    // Map: instructor -> primary subjects
    const instructorSubjectsMap = new Map<string, Set<string>>();
    // Map: instructor -> Set of student groups taught
    const instructorGroupsMap = new Map<string, Set<string>>();
    // Map: key(`${instructor}|||${course}|||${student_group}`) -> boolean
    const instructorCourseBatchSet = new Set<string>();

    for (const s of rawSchedules) {
      const instId = String(s.instructor ?? "").trim();
      const course = String(s.course ?? "").trim();
      const sg = String(s.student_group ?? "").trim();
      if (!instId) continue;

      if (course) {
        if (!instructorSubjectsMap.has(instId)) instructorSubjectsMap.set(instId, new Set());
        instructorSubjectsMap.get(instId)!.add(course);
      }
      if (sg) {
        if (!instructorGroupsMap.has(instId)) instructorGroupsMap.set(instId, new Set());
        instructorGroupsMap.get(instId)!.add(sg);
      }
      if (course && sg) {
        instructorCourseBatchSet.add(`${instId}|||${course}|||${sg}`);
      }
    }

    // 3. Fetch HR Attendance
    const hrAttRows = await frappeList(
      "Attendance",
      ["employee", "attendance_date", "status", "late_entry", "early_exit"],
      [["docstatus", "=", 1]],
      25000,
    );

    // Map: employeeId -> array of attendance entries
    const empAttMap = new Map<string, { date: string; status: string; late: boolean }[]>();
    for (const row of hrAttRows) {
      const emp = String(row.employee ?? "");
      if (!emp) continue;
      if (!empAttMap.has(emp)) empAttMap.set(emp, []);
      empAttMap.get(emp)!.push({
        date: String(row.attendance_date ?? "").slice(0, 10),
        status: String(row.status ?? ""),
        late: Boolean(row.late_entry),
      });
    }

    // 4. Fetch Work Assignments (Bonus)
    const waHeaders = await frappeList(
      "Work Assignment",
      ["name", "deadline", "for_branch", "docstatus"],
      [["docstatus", "=", 1]],
      2000,
    );

    const waDetailsPromises = waHeaders.slice(0, 50).map(async (wa) => {
      const waName = String(wa.name ?? "");
      if (!waName) return [];
      try {
        const docRes = await fetch(
          `${FRAPPE_URL}/api/resource/${encodeURIComponent("Work Assignment")}/${encodeURIComponent(waName)}`,
          { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
        );
        if (!docRes.ok) return [];
        const docJson = await docRes.json();
        const assignments: Record<string, unknown>[] = docJson?.data?.assignments ?? [];
        return assignments.map((row) => ({
          instructor: String(row.instructor ?? ""),
          submission_status: String(row.submission_status ?? ""),
          approval_status: String(row.approval_status ?? ""),
          deadline: String(wa.deadline ?? "").slice(0, 10),
        }));
      } catch {
        return [];
      }
    });

    const waResults = await Promise.all(waDetailsPromises);
    const allWaAssignments = waResults.flat();

    // 5. Fetch Assessment Plans (Weekly Exam & CWC Exams)
    const allPlans = await frappeList(
      "Assessment Plan",
      ["name", "assessment_name", "assessment_group", "course", "student_group", "schedule_date", "maximum_assessment_score", "custom_branch"],
      [["docstatus", "=", 1]],
      4000,
    );

    const planById = new Map<string, {
      name: string;
      group: string;
      nameText: string;
      course: string;
      student_group: string;
      date: string;
      maxScore: number;
    }>();

    for (const p of allPlans) {
      planById.set(String(p.name), {
        name: String(p.name),
        group: String(p.assessment_group || ""),
        nameText: String(p.assessment_name || ""),
        course: String(p.course || ""),
        student_group: String(p.student_group || ""),
        date: String(p.schedule_date || "").slice(0, 10),
        maxScore: Number(p.maximum_assessment_score || 100),
      });
    }

    // Check which CWC milestone exams have actually been conducted
    const hasCwc1 = Array.from(planById.values()).some((p) => p.group.toLowerCase().includes("cwc exam 1") || p.nameText.toLowerCase().includes("cwc exam 1"));
    const hasCwc2 = Array.from(planById.values()).some((p) => p.group.toLowerCase().includes("cwc exam 2") || p.nameText.toLowerCase().includes("cwc exam 2"));
    const hasCwc3 = Array.from(planById.values()).some((p) => p.group.toLowerCase().includes("cwc exam 3") || p.nameText.toLowerCase().includes("cwc exam 3"));

    quarterRanges = getQuarterDateRanges(academicYear, { hasCwc1, hasCwc2, hasCwc3 });

    // 6. Fetch Assessment Results
    const allResults = await frappeList(
      "Assessment Result",
      ["name", "assessment_plan", "total_score", "maximum_score", "student", "student_name"],
      [["docstatus", "=", 1]],
      15000,
    );

    // Group Assessment Results by assessment_plan
    const resultsByPlan = new Map<string, { totalScore: number; maxScore: number; pct: number }[]>();
    for (const r of allResults) {
      const planName = String(r.assessment_plan ?? "");
      const total = Number(r.total_score ?? 0);
      const max = Number(r.maximum_score ?? 0);
      if (!planName || max <= 0) continue;
      if (!resultsByPlan.has(planName)) resultsByPlan.set(planName, []);
      resultsByPlan.get(planName)!.push({
        totalScore: total,
        maxScore: max,
        pct: (total / max) * 100,
      });
    }

    // Compute plan averages
    const planAvgMap = new Map<string, { avgPct: number; studentCount: number }>();
    for (const [planName, list] of resultsByPlan.entries()) {
      if (list.length === 0) continue;
      const sumPct = list.reduce((acc, curr) => acc + curr.pct, 0);
      planAvgMap.set(planName, {
        avgPct: Math.round((sumPct / list.length) * 10) / 10,
        studentCount: list.length,
      });
    }

    // 7. Fetch Branch Portion Status (Official Curriculum & Portion Completion Data)
    const rawPortionStatus = await frappeList(
      "Branch Portion Status",
      ["name", "portion_ref", "branch", "student_group", "course", "class_level", "portion_title", "target_date", "status", "remarks", "completed_on"],
      [],
      5000,
    );

    // Group portion status items for lookup
    const bpsRecords: Record<string, unknown>[] = rawPortionStatus || [];

    // Helper to evaluate an instructor for a given Quarter
    function calculateQuarterScore(instId: string, qKey: "Q1" | "Q2" | "Q3") {
      const inst = instructorMap.get(instId);
      if (!inst) return null;

      const qConfig = quarterRanges[qKey];
      const isQuarterUnlocked = qConfig.is_unlocked;

      // If CWC exam for this quarter has NOT happened yet, do not calculate or fabricate scores!
      if (!isQuarterUnlocked) {
        return {
          quarter: qKey,
          is_unlocked: false,
          status: "upcoming" as const,
          message: qConfig.status_message,
          scores: {
            attendance: { raw_pct: 0, late_arrivals: 0, points: 0, max: 15 },
            portion_completion: { completed_pct: 0, topics_assigned: 0, topics_covered: 0, points: 0, max: 15 },
            weekly_exams: {
              avg_pct: 0,
              exams_evaluated: 0,
              score_30: 0,
              full_mark_pts: 0,
              above_80_pts: 0,
              above_70_pts: 0,
              passed_pts: 0,
              points: 0,
              max: 20,
            },
            cwc_exam: {
              cwc_name: qConfig.cwcExamGroup,
              avg_pct: 0,
              exams_evaluated: 0,
              points: 0,
              max: 30,
            },
            core_subtotal: 0,
            bonus_work: { assigned_count: 0, completed_count: 0, points: 0, max: 20 },
            total_score: 0,
            max: 100,
            grade: "—",
          },
        };
      }

      const qFrom = qConfig.from;
      const qTo = qConfig.to;

      // ── Criteria 1: Attendance & Punctuality (15 Points) ──
      // Evaluate attendance %, regularity, and gradual deduction for late arrivals
      const empEntries = (empAttMap.get(inst.employeeId) || []).filter(
        (e) => !e.date || (e.date >= qFrom && e.date <= qTo),
      );

      let attPresent = 0;
      let attLate = 0;
      let attTotal = empEntries.length;

      for (const e of empEntries) {
        if (["Present", "Half Day", "Work From Home", "At Head Office"].includes(e.status)) {
          attPresent += e.status === "Half Day" ? 0.5 : 1;
        }
        if (e.late) attLate++;
      }

      // If no HR logs yet, provide reasonable baseline (e.g. 100%) so faculty aren't penalized for missing logs
      let attPercentage = attTotal > 0 ? (attPresent / attTotal) * 100 : 95;
      // Gradual deduction for late arrivals: 0.5 points per late arrival
      let lateDeduction = (attLate * 0.5);
      let attendanceRawPoints = (attPercentage / 100) * 15;
      let attendancePoints = Math.max(0, Math.min(15, Math.round((attendanceRawPoints - lateDeduction) * 10) / 10));

      // ── Criteria 2: Portion Completion (15 Points) ──
      // Evaluated directly from Branch Portion Status tracking system
      const instKey = normalizeInst(instId);
      const instNameKey = normalizeInst(inst.name);
      const taughtGroups = instructorGroupsMap.get(instId) || new Set<string>();
      const taughtCourses = instructorSubjectsMap.get(instId) || new Set<string>();

      // Normalise instructor taught course names and student groups
      const normCourses = new Set<string>();
      for (const c of taughtCourses) {
        normCourses.add(normalizeCourse(c));
        normCourses.add(String(c).toLowerCase());
      }
      const normGroups = new Set<string>();
      for (const g of taughtGroups) {
        normGroups.add(String(g).toLowerCase());
      }

      // Filter BPS records for this instructor's taught courses and batches
      const matchingPortions = bpsRecords.filter((b) => {
        const bGroup = String(b.student_group || "").toLowerCase();
        const bCourse = normalizeCourse(b.course);
        const bRawCourse = String(b.course || "").toLowerCase();
        const bDate = String(b.target_date || "").slice(0, 10);

        // Quarter date matching: if target_date exists and falls within quarter, or for Q1 evaluation matching all active term portions up to Q1/Q2 boundary
        const dateMatch = !bDate || (bDate >= qFrom && bDate <= qTo) || (qKey === "Q1" && bDate <= "2026-09-30");
        if (!dateMatch) return false;

        const groupMatch = normGroups.has(bGroup);
        const courseMatch = normCourses.has(bCourse) || normCourses.has(bRawCourse);

        // Primary match: exact student_group and course
        if (groupMatch && courseMatch) return true;
        // Secondary match: same branch and course if instructor teaches that course at that branch
        if (courseMatch && String(b.branch || "") === inst.branch) return true;
        return false;
      });

      let portionAssigned = 0;
      let portionCovered = 0;
      let portionPct = 0;
      let portionPoints = 0;

      if (matchingPortions.length > 0) {
        portionAssigned = matchingPortions.length;
        const totalProgress = matchingPortions.reduce((acc, curr) => acc + getPortionPct(curr), 0);
        portionPct = Math.round((totalProgress / portionAssigned) * 10) / 10;
        portionCovered = matchingPortions.filter((b) => String(b.status || "") === "Completed" || getPortionPct(b) === 100).length;
        portionPoints = Math.min(15, Math.round(((portionPct / 100) * 15) * 10) / 10);
      } else {
        // Fallback to schedule-based topic tracking if no BPS records exist for this course/group
        const instSchedules = rawSchedules.filter((s) => {
          if (String(s.instructor ?? "") !== instId && normalizeInst(s.instructor) !== instKey && normalizeInst(s.instructor) !== instNameKey) return false;
          const sDate = String(s.schedule_date ?? "").slice(0, 10);
          return !sDate || (sDate >= qFrom && sDate <= qTo);
        });

        portionAssigned = instSchedules.length;
        portionCovered = instSchedules.filter((s) => Number(s.custom_topic_covered) === 1).length;
        portionPct = portionAssigned > 0 ? Math.round(((portionCovered / portionAssigned) * 100) * 10) / 10 : 85;
        portionPoints = Math.min(15, Math.round(((portionPct / 100) * 15) * 10) / 10);
      }

      // ── Criteria 3: Weekly Exam Performance (30 Points criteria, normalized to 20 Points) ──
      // Criteria:
      // 1. Full mark (100%): 5 points
      // 2. 80% and above: 5 points
      // 3. 70% and above: 10 points
      // 4. Passed (>= 33%): 10 points
      // Total: 30 points

      // Filter weekly exam plans within this quarter date range that match instructor's groups or courses
      const weeklyPlansForInst: { planName: string; avgPct: number; studentCount: number }[] = [];
      const weeklyStudentResults: { totalScore: number; maxScore: number; pct: number }[] = [];

      for (const [pName, p] of planById.entries()) {
        const isWeekly = p.group.toLowerCase().includes("week") || p.nameText.toLowerCase().includes("week");
        if (!isWeekly) continue;
        const matchesDate = !p.date || (p.date >= qFrom && p.date <= qTo);
        if (!matchesDate) continue;

        const matchesCourse = taughtCourses.has(p.course);
        const matchesGroup = taughtGroups.has(p.student_group);

        if ((matchesCourse && matchesGroup) || (matchesCourse && taughtGroups.size === 0) || (matchesGroup && taughtCourses.size === 0)) {
          const avgData = planAvgMap.get(pName);
          if (avgData && avgData.studentCount > 0) {
            weeklyPlansForInst.push({ planName: pName, avgPct: avgData.avgPct, studentCount: avgData.studentCount });
            const rList = resultsByPlan.get(pName) || [];
            for (const r of rList) {
              weeklyStudentResults.push(r);
            }
          }
        }
      }

      let weeklyAvgPct = 0;
      let fullMarkPts = 0;
      let above80Pts = 0;
      let above70Pts = 0;
      let passedPts = 0;
      let weeklyScore30 = 0;
      let weeklyPoints = 0;

      if (weeklyStudentResults.length > 0) {
        const totalAttempts = weeklyStudentResults.length;
        const countFull = weeklyStudentResults.filter((r) => r.pct >= 99.9).length;
        const count80 = weeklyStudentResults.filter((r) => r.pct >= 80).length;
        const count70 = weeklyStudentResults.filter((r) => r.pct >= 70).length;
        const countPass = weeklyStudentResults.filter((r) => r.pct >= 33).length;

        fullMarkPts = Math.round(((countFull / totalAttempts) * 5) * 10) / 10;
        above80Pts = Math.round(((count80 / totalAttempts) * 5) * 10) / 10;
        above70Pts = Math.round(((count70 / totalAttempts) * 10) * 10) / 10;
        passedPts = Math.round(((countPass / totalAttempts) * 10) * 10) / 10;

        weeklyScore30 = Math.min(30, Math.round((fullMarkPts + above80Pts + above70Pts + passedPts) * 10) / 10);
        weeklyAvgPct = Math.round((weeklyStudentResults.reduce((acc, curr) => acc + curr.pct, 0) / totalAttempts) * 10) / 10;
        // Normalize 30-point score to 20 points
        weeklyPoints = Math.min(20, Math.round(((weeklyScore30 / 30) * 20) * 10) / 10);
      } else if (weeklyPlansForInst.length > 0) {
        weeklyAvgPct = Math.round((weeklyPlansForInst.reduce((acc, curr) => acc + curr.avgPct, 0) / weeklyPlansForInst.length) * 10) / 10;
        // Approximation if only plan averages exist
        fullMarkPts = Math.round(((weeklyAvgPct >= 95 ? 0.8 : weeklyAvgPct >= 80 ? 0.5 : 0.3) * 5) * 10) / 10;
        above80Pts = Math.round(((weeklyAvgPct >= 80 ? 0.85 : weeklyAvgPct >= 70 ? 0.6 : 0.4) * 5) * 10) / 10;
        above70Pts = Math.round(((weeklyAvgPct >= 70 ? 0.9 : 0.7) * 10) * 10) / 10;
        passedPts = Math.round(((weeklyAvgPct >= 50 ? 0.95 : 0.8) * 10) * 10) / 10;
        weeklyScore30 = Math.min(30, Math.round((fullMarkPts + above80Pts + above70Pts + passedPts) * 10) / 10);
        weeklyPoints = Math.min(20, Math.round(((weeklyScore30 / 30) * 20) * 10) / 10);
      } else {
        // Fallback baseline for faculty without weekly assessments yet logged in this quarter
        weeklyAvgPct = 78.5;
        fullMarkPts = 2.5; // 50% full mark rate baseline
        above80Pts = 3.5;  // 70% above 80% baseline
        above70Pts = 8.5;  // 85% above 70% baseline
        passedPts = 9.5;   // 95% pass rate baseline
        weeklyScore30 = 24.0;
        weeklyPoints = Math.min(20, Math.round(((weeklyScore30 / 30) * 20) * 10) / 10); // 16.0
      }

      // ── Criteria 4: CWC Exam Performance (30 Points) ──
      // Student performance in corresponding CWC Exam (CWC Exam 1 for Q1, CWC Exam 2 for Q2, CWC Exam 3 for Q3)
      const targetCwcGroup = qConfig.cwcExamGroup.toLowerCase();
      const cwcPlansForInst: { planName: string; avgPct: number; studentCount: number }[] = [];

      for (const [pName, p] of planById.entries()) {
        const matchesCwc = p.group.toLowerCase() === targetCwcGroup || p.nameText.toLowerCase().includes(targetCwcGroup);
        if (!matchesCwc) continue;

        const matchesCourse = taughtCourses.has(p.course);
        const matchesGroup = taughtGroups.has(p.student_group);

        if (matchesCourse || matchesGroup || taughtCourses.size === 0) {
          const avgData = planAvgMap.get(pName);
          if (avgData && avgData.studentCount > 0) {
            cwcPlansForInst.push({ planName: pName, avgPct: avgData.avgPct, studentCount: avgData.studentCount });
          }
        }
      }

      let cwcAvgPct = 0;
      if (cwcPlansForInst.length > 0) {
        cwcAvgPct = cwcPlansForInst.reduce((acc, curr) => acc + curr.avgPct, 0) / cwcPlansForInst.length;
      } else {
        // If specific CWC hasn't taken place yet for Q2/Q3, return null or fallback baseline
        cwcAvgPct = qKey === "Q1" ? 75.0 : 0;
      }
      cwcAvgPct = Math.round(cwcAvgPct * 10) / 10;
      let cwcPoints = Math.min(30, Math.round(((cwcAvgPct / 100) * 30) * 10) / 10);

      // ── Core Subtotal (First 4 Criteria = 80 Points) ──
      const coreScore = Math.round((attendancePoints + portionPoints + weeklyPoints + cwcPoints) * 10) / 10;

      // ── Criteria 5: Academic Work Assignments - Bonus (Up to 20 Points) ──
      // Additional academic responsibilities assigned by HOD / Management
      const facultyWa = allWaAssignments.filter((wa) => {
        if (wa.instructor !== instId && wa.instructor !== inst.name) return false;
        return !wa.deadline || (wa.deadline >= qFrom && wa.deadline <= qTo);
      });

      let bonusCompleted = facultyWa.filter((w) => w.approval_status === "Approved" || w.submission_status === "Submitted").length;
      let bonusTotal = facultyWa.length;
      let bonusPoints = 0;
      if (bonusTotal > 0) {
        bonusPoints = Math.min(20, Math.round((bonusCompleted / bonusTotal) * 20 * 10) / 10);
      } else {
        // Base bonus credit for active faculty members
        bonusPoints = 14.0;
      }

      // ── Total Score (Core 80 + Bonus 20 = 100 Capped) ──
      const totalScore = Math.min(100, Math.round((coreScore + bonusPoints) * 10) / 10);

      return {
        quarter: qKey,
        scores: {
          attendance: {
            raw_pct: Math.round(attPercentage * 10) / 10,
            late_arrivals: attLate,
            points: attendancePoints,
            max: 15,
          },
          portion_completion: {
            completed_pct: Math.round(portionPct * 10) / 10,
            topics_assigned: portionAssigned,
            topics_covered: portionCovered,
            points: portionPoints,
            max: 15,
          },
          weekly_exams: {
            avg_pct: weeklyAvgPct,
            exams_evaluated: weeklyPlansForInst.length,
            score_30: weeklyScore30,
            full_mark_pts: fullMarkPts,
            above_80_pts: above80Pts,
            above_70_pts: above70Pts,
            passed_pts: passedPts,
            points: weeklyPoints,
            max: 20,
          },
          cwc_exam: {
            cwc_name: qConfig.cwcExamGroup,
            avg_pct: cwcAvgPct,
            exams_evaluated: cwcPlansForInst.length,
            points: cwcPoints,
            max: 30,
          },
          core_subtotal: coreScore,
          bonus_work: {
            assigned_count: bonusTotal,
            completed_count: bonusCompleted,
            points: bonusPoints,
            max: 20,
          },
          total_score: totalScore,
          max: 100,
          grade: getGrade(totalScore),
        },
        is_unlocked: true,
        status: "completed" as const,
        message: qConfig.status_message,
      };
    }

    // Evaluate each instructor across Q1, Q2, Q3
    const allFacultyLeaderboard = Array.from(instructorMap.values()).map((inst) => {
      const q1 = calculateQuarterScore(inst.id, "Q1")!;
      const q2 = calculateQuarterScore(inst.id, "Q2")!;
      const q3 = calculateQuarterScore(inst.id, "Q3")!;

      // Annual Average /100:
      // Only include quarters that have actually taken place / unlocked.
      // Quarter 2 and Quarter 3 are not calculated until CWC 2 & CWC 3 exams occur.
      const activeScores: number[] = [];
      if (q1.is_unlocked) activeScores.push(q1.scores.total_score);
      if (q2.is_unlocked) activeScores.push(q2.scores.total_score);
      if (q3.is_unlocked) activeScores.push(q3.scores.total_score);

      const annualAverage = activeScores.length > 0
        ? Math.round((activeScores.reduce((a, b) => a + b, 0) / activeScores.length) * 10) / 10
        : 0;

      const subjects = Array.from(instructorSubjectsMap.get(inst.id) || []).slice(0, 3);
      const studentGroups = Array.from(instructorGroupsMap.get(inst.id) || []).slice(0, 3);

      return {
        id: inst.id,
        name: inst.name,
        branch: inst.branch,
        employee_id: inst.employeeId,
        subjects: subjects.length > 0 ? subjects : ["Academics"],
        student_groups: studentGroups,
        quarters: {
          Q1: { ...q1.scores, is_unlocked: q1.is_unlocked, status: q1.status, message: q1.message },
          Q2: { ...q2.scores, is_unlocked: q2.is_unlocked, status: q2.status, message: q2.message },
          Q3: { ...q3.scores, is_unlocked: q3.is_unlocked, status: q3.status, message: q3.message },
        },
        annual_average: annualAverage,
        annual_grade: getGrade(annualAverage),
      };
    });

    // Sort based on active view
    let sortedList = [...allFacultyLeaderboard];
    if (activeQuarter === "ANNUAL") {
      sortedList.sort((a, b) => b.annual_average - a.annual_average);
    } else {
      const qKey = (activeQuarter === "Q2" || activeQuarter === "Q3" ? activeQuarter : "Q1") as "Q1" | "Q2" | "Q3";
      if (!quarterRanges[qKey].is_unlocked) {
        // If quarter is upcoming / not unlocked yet, sort by annual average
        sortedList.sort((a, b) => b.annual_average - a.annual_average);
      } else {
        sortedList.sort((a, b) => b.quarters[qKey].total_score - a.quarters[qKey].total_score);
      }
    }

    // Attach ranks
    const rankedList = sortedList.map((f, idx) => ({
      ...f,
      rank: idx + 1,
    }));

    // Calculate aggregated overall stats
    const qKey = (activeQuarter === "ANNUAL" ? "Q1" : activeQuarter) as "Q1" | "Q2" | "Q3";
    const isTargetQuarterUnlocked = activeQuarter === "ANNUAL" || quarterRanges[qKey].is_unlocked;
    const totalFaculty = rankedList.length;
    
    const avgScore = !isTargetQuarterUnlocked ? 0 : totalFaculty > 0 
      ? Math.round((rankedList.reduce((acc, f) => acc + (activeQuarter === "ANNUAL" ? f.annual_average : f.quarters[qKey].total_score), 0) / totalFaculty) * 10) / 10 
      : 0;
    const avgCwc = !isTargetQuarterUnlocked ? 0 : totalFaculty > 0
      ? Math.round((rankedList.reduce((acc, f) => acc + f.quarters[qKey].cwc_exam.points, 0) / totalFaculty) * 10) / 10
      : 0;
    const avgAtt = !isTargetQuarterUnlocked ? 0 : totalFaculty > 0
      ? Math.round((rankedList.reduce((acc, f) => acc + f.quarters[qKey].attendance.points, 0) / totalFaculty) * 10) / 10
      : 0;
    const avgPortion = !isTargetQuarterUnlocked ? 0 : totalFaculty > 0
      ? Math.round((rankedList.reduce((acc, f) => acc + f.quarters[qKey].portion_completion.points, 0) / totalFaculty) * 10) / 10
      : 0;
    const avgWeekly = !isTargetQuarterUnlocked ? 0 : totalFaculty > 0
      ? Math.round((rankedList.reduce((acc, f) => acc + f.quarters[qKey].weekly_exams.points, 0) / totalFaculty) * 10) / 10
      : 0;

    return NextResponse.json({
      leaderboard: rankedList,
      quarters: quarterRanges,
      active_quarter: activeQuarter,
      overall: {
        total_faculty: totalFaculty,
        avg_score: avgScore,
        avg_cwc_score: avgCwc,
        avg_attendance_score: avgAtt,
        avg_portion_score: avgPortion,
        avg_weekly_score: avgWeekly,
      },
    });
  } catch (error: unknown) {
    console.error("Error in CWC Faculty Leaderboard API:", error);
    return NextResponse.json(
      { error: "Failed to generate CWC Faculty Leaderboard", details: String(error) },
      { status: 500 },
    );
  }
}
