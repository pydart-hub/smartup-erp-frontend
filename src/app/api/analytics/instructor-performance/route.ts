import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/instructor-performance?branch=X
 *
 * Returns instructor performance metrics:
 * - Classes scheduled vs conducted
 * - Topic completion %
 * - Per-batch student pass rates and attendance
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const branch = request.nextUrl.searchParams.get("branch");
    if (!branch) {
      return NextResponse.json({ error: "branch param required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch all course schedules for this branch
    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([["custom_branch", "=", branch]]),
        fields: JSON.stringify([
          "name", "instructor", "instructor_name", "student_group",
          "course", "schedule_date", "custom_topic", "custom_topic_covered",
        ]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const schedules: {
      name: string; instructor: string; instructor_name: string;
      student_group: string; course: string; schedule_date: string;
      custom_topic: string; custom_topic_covered: 0 | 1;
    }[] = schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];

    if (schedules.length === 0) {
      return NextResponse.json({
        instructors: [],
        overall: { total_instructors: 0, avg_topic_completion_pct: 0, avg_classes_conducted_pct: 0 },
      });
    }

    // 2. Fetch attendance records to determine which classes were "conducted"
    // A class is "conducted" if there's at least one attendance record for that date+student_group
    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([["custom_branch", "=", branch]]),
        fields: JSON.stringify(["student_group", "date", "course_schedule"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attRecords: { student_group: string; date: string; course_schedule: string }[] =
      attRes.ok ? (await attRes.json()).data ?? [] : [];

    // Build set of conducted (student_group + date) pairs
    const conductedSet = new Set<string>();
    for (const a of attRecords) {
      conductedSet.add(`${a.student_group}|||${a.date}`);
    }

    // 3. Fetch exam results to compute student pass rates per instructor's batches
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([["custom_branch", "=", branch], ["docstatus", "=", 1]]),
        fields: JSON.stringify(["name", "student_group", "course", "examiner", "maximum_assessment_score"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: {
      name: string; student_group: string; course: string;
      examiner: string; maximum_assessment_score: number;
    }[] = plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    const planNames = plans.map((p) => p.name);
    let examResults: { student: string; assessment_plan: string; total_score: number; maximum_score: number }[] = [];
    if (planNames.length > 0) {
      const resultsRes = await fetch(
        `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
          filters: JSON.stringify([
            ["assessment_plan", "in", planNames],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify(["student", "assessment_plan", "total_score", "maximum_score"]),
          limit_page_length: "5000",
        })}`,
        { headers: { Authorization: auth }, cache: "no-store" },
      );
      examResults = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];
    }

    // 4. Group by instructor
    const instructorMap = new Map<string, {
      instructor: string;
      instructor_name: string;
      classes_scheduled: number;
      classes_conducted: number;
      topics_assigned: number;
      topics_covered: number;
      batchCourses: Map<string, { student_group: string; course: string; program: string }>;
    }>();

    for (const s of schedules) {
      if (!s.instructor) continue;
      if (!instructorMap.has(s.instructor)) {
        instructorMap.set(s.instructor, {
          instructor: s.instructor,
          instructor_name: s.instructor_name || s.instructor,
          classes_scheduled: 0,
          classes_conducted: 0,
          topics_assigned: 0,
          topics_covered: 0,
          batchCourses: new Map(),
        });
      }
      const inst = instructorMap.get(s.instructor)!;
      inst.classes_scheduled++;

      if (conductedSet.has(`${s.student_group}|||${s.schedule_date}`)) {
        inst.classes_conducted++;
      }

      if (s.custom_topic) {
        inst.topics_assigned++;
        if (s.custom_topic_covered) inst.topics_covered++;
      }

      const bcKey = `${s.student_group}|||${s.course}`;
      if (!inst.batchCourses.has(bcKey)) {
        inst.batchCourses.set(bcKey, {
          student_group: s.student_group,
          course: s.course,
          program: "",
        });
      }
    }

    // 5. Compute batch-level metrics per instructor
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    const instructorMetrics = Array.from(instructorMap.values()).map((inst) => {
      const batches = Array.from(inst.batchCourses.values()).map((bc) => {
        // Pass rate for this batch+course
        const relevantPlans = plans.filter(
          (p) => p.student_group === bc.student_group && p.course === bc.course,
        );
        const relevantPlanNames = new Set(relevantPlans.map((p) => p.name));
        const batchExamResults = examResults.filter((r) => relevantPlanNames.has(r.assessment_plan));

        let passRate = 0;
        let avgScore = 0;
        if (batchExamResults.length > 0) {
          const passed = batchExamResults.filter(
            (r) => r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 33,
          ).length;
          passRate = Math.round((passed / batchExamResults.length) * 100 * 10) / 10;
          const pcts = batchExamResults.map(
            (r) => (r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0),
          );
          avgScore = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10;
        }

        // Attendance % for this batch
        const batchAtt = attRecords.filter((a) => a.student_group === bc.student_group);
        const attPct = batchAtt.length > 0 ? 100 : 0; // simplified — presence of records means class was conducted

        return {
          student_group: bc.student_group,
          course: bc.course,
          program: bc.program,
          avg_student_score: avgScore,
          pass_rate: passRate,
          student_attendance_pct: attPct,
        };
      });

      return {
        instructor: inst.instructor,
        instructor_name: inst.instructor_name,
        classes_scheduled: inst.classes_scheduled,
        classes_conducted: inst.classes_conducted,
        topics_assigned: inst.topics_assigned,
        topics_covered: inst.topics_covered,
        topic_completion_pct: inst.topics_assigned > 0
          ? Math.round((inst.topics_covered / inst.topics_assigned) * 100 * 10) / 10
          : 0,
        batches,
      };
    });

    // Sort by classes conducted desc
    instructorMetrics.sort((a, b) => b.classes_conducted - a.classes_conducted);

    // 6. Overall
    const totalInstructors = instructorMetrics.length;
    const avgTopicPct = totalInstructors > 0
      ? Math.round(
          (instructorMetrics.reduce((s, i) => s + i.topic_completion_pct, 0) / totalInstructors) * 10,
        ) / 10
      : 0;
    const avgConductedPct = totalInstructors > 0
      ? Math.round(
          (instructorMetrics.reduce(
            (s, i) => s + (i.classes_scheduled > 0 ? (i.classes_conducted / i.classes_scheduled) * 100 : 0),
            0,
          ) / totalInstructors) * 10,
        ) / 10
      : 0;

    return NextResponse.json({
      instructors: instructorMetrics,
      overall: {
        total_instructors: totalInstructors,
        avg_topic_completion_pct: avgTopicPct,
        avg_classes_conducted_pct: avgConductedPct,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/instructor-performance] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
