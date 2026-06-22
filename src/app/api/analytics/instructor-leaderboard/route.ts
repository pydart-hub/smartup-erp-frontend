import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/instructor-leaderboard?branch=X&period=month|quarter|year|all
 *
 * Returns per-instructor leaderboard with 7 scored metrics:
 *  1. HR Attendance %          (20 pts) — Attendance doctype
 *  2. Classes Conducted %      (20 pts) — Course Schedule + Student Attendance
 *  3. Topic Coverage %         (20 pts) — Course Schedule.custom_topic_covered
 *  4. Work Assignment Completion (15 pts) — Work Assignment Detail
 *  5. Student Exam Pass Rate   (10 pts) — Assessment Result
 *  6. Student Attendance in Batches (10 pts) — Student Attendance by group
 *  7. On-Time Submission Rate  (5 pts)  — submitted_on vs deadline
 */

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

// ── Period helpers ──────────────────────────────────────────────────────────

function getPeriodRange(period: string): { from: string | null; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  if (period === "month") {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return { from, to };
  }
  if (period === "quarter") {
    const qMonth = Math.floor(today.getMonth() / 3) * 3;
    const from = new Date(today.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (period === "year") {
    // Academic year — starts June 1
    const year = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: `${year}-06-01`, to };
  }
  return { from: null, to }; // "all"
}

// ── Frappe REST helper ──────────────────────────────────────────────────────

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

// ── Score helpers ───────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100 * 10) / 10) : 0;
}

function weightedScore(raw: number, weight: number) {
  return Math.round((Math.min(raw, 100) / 100) * weight * 10) / 10;
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

function normalizeDateKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const isoPrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) return isoPrefix[1] + "-" + isoPrefix[2] + "-" + isoPrefix[3];

  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

type LeaderboardMetricKey =
  | "hr"
  | "classes"
  | "topics"
  | "work"
  | "exams"
  | "students"
  | "ontime";

type LeaderboardSignal = {
  metric: LeaderboardMetricKey;
  title: string;
  reason: string;
  earned_points: number;
  max_points: number;
  pct: number;
  lost_points?: number;
  severity?: "low" | "medium" | "high";
  raw_facts?: string[];
};

function getSeverity(lostPoints: number): "low" | "medium" | "high" {
  if (lostPoints >= 7) return "high";
  if (lostPoints >= 3) return "medium";
  return "low";
}

// ── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get("branch") ?? "";
    const period = searchParams.get("period") || "all";
    // Empty string or "all" → no branch filter (show all branches)
    const branch = branchParam === "all" ? "" : branchParam;

    const { from, to } = getPeriodRange(period);

    // ── 1. Build date filters ────────────────────────────────────────────────
    const dateFilters: (string | number | null)[][] = from
      ? [["schedule_date", ">=", from], ["schedule_date", "<=", to]]
      : [["schedule_date", "<=", to]];

    const attDateFilters: (string | number | null)[][] = from
      ? [["date", ">=", from], ["date", "<=", to]]
      : [["date", "<=", to]];

    const hrDateFilters: (string | number | null)[][] = from
      ? [["attendance_date", ">=", from], ["attendance_date", "<=", to]]
      : [["attendance_date", "<=", to]];

    const waDateFilters: (string | number | null)[][] = from
      ? [["deadline", ">=", from], ["deadline", "<=", to]]
      : [["deadline", "<=", to]];

    // ── 2. Fetch Course Schedules ────────────────────────────────────────────
    const rawSchedules = await frappeList(
      "Course Schedule",
      ["name", "instructor", "instructor_name", "student_group", "course", "schedule_date", "custom_topic", "custom_topic_covered", "custom_event_type"],
      [...(branch ? [["custom_branch", "=", branch]] : []), ...dateFilters],
    );

    const schedules = rawSchedules.filter((row) => {
      const isEvent = String(row.custom_event_type ?? "").trim().length > 0;
      const hasInstructor = String(row.instructor ?? "").trim().length > 0;
      const hasStudentGroup = String(row.student_group ?? "").trim().length > 0;
      const hasCourse = String(row.course ?? "").trim().length > 0;
      return !isEvent && hasInstructor && hasStudentGroup && hasCourse;
    });

    if (schedules.length === 0) {
      return NextResponse.json({
        instructors: [],
        overall: {
          total_instructors: 0,
          avg_score: 0,
          avg_classes_conducted_pct: 0,
          avg_topic_coverage_pct: 0,
          avg_wa_completion_pct: 0,
          from_date: from,
          to_date: to,
          period,
        },
      });
    }

    const uniqueScheduleByGroupDate = new Map<string, string | null>();
    for (const schedule of schedules) {
      const scheduleName = String(schedule.name ?? "").trim();
      const studentGroup = String(schedule.student_group ?? "").trim();
      const scheduleDate = normalizeDateKey(schedule.schedule_date);
      if (!scheduleName || !studentGroup || !scheduleDate) continue;
      const key = `${studentGroup}|||${scheduleDate}`;
      if (!uniqueScheduleByGroupDate.has(key)) {
        uniqueScheduleByGroupDate.set(key, scheduleName);
      } else if (uniqueScheduleByGroupDate.get(key) !== scheduleName) {
        uniqueScheduleByGroupDate.set(key, null);
      }
    }

    // ── 3. Fetch Student Attendance ──────────────────────────────────────────
    const studentAtt = await frappeList(
      "Student Attendance",
      ["name", "student_group", "date", "status", "docstatus", "course_schedule"],
      [],
      20000,
    );

    const conductedScheduleSet = new Set<string>();
    const scheduleStudentAtt = new Map<string, { present: number; total: number }>();

    for (const a of studentAtt) {
      if (Number(a.docstatus ?? 0) === 2) continue;
      const studentGroup = String(a.student_group ?? "").trim();
      const attDate = normalizeDateKey(a.date);
      const directScheduleName = String(a.course_schedule ?? "").trim();
      const inferredScheduleName =
        !directScheduleName && studentGroup && attDate
          ? uniqueScheduleByGroupDate.get(`${studentGroup}|||${attDate}`) ?? ""
          : "";
      const scheduleName = directScheduleName || inferredScheduleName;
      const isPresentLike = a.status === "Present" || a.status === "Late";

      if (!scheduleName) continue;
      conductedScheduleSet.add(scheduleName);
      if (!scheduleStudentAtt.has(scheduleName)) scheduleStudentAtt.set(scheduleName, { present: 0, total: 0 });
      const rec = scheduleStudentAtt.get(scheduleName)!;
      rec.total++;
      if (isPresentLike) rec.present++;
    }

    // ── 4. Fetch HR Attendance ───────────────────────────────────────────────
    const hrAtt = await frappeList(
      "Attendance",
      ["employee", "attendance_date", "status", "late_entry", "early_exit"],
      [...(branch ? [["company", "=", branch]] : []), ["docstatus", "=", 1], ...hrDateFilters],
    );

    // ── 5. Fetch Instructors to get employee links ───────────────────────────
    const instructorDocs = await frappeList(
      "Instructor",
      ["name", "instructor_name", "employee", "custom_company"],
      [...(branch ? [["custom_company", "=", branch]] : [])],
    );
    // Map instructor_id → employee_id
    const instructorEmployeeMap = new Map<string, string>();
    for (const i of instructorDocs) {
      if (i.name && i.employee) instructorEmployeeMap.set(String(i.name), String(i.employee));
    }

    // ── 6. Build HR attendance map: employee → { present, total, late, earlyExit } ─
    const hrAttMap = new Map<string, { present: number; total: number; late: number; earlyExit: number }>();
    for (const a of hrAtt) {
      const emp = String(a.employee ?? "");
      if (!emp) continue;
      if (!hrAttMap.has(emp)) hrAttMap.set(emp, { present: 0, total: 0, late: 0, earlyExit: 0 });
      const rec = hrAttMap.get(emp)!;
      rec.total++;
      if (a.status === "Present" || a.status === "Half Day" || a.status === "Work From Home") rec.present++;
      if (a.late_entry) rec.late++;
      if (a.early_exit) rec.earlyExit++;
    }

    // ── 7. Fetch Work Assignments for this branch ────────────────────────────
    // NOTE: "Work Assignment Detail" (child doctype) cannot be queried directly
    // via Frappe REST list API — it throws PermissionError. Instead, fetch each
    // Work Assignment parent document and read its `assignments` child array.

    // Step 1: Fetch WA headers (list query works fine for the parent doctype)
    const waHeaders = await frappeList(
      "Work Assignment",
      ["name", "deadline", "for_branch", "docstatus"],
      [...(branch ? [["for_branch", "=", branch]] : []), ["docstatus", "=", 1], ...waDateFilters],
    );

    // Step 2: For each WA, fetch the full document to get the child table rows
    type WaDetailRow = {
      instructor: string;
      submission_status: string;
      approval_status: string;
      submitted_on: string;
      deadline: string; // from parent doc
    };
    const allWaDetails: WaDetailRow[] = [];
    for (const wa of waHeaders) {
      const waName = String(wa.name ?? "");
      const waDeadline = String(wa.deadline ?? "");
      if (!waName) continue;
      try {
        const docRes = await fetch(
          `${FRAPPE_URL}/api/resource/${encodeURIComponent("Work Assignment")}/${encodeURIComponent(waName)}`,
          { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
        );
        if (!docRes.ok) continue;
        const docJson = await docRes.json();
        const assignments: Record<string, unknown>[] = docJson?.data?.assignments ?? [];
        for (const row of assignments) {
          allWaDetails.push({
            instructor: String(row.instructor ?? ""),
            submission_status: String(row.submission_status ?? ""),
            approval_status: String(row.approval_status ?? ""),
            submitted_on: String(row.submitted_on ?? ""),
            deadline: waDeadline,
          });
        }
      } catch {
        // skip if fetch fails for this WA
      }
    }

    // Map instructor → { total, approved, onTime, rejected }
    const waMap = new Map<string, { total: number; approved: number; onTime: number; rejected: number }>();
    for (const d of allWaDetails) {
      const instructor = d.instructor;
      if (!instructor) continue;
      if (!waMap.has(instructor)) waMap.set(instructor, { total: 0, approved: 0, onTime: 0, rejected: 0 });
      const rec = waMap.get(instructor)!;
      rec.total++;
      if (d.approval_status === "Approved") rec.approved++;
      if (d.approval_status === "Rejected") rec.rejected++;
      if (d.submission_status === "Submitted" && d.submitted_on && d.submitted_on !== "undefined") {
        const submittedDate = d.submitted_on.slice(0, 10);
        if (d.deadline && submittedDate <= d.deadline) rec.onTime++;
      }
    }

    // ── 8. Fetch Assessment Plans + Results for this branch ──────────────────
    const assessmentPlans = await frappeList(
      "Assessment Plan",
      ["name", "student_group", "course", "schedule_date"],
      [...(branch ? [["custom_branch", "=", branch]] : []), ["docstatus", "=", 1], ...dateFilters],
    );

    let examResults: { assessment_plan: string; total_score: number; maximum_score: number }[] = [];
    if (assessmentPlans.length > 0) {
      const planNames = assessmentPlans.map((p) => String(p.name));
      // Frappe "in" filter accepts a JSON array string for the value
      const rawResults = await frappeList(
        "Assessment Result",
        ["assessment_plan", "total_score", "maximum_score"],
        [["assessment_plan", "in", planNames], ["docstatus", "=", 1]],
        10000,
      );
      examResults = rawResults as typeof examResults;
    }

    const planMetrics = new Map<string, { passRate: number }>();
    for (const plan of assessmentPlans) {
      const planName = String(plan.name ?? "");
      const planResults = examResults.filter((r) => r.assessment_plan === planName);
      if (planResults.length === 0) continue;
      const passed = planResults.filter(
        (r) => r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 33,
      ).length;
      const passRate = Math.round((passed / planResults.length) * 100);
      planMetrics.set(planName, { passRate });
    }

    const planMetaMap = new Map(
      assessmentPlans.map((plan) => [
        String(plan.name ?? ""),
        {
          student_group: String(plan.student_group ?? ""),
          course: String(plan.course ?? ""),
        },
      ]),
    );

    // ── 9. Aggregate per instructor ──────────────────────────────────────────
    type InstructorAccum = {
      instructor: string;
      instructor_name: string;
      classes_scheduled: number;
      classes_conducted: number;
      topics_assigned: number;
      topics_covered: number;
      schedule_names: Set<string>;
      batch_course_keys: Set<string>;
    };

    const instMap = new Map<string, InstructorAccum>();

    for (const s of schedules) {
      const instId = String(s.instructor ?? "");
      if (!instId) continue;
      if (!instMap.has(instId)) {
        instMap.set(instId, {
          instructor: instId,
          instructor_name: String(s.instructor_name ?? instId),
          classes_scheduled: 0,
          classes_conducted: 0,
          topics_assigned: 0,
          topics_covered: 0,
          schedule_names: new Set(),
          batch_course_keys: new Set(),
        });
      }
      const acc = instMap.get(instId)!;
      acc.classes_scheduled++;
      const scheduleName = String(s.name ?? "");
      if (scheduleName) acc.schedule_names.add(scheduleName);
      const sg = String(s.student_group ?? "");
      const course = String(s.course ?? "");
      if (scheduleName && conductedScheduleSet.has(scheduleName)) {
        acc.classes_conducted++;
      }
      if (sg && course) acc.batch_course_keys.add(`${sg}|||${course}`);
      if (s.custom_topic) {
        acc.topics_assigned++;
        if (s.custom_topic_covered) acc.topics_covered++;
      }
    }

    // ── 10. Build leaderboard entries ────────────────────────────────────────
    const entries = Array.from(instMap.values()).map((acc) => {
      // Metric 2: Classes Conducted %
      const classesConductedPct = pct(acc.classes_conducted, acc.classes_scheduled);

      // Metric 3: Topic Coverage %
      const topicCoveragePct = pct(acc.topics_covered, acc.topics_assigned);

      // HR Attendance
      const employee = instructorEmployeeMap.get(acc.instructor);
      const hr = employee ? hrAttMap.get(employee) : null;
      const hrPresentDays = hr?.present ?? 0;
      const hrTotalDays = hr?.total ?? 0;
      const hrAttendancePct = pct(hrPresentDays, hrTotalDays);
      const lateEntries = hr?.late ?? 0;
      const earlyExits = hr?.earlyExit ?? 0;

      // Work Assignments
      const wa = waMap.get(acc.instructor);
      const waTotal = wa?.total ?? 0;
      const waApproved = wa?.approved ?? 0;
      const waRejected = wa?.rejected ?? 0;
      const waOnTime = wa?.onTime ?? 0;
      const waCompletionPct = pct(waApproved, waTotal);
      const waOnTimePct = pct(waOnTime, waTotal);

      // Student pass rate (avg across instructor's batch+course scope)
      const batchCourseKeys = Array.from(acc.batch_course_keys);
      let avgPassRate = 0;
      let passRateCount = 0;
      for (const [planName, meta] of planMetaMap.entries()) {
        const key = `${meta.student_group}|||${meta.course}`;
        if (!batchCourseKeys.includes(key)) continue;
        const planMetric = planMetrics.get(planName);
        if (!planMetric) continue;
        avgPassRate += planMetric.passRate;
        passRateCount++;
      }
      const studentPassRate = passRateCount > 0 ? Math.round(avgPassRate / passRateCount) : 0;

      // Student attendance only for the instructor's own schedules
      let totalStudentPresent = 0;
      let totalStudentSessions = 0;
      for (const scheduleName of acc.schedule_names) {
        const scheduleAtt = scheduleStudentAtt.get(scheduleName);
        if (scheduleAtt) {
          totalStudentPresent += scheduleAtt.present;
          totalStudentSessions += scheduleAtt.total;
        }
      }
      const studentAttendancePct = pct(totalStudentPresent, totalStudentSessions);

      // ── Scores ──────────────────────────────────────────────────────────
      const score1_hr        = weightedScore(hrAttendancePct, 20);
      const score2_classes   = weightedScore(classesConductedPct, 20);
      const score3_topics    = weightedScore(topicCoveragePct, 20);
      const score4_wa        = weightedScore(waCompletionPct, 15);
      const score5_exams     = weightedScore(studentPassRate, 10);
      const score6_students  = weightedScore(studentAttendancePct, 10);
      const score7_ontime    = weightedScore(waOnTimePct, 5);

      const totalScore = Math.round(
        (score1_hr + score2_classes + score3_topics + score4_wa + score5_exams + score6_students + score7_ontime) * 10,
      ) / 10;

      const strengths: LeaderboardSignal[] = [];
      const weaknesses: LeaderboardSignal[] = [];

      function pushStrength(signal: LeaderboardSignal) {
        strengths.push(signal);
      }

      function pushWeakness(signal: LeaderboardSignal) {
        const lostPoints = Math.round((signal.max_points - signal.earned_points) * 10) / 10;
        if (lostPoints <= 0) return;
        weaknesses.push({
          ...signal,
          lost_points: lostPoints,
          severity: getSeverity(lostPoints),
          raw_facts: signal.raw_facts ?? [],
        });
      }

      if (hrTotalDays > 0) {
        if (hrAttendancePct < 100 || lateEntries > 0 || earlyExits > 0) {
          const hrFacts = [`${hrPresentDays}/${hrTotalDays} attendance days marked present`];
          if (lateEntries > 0) hrFacts.push(`${lateEntries} late entr${lateEntries === 1 ? "y" : "ies"}`);
          if (earlyExits > 0) hrFacts.push(`${earlyExits} early exit${earlyExits === 1 ? "" : "s"}`);
          pushWeakness({
            metric: "hr",
            title: "HR Attendance",
            reason:
              lateEntries > 0 || earlyExits > 0
                ? "Attendance consistency, late entries, or early exits reduced HR points."
                : "Missed attendance days reduced HR attendance points.",
            earned_points: score1_hr,
            max_points: 20,
            pct: hrAttendancePct,
            raw_facts: hrFacts,
          });
        } else {
          pushStrength({
            metric: "hr",
            title: "HR Attendance",
            reason: "Maintained full HR attendance without point loss.",
            earned_points: score1_hr,
            max_points: 20,
            pct: hrAttendancePct,
          });
        }
      }

      if (acc.classes_scheduled > 0) {
        if (classesConductedPct < 100) {
          pushWeakness({
            metric: "classes",
            title: "Classes Conducted",
            reason: "Not all scheduled classes were conducted or marked through attendance.",
            earned_points: score2_classes,
            max_points: 20,
            pct: classesConductedPct,
            raw_facts: [`${acc.classes_conducted}/${acc.classes_scheduled} scheduled classes counted as conducted`],
          });
        } else {
          pushStrength({
            metric: "classes",
            title: "Classes Conducted",
            reason: "All scheduled classes were conducted or properly marked.",
            earned_points: score2_classes,
            max_points: 20,
            pct: classesConductedPct,
          });
        }
      }

      if (acc.topics_assigned > 0) {
        if (topicCoveragePct < 100) {
          pushWeakness({
            metric: "topics",
            title: "Topic Coverage",
            reason: "Assigned topics were not fully covered, which reduced topic coverage points.",
            earned_points: score3_topics,
            max_points: 20,
            pct: topicCoveragePct,
            raw_facts: [`${acc.topics_covered}/${acc.topics_assigned} assigned topics marked covered`],
          });
        } else {
          pushStrength({
            metric: "topics",
            title: "Topic Coverage",
            reason: "Covered all assigned topics without losing points.",
            earned_points: score3_topics,
            max_points: 20,
            pct: topicCoveragePct,
          });
        }
      }

      if (waTotal > 0) {
        if (waCompletionPct < 100 || waRejected > 0) {
          const workFacts = [`${waApproved}/${waTotal} work assignments approved`];
          if (waRejected > 0) workFacts.push(`${waRejected} rejected submission${waRejected === 1 ? "" : "s"}`);
          pushWeakness({
            metric: "work",
            title: "Work Assignments",
            reason:
              waRejected > 0
                ? "Rejected or unapproved work assignments reduced work score."
                : "Work assignment completion was below full approval.",
            earned_points: score4_wa,
            max_points: 15,
            pct: waCompletionPct,
            raw_facts: workFacts,
          });
        } else {
          pushStrength({
            metric: "work",
            title: "Work Assignments",
            reason: "All tracked work assignments were approved.",
            earned_points: score4_wa,
            max_points: 15,
            pct: waCompletionPct,
          });
        }

        if (waOnTimePct < 100) {
          pushWeakness({
            metric: "ontime",
            title: "On-Time Submission",
            reason: "Late work submissions reduced the on-time submission score.",
            earned_points: score7_ontime,
            max_points: 5,
            pct: waOnTimePct,
            raw_facts: [`${waOnTime}/${waTotal} submitted work items were on time`],
          });
        } else {
          pushStrength({
            metric: "ontime",
            title: "On-Time Submission",
            reason: "All tracked work submissions were on time.",
            earned_points: score7_ontime,
            max_points: 5,
            pct: waOnTimePct,
          });
        }
      }

      if (passRateCount > 0) {
        if (studentPassRate < 100) {
          pushWeakness({
            metric: "exams",
            title: "Student Exam Results",
            reason: "Student pass rate in the instructor's batches reduced exam score.",
            earned_points: score5_exams,
            max_points: 10,
            pct: studentPassRate,
            raw_facts: [`Average batch pass rate: ${studentPassRate}%`],
          });
        } else {
          pushStrength({
            metric: "exams",
            title: "Student Exam Results",
            reason: "Student pass rate stayed strong enough to avoid point loss.",
            earned_points: score5_exams,
            max_points: 10,
            pct: studentPassRate,
          });
        }
      }

      if (totalStudentSessions > 0) {
        if (studentAttendancePct < 100) {
          pushWeakness({
            metric: "students",
            title: "Student Attendance",
            reason: "Lower student attendance in the instructor's batches reduced this score.",
            earned_points: score6_students,
            max_points: 10,
            pct: studentAttendancePct,
            raw_facts: [`${totalStudentPresent}/${totalStudentSessions} student attendance records were present or late`],
          });
        } else {
          pushStrength({
            metric: "students",
            title: "Student Attendance",
            reason: "Student attendance stayed high across the instructor's batches.",
            earned_points: score6_students,
            max_points: 10,
            pct: studentAttendancePct,
          });
        }
      }

      strengths.sort((a, b) => b.earned_points - a.earned_points || b.pct - a.pct);
      weaknesses.sort((a, b) => {
        const lostDiff = (b.lost_points ?? 0) - (a.lost_points ?? 0);
        if (lostDiff !== 0) return lostDiff;
        return a.pct - b.pct;
      });

      const topWeakness = weaknesses[0] ?? null;
      const totalLostPoints = Math.round((100 - totalScore) * 10) / 10;

      // ── Badges ──────────────────────────────────────────────────────────
      const badges: string[] = [];
      if (waTotal > 0 && waOnTimePct === 100) badges.push("always_on_time");
      if (waTotal > 0 && waRejected === 0 && waApproved > 0) badges.push("zero_rejections");
      if (lateEntries === 0 && hrTotalDays > 0) badges.push("punctual");
      if (acc.topics_assigned > 0 && topicCoveragePct === 100) badges.push("full_syllabus");
      if (waTotal > 0 && waRejected > 0) badges.push("had_rejections");
      if (waTotal > 0 && waOnTimePct < 50) badges.push("late_submissions");

      return {
        instructor: acc.instructor,
        instructor_name: acc.instructor_name,
        employee: employee ?? null,
        // Raw metric values
        hr_present_days: hrPresentDays,
        hr_total_days: hrTotalDays,
        hr_attendance_pct: hrAttendancePct,
        late_entries: lateEntries,
        early_exits: earlyExits,
        classes_scheduled: acc.classes_scheduled,
        classes_conducted: acc.classes_conducted,
        classes_conducted_pct: classesConductedPct,
        topics_assigned: acc.topics_assigned,
        topics_covered: acc.topics_covered,
        topic_coverage_pct: topicCoveragePct,
        wa_total: waTotal,
        wa_approved: waApproved,
        wa_rejected: waRejected,
        wa_completion_pct: waCompletionPct,
        wa_on_time: waOnTime,
        wa_on_time_pct: waOnTimePct,
        student_pass_rate: studentPassRate,
        student_attendance_pct: studentAttendancePct,
        // Score breakdown
        score_hr: score1_hr,
        score_classes: score2_classes,
        score_topics: score3_topics,
        score_wa: score4_wa,
        score_exams: score5_exams,
        score_students: score6_students,
        score_ontime: score7_ontime,
        total_score: totalScore,
        grade: getGrade(totalScore),
        badges,
        strengths,
        weaknesses,
        loss_summary: {
          total_lost_points: totalLostPoints,
          biggest_loss_metric: topWeakness?.title ?? null,
          biggest_loss_points: topWeakness?.lost_points ?? 0,
        },
      };
    });

    // ── 11. Sort by total score descending ───────────────────────────────────
    entries.sort((a, b) => b.total_score - a.total_score);

    const totalInstructors = entries.length;
    const avg = (key: keyof typeof entries[0]) =>
      totalInstructors > 0
        ? Math.round((entries.reduce((s, e) => s + (Number(e[key]) || 0), 0) / totalInstructors) * 10) / 10
        : 0;

    return NextResponse.json({
      instructors: entries,
      overall: {
        total_instructors: totalInstructors,
        avg_score: avg("total_score"),
        avg_classes_conducted_pct: avg("classes_conducted_pct"),
        avg_topic_coverage_pct: avg("topic_coverage_pct"),
        avg_wa_completion_pct: avg("wa_completion_pct"),
        avg_hr_attendance_pct: avg("hr_attendance_pct"),
        avg_student_pass_rate: avg("student_pass_rate"),
        avg_student_attendance_pct: avg("student_attendance_pct"),
        from_date: from,
        to_date: to,
        period,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/instructor-leaderboard]", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
