import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/branch-academics
 *
 * Director-level overview: academic health per branch.
 * Aggregates attendance %, exam scores, pass rates, topic coverage across all branches.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch all companies (branches)
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

    // 2. Fetch aggregate data per branch in parallel
    const branchResults = await Promise.all(
      companies.map(async (company) => {
        // Batches
        const batchesRes = await fetch(
          `${FRAPPE_URL}/api/method/frappe.client.get_count`,
          {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
              doctype: "Student Group",
              filters: { custom_branch: company.name, group_based_on: "Batch", disabled: 0 },
            }),
            cache: "no-store",
          },
        );
        const totalBatches = batchesRes.ok ? (await batchesRes.json()).message ?? 0 : 0;

        // Students (active in this branch)
        const studentsRes = await fetch(
          `${FRAPPE_URL}/api/method/frappe.client.get_count`,
          {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
              doctype: "Student",
              filters: { custom_branch: company.name, enabled: 1 },
            }),
            cache: "no-store",
          },
        );
        const totalStudents = studentsRes.ok ? (await studentsRes.json()).message ?? 0 : 0;

        // Attendance: last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
        const toDate = new Date().toISOString().split("T")[0];

        const attRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
            filters: JSON.stringify([
              ["custom_branch", "=", company.name],
              ["date", ">=", fromDate],
              ["date", "<=", toDate],
            ]),
            fields: JSON.stringify(["status"]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const attRecords: { status: string }[] =
          attRes.ok ? (await attRes.json()).data ?? [] : [];

        const totalAtt = attRecords.length;
        const presentCount = attRecords.filter((r) => r.status === "Present" || r.status === "Late").length;
        const avgAttPct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100 * 10) / 10 : 0;

        // Chronic absentees
        const attByStudent = new Map<string, { present: number; total: number }>();
        // Need student-level data for chronic count
        const attDetailRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
            filters: JSON.stringify([
              ["custom_branch", "=", company.name],
              ["date", ">=", fromDate],
              ["date", "<=", toDate],
            ]),
            fields: JSON.stringify(["student", "status", "student_group", "date"]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const attDetail: { student: string; status: string; student_group: string; date: string }[] =
          attDetailRes.ok ? (await attDetailRes.json()).data ?? [] : [];

        for (const r of attDetail) {
          if (!attByStudent.has(r.student)) attByStudent.set(r.student, { present: 0, total: 0 });
          const s = attByStudent.get(r.student)!;
          s.total++;
          if (r.status === "Present" || r.status === "Late") s.present++;
        }
        const chronicCount = Array.from(attByStudent.values()).filter(
          (s) => s.total >= 3 && (s.present / s.total) * 100 < 75,
        ).length;

        // Build conducted set for instructor metrics
        const conductedSet = new Set<string>();
        for (const r of attDetail) {
          if (r.student_group && r.date) conductedSet.add(`${r.student_group}|||${r.date}`);
        }

        // Exams
        const examsRes = await fetch(
          `${FRAPPE_URL}/api/method/frappe.client.get_count`,
          {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
              doctype: "Assessment Plan",
              filters: { custom_branch: company.name, docstatus: 1 },
            }),
            cache: "no-store",
          },
        );
        const totalExams = examsRes.ok ? (await examsRes.json()).message ?? 0 : 0;

        // Exam scores (all results for this branch)
        const examResultsRes = await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
            filters: JSON.stringify([
              ["custom_branch", "=", company.name],
              ["docstatus", "=", 1],
            ]),
            fields: JSON.stringify(["total_score", "maximum_score"]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const examResultsList: { total_score: number; maximum_score: number }[] =
          examResultsRes.ok ? (await examResultsRes.json()).data ?? [] : [];

        let avgExamPct = 0;
        let passRate = 0;
        if (examResultsList.length > 0) {
          const pcts = examResultsList.map((r) =>
            r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0,
          );
          avgExamPct = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10;
          const passed = pcts.filter((p) => p >= 33).length;
          passRate = Math.round((passed / pcts.length) * 100 * 10) / 10;
        }

        // Fetch ALL course schedules (topic coverage + instructor metrics)
        const courseSchedulesRes = await fetch(
          `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
            filters: JSON.stringify([["custom_branch", "=", company.name]]),
            fields: JSON.stringify([
              "instructor", "instructor_name", "student_group",
              "schedule_date", "custom_topic", "custom_topic_covered",
            ]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const courseSchedules: {
          instructor: string; instructor_name: string; student_group: string;
          schedule_date: string; custom_topic: string; custom_topic_covered: 0 | 1;
        }[] = courseSchedulesRes.ok ? (await courseSchedulesRes.json()).data ?? [] : [];

        // Topic coverage (only schedules with topics assigned)
        const topicSchedules = courseSchedules.filter((s) => s.custom_topic);
        const topicTotal = topicSchedules.length;
        const topicCovered = topicSchedules.filter((t) => t.custom_topic_covered).length;
        const topicPct = topicTotal > 0
          ? Math.round((topicCovered / topicTotal) * 100 * 10) / 10
          : 0;

        // Instructor metrics
        const instructorMap = new Map<string, {
          name: string; scheduled: number; conducted: number;
          topicsAssigned: number; topicsCovered: number;
        }>();
        for (const s of courseSchedules) {
          if (!s.instructor) continue;
          if (!instructorMap.has(s.instructor)) {
            instructorMap.set(s.instructor, {
              name: s.instructor_name || s.instructor,
              scheduled: 0, conducted: 0, topicsAssigned: 0, topicsCovered: 0,
            });
          }
          const inst = instructorMap.get(s.instructor)!;
          inst.scheduled++;
          if (conductedSet.has(`${s.student_group}|||${s.schedule_date}`)) {
            inst.conducted++;
          }
          if (s.custom_topic) {
            inst.topicsAssigned++;
            if (s.custom_topic_covered) inst.topicsCovered++;
          }
        }
        const instructorArr = Array.from(instructorMap.values());
        const branchInstructors = instructorArr.length;
        const avgClassesConductedPct = branchInstructors > 0
          ? Math.round(
              (instructorArr.reduce(
                (s, i) => s + (i.scheduled > 0 ? (i.conducted / i.scheduled) * 100 : 0), 0,
              ) / branchInstructors) * 10,
            ) / 10
          : 0;
        const avgInstructorTopicPct = branchInstructors > 0
          ? Math.round(
              (instructorArr.reduce(
                (s, i) => s + (i.topicsAssigned > 0 ? (i.topicsCovered / i.topicsAssigned) * 100 : 0), 0,
              ) / branchInstructors) * 10,
            ) / 10
          : 0;

        return {
          branch: company.name,
          branch_name: company.company_name,
          total_students: totalStudents,
          total_batches: totalBatches,
          avg_attendance_pct: avgAttPct,
          avg_exam_score_pct: avgExamPct,
          pass_rate: passRate,
          topic_coverage_pct: topicPct,
          total_exams_conducted: totalExams,
          chronic_absentees: chronicCount,
          total_instructors: branchInstructors,
          avg_classes_conducted_pct: avgClassesConductedPct,
          avg_instructor_topic_pct: avgInstructorTopicPct,
        };
      }),
    );

    // Filter out branches with no students
    const activeBranches = branchResults.filter((b) => b.total_students > 0);

    // Overall
    const totalStudents = activeBranches.reduce((s, b) => s + b.total_students, 0);
    const avgAttPct = activeBranches.length > 0
      ? Math.round(
          (activeBranches.reduce((s, b) => s + b.avg_attendance_pct * b.total_students, 0) /
            Math.max(totalStudents, 1)) *
            10,
        ) / 10
      : 0;
    const avgExamPct = activeBranches.length > 0
      ? Math.round(
          (activeBranches.reduce((s, b) => s + b.avg_exam_score_pct, 0) / activeBranches.length) * 10,
        ) / 10
      : 0;
    const overallPassRate = activeBranches.length > 0
      ? Math.round(
          (activeBranches.reduce((s, b) => s + b.pass_rate, 0) / activeBranches.length) * 10,
        ) / 10
      : 0;

    return NextResponse.json({
      branches: activeBranches,
      overall: {
        total_students: totalStudents,
        avg_attendance_pct: avgAttPct,
        avg_exam_pct: avgExamPct,
        overall_pass_rate: overallPassRate,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/branch-academics] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
