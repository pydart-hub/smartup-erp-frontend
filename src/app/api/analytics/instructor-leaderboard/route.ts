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
      : [];

    const attDateFilters: (string | number | null)[][] = from
      ? [["date", ">=", from], ["date", "<=", to]]
      : [];

    const hrDateFilters: (string | number | null)[][] = from
      ? [["attendance_date", ">=", from], ["attendance_date", "<=", to]]
      : [];

    // ── 2. Fetch Course Schedules ────────────────────────────────────────────
    const schedules = await frappeList(
      "Course Schedule",
      ["name", "instructor", "instructor_name", "student_group", "course", "schedule_date", "custom_topic", "custom_topic_covered"],
      [...(branch ? [["custom_branch", "=", branch]] : []), ...dateFilters],
    );

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

    // ── 3. Fetch Student Attendance ──────────────────────────────────────────
    const studentAtt = await frappeList(
      "Student Attendance",
      ["student_group", "date", "status", "docstatus"],
      [...(branch ? [["custom_branch", "=", branch]] : []), ["docstatus", "=", 1], ...attDateFilters],
    );

    // Set of conducted class keys: student_group|||date
    const conductedSet = new Set<string>();
    // Map of student_group → { present, total } for student attendance % per batch
    const batchStudentAtt = new Map<string, { present: number; total: number }>();

    for (const a of studentAtt) {
      const sg = String(a.student_group ?? "");
      const dt = String(a.date ?? "");
      if (sg && dt) conductedSet.add(`${sg}|||${dt}`);
      if (!batchStudentAtt.has(sg)) batchStudentAtt.set(sg, { present: 0, total: 0 });
      const rec = batchStudentAtt.get(sg)!;
      rec.total++;
      if (a.status === "Present" || a.status === "Late") rec.present++;
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
      [...(branch ? [["for_branch", "=", branch]] : []), ["docstatus", "!=", 2]],
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
      ["name", "student_group", "course"],
      [...(branch ? [["custom_branch", "=", branch]] : []), ["docstatus", "=", 1]],
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

    // Map student_group → pass rate
    const batchPassRate = new Map<string, number>();
    for (const plan of assessmentPlans) {
      const sg = String(plan.student_group ?? "");
      const planName = String(plan.name ?? "");
      const planResults = examResults.filter((r) => r.assessment_plan === planName);
      if (planResults.length === 0) continue;
      const passed = planResults.filter(
        (r) => r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 33,
      ).length;
      const passRate = Math.round((passed / planResults.length) * 100);
      // Average with existing if multiple plans per group
      const existing = batchPassRate.get(sg);
      batchPassRate.set(sg, existing !== undefined ? Math.round((existing! + passRate) / 2) : passRate);
    }

    // ── 9. Aggregate per instructor ──────────────────────────────────────────
    type InstructorAccum = {
      instructor: string;
      instructor_name: string;
      classes_scheduled: number;
      classes_conducted: number;
      topics_assigned: number;
      topics_covered: number;
      student_groups: Set<string>;
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
          student_groups: new Set(),
        });
      }
      const acc = instMap.get(instId)!;
      acc.classes_scheduled++;
      const sg = String(s.student_group ?? "");
      const dt = String(s.schedule_date ?? "");
      if (conductedSet.has(`${sg}|||${dt}`)) acc.classes_conducted++;
      if (sg) acc.student_groups.add(sg);
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

      // Student pass rate (avg across instructor's batches)
      const groups = Array.from(acc.student_groups);
      let avgPassRate = 0;
      let passRateCount = 0;
      for (const sg of groups) {
        const pr = batchPassRate.get(sg);
        if (pr !== undefined) { avgPassRate += pr; passRateCount++; }
      }
      const studentPassRate = passRateCount > 0 ? Math.round(avgPassRate / passRateCount) : 0;

      // Student attendance in batches (avg across instructor's batches)
      let totalStudentPresent = 0;
      let totalStudentSessions = 0;
      for (const sg of groups) {
        const bAtt = batchStudentAtt.get(sg);
        if (bAtt) { totalStudentPresent += bAtt.present; totalStudentSessions += bAtt.total; }
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
