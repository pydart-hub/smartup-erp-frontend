import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

export const dynamic = "force-dynamic";

function parseSessionCookie(sessionCookie: string): { roles?: string[] } | null {
  try {
    return JSON.parse(Buffer.from(sessionCookie, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params;
    const decodedInstructorId = decodeURIComponent(instructorId);

    // Verify session permissions
    const sessionCookie = req.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = parseSessionCookie(sessionCookie.value);
    const isAllowed =
      session?.roles?.includes("Director") ||
      session?.roles?.includes("Management") ||
      session?.roles?.includes("Administrator") ||
      session?.roles?.includes("Curriculum Dept");

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only Directors or Admins can access teacher profiles" },
        { status: 403 }
      );
    }

    // 1. Fetch Instructor Doc
    const instrRes = await frappeAdminGet(
      `resource/Instructor/${encodeURIComponent(decodedInstructorId)}`,
      {}
    );
    const instructorDoc = instrRes?.data;
    if (!instructorDoc) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 });
    }

    const employeeId = instructorDoc.employee;
    const instructorName = instructorDoc.instructor_name || instructorDoc.name;
    const instructorBranch = instructorDoc.custom_company || "";
    const instructorLog: Array<{
      course?: string;
      custom_branch?: string;
      program?: string;
      academic_year?: string;
    }> = instructorDoc.instructor_log ?? [];

    // Distinct courses and branches taught by this instructor
    const assignedCourses = Array.from(new Set(instructorLog.map((l) => l.course).filter((c): c is string => Boolean(c))));
    const assignedBranches = Array.from(new Set(instructorLog.map((l) => l.custom_branch).filter((b): b is string => Boolean(b))));

    // 2. Fetch Employee Doc (for designation, join date, department, user_id)
    let employeeDoc: any = null;
    if (employeeId) {
      try {
        const empRes = await frappeAdminGet(
          `resource/Employee/${encodeURIComponent(employeeId)}`,
          {}
        );
        employeeDoc = empRes?.data ?? null;
      } catch (err) {
        console.warn("Failed to fetch employee record for instructor:", employeeId);
      }
    }

    // 3. Parallel fetch of:
    //    A. Teacher's own attendance records (last 120 days)
    //    B. Assessment Plans matching instructor's courses/branch or examiner
    //    C. Work Assignments assigned to this instructor
    //    D. Student Reviews & Feedback
    const [attendanceRes, plansRes, waListRes, feedbackRes] = await Promise.all([
      // A. Teacher attendance
      employeeId
        ? frappeAdminGet("resource/Attendance", {
            fields: JSON.stringify([
              "name",
              "attendance_date",
              "status",
              "in_time",
              "out_time",
              "working_hours",
              "late_entry",
              "early_exit",
            ]),
            filters: JSON.stringify([["employee", "=", employeeId]]),
            limit_page_length: "120",
            order_by: "attendance_date desc",
          }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),

      // B. Assessment Plans
      (async () => {
        // Query plans by examiner OR plans where custom_branch is in assignedBranches and course in assignedCourses
        if (assignedCourses.length === 0 && !instructorDoc.name) {
          return { data: [] };
        }

        const filters: Array<any> = [["docstatus", "=", 1]];
        if (assignedCourses.length > 0) {
          filters.push(["course", "in", assignedCourses]);
        }
        if (assignedBranches.length > 0) {
          filters.push(["custom_branch", "in", assignedBranches]);
        }

        return frappeAdminGet("resource/Assessment Plan", {
          fields: JSON.stringify([
            "name",
            "assessment_name",
            "assessment_group",
            "course",
            "student_group",
            "custom_branch",
            "schedule_date",
            "maximum_assessment_score",
            "examiner",
          ]),
          filters: JSON.stringify(filters),
          limit_page_length: "200",
          order_by: "schedule_date desc",
        }).catch(() => ({ data: [] }));
      })(),

      // C. Work assignments
      (async () => {
        try {
          const parentFilters = [
            ["docstatus", "=", 1],
            ["Work Assignment Detail", "instructor", "=", decodedInstructorId],
          ];
          const listRes = await frappeAdminGet("resource/Work Assignment", {
            filters: JSON.stringify(parentFilters),
            fields: JSON.stringify([
              "name",
              "title",
              "description",
              "topic",
              "deadline",
              "for_branch",
            ]),
            limit_page_length: "100",
            order_by: "deadline desc",
          });
          const list = listRes?.data ?? [];
          if (!list.length) return [];

          // Fetch full WA documents in parallel (chunked by 10)
          const fullWAs: any[] = [];
          for (let i = 0; i < list.length; i += 10) {
            const chunk = list.slice(i, i + 10);
            const docs = await Promise.all(
              chunk.map((item: any) =>
                frappeAdminGet(
                  `resource/Work Assignment/${encodeURIComponent(item.name)}`,
                  {}
                )
                  .then((r) => r?.data)
                  .catch(() => null)
              )
            );
            fullWAs.push(...docs.filter(Boolean));
          }

          const matchedWAs: any[] = [];
          for (const doc of fullWAs) {
            const assignments = doc.assignments ?? [];
            const myRow = assignments.find(
              (a: any) =>
                a.instructor === decodedInstructorId ||
                a.instructor_name === instructorName ||
                (employeeId && a.employee === employeeId)
            );
            if (myRow) {
              matchedWAs.push({
                name: doc.name,
                title: doc.title,
                description: doc.description || "",
                topic: doc.topic || "",
                deadline: doc.deadline,
                for_branch: doc.for_branch,
                submission_status: myRow.submission_status || "Pending",
                google_drive_link: myRow.google_drive_link || null,
                submitted_on: myRow.submitted_on || null,
                approval_status: myRow.approval_status || "Pending",
                approval_remarks: myRow.approval_remarks || null,
                rejection_reason: myRow.rejection_reason || null,
                can_resubmit: Boolean(myRow.can_resubmit),
              });
            }
          }
          return matchedWAs;
        } catch (e) {
          console.warn("Work Assignment fetch error:", e);
          return [];
        }
      })(),

      // D. Instructor Feedback
      (async () => {
        try {
          // Check by instructor ID or instructor name
          const filters = [
            ["status", "!=", "Hidden"],
          ];
          const orFilters = [
            ["instructor", "=", decodedInstructorId],
            ["instructor_name", "=", instructorName],
          ];
          const fbRes = await frappeAdminGet("resource/Instructor Feedback", {
            fields: JSON.stringify([
              "name",
              "instructor",
              "instructor_name",
              "branch",
              "course",
              "program",
              "student",
              "student_name",
              "rating",
              "strengths",
              "weaknesses",
              "detailed_feedback",
              "suggestions",
              "review_date",
              "is_anonymous",
              "creation",
            ]),
            filters: JSON.stringify(filters),
            or_filters: JSON.stringify(orFilters),
            limit_page_length: "200",
            order_by: "creation desc",
          });
          return fbRes?.data ?? [];
        } catch (e) {
          console.warn("Instructor Feedback fetch error:", e);
          return [];
        }
      })(),
    ]);

    const rawAttendance: any[] = attendanceRes?.data ?? [];
    // Deduplicate attendance records per date
    // (If a day has both Absent and Present/punch in, the Present takes precedence; prefer entries with actual in_time)
    const dateAttendanceMap = new Map<string, any>();
    for (const att of rawAttendance) {
      const date = att.attendance_date;
      const existing = dateAttendanceMap.get(date);
      if (!existing) {
        dateAttendanceMap.set(date, att);
      } else {
        const isBetter =
          (att.status === "Present" && existing.status !== "Present") ||
          (att.in_time && !existing.in_time) ||
          (att.working_hours > (existing.working_hours || 0));
        if (isBetter) {
          dateAttendanceMap.set(date, att);
        }
      }
    }
    const teacherAttendance = Array.from(dateAttendanceMap.values()).sort(
      (a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
    );

    const allPlans: any[] = plansRes?.data ?? [];
    const workAssignments: any[] = waListRes ?? [];
    const instructorReviews: any[] = feedbackRes ?? [];

    // 4. For Assessment Plans, separate Weekly Exams & CWC Exams
    const weeklyPlans = allPlans.filter((p) =>
      p.assessment_group ? p.assessment_group.toLowerCase().includes("weekly") : false
    );
    const cwcPlans = allPlans.filter((p) =>
      p.assessment_group ? p.assessment_group.toLowerCase().includes("cwc") : false
    );
    const otherPlans = allPlans.filter(
      (p) => !weeklyPlans.includes(p) && !cwcPlans.includes(p)
    );

    // Fetch Assessment Results for Weekly Exams & CWC Exams
    const targetPlans = [...weeklyPlans, ...cwcPlans];
    const planNames = targetPlans.map((p) => p.name);

    let planResultsMap = new Map<
      string,
      Array<{
        name: string;
        student: string;
        student_name: string;
        total_score: number;
        maximum_score: number;
        grade?: string;
      }>
    >();

    // Chunk plan names
    const planChunkSize = 25;
    for (let i = 0; i < planNames.length; i += planChunkSize) {
      const chunk = planNames.slice(i, i + planChunkSize);
      try {
        const resData = await frappeAdminGet("resource/Assessment Result", {
          fields: JSON.stringify([
            "name",
            "assessment_plan",
            "student",
            "student_name",
            "total_score",
            "maximum_score",
            "grade",
          ]),
          filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["assessment_plan", "in", chunk],
          ]),
          limit_page_length: "2000",
        });

        for (const row of resData?.data ?? []) {
          const list = planResultsMap.get(row.assessment_plan) ?? [];
          list.push(row);
          planResultsMap.set(row.assessment_plan, list);
        }
      } catch (e) {
        console.warn("Error fetching assessment results chunk:", e);
      }
    }

    // 5. Fetch enrolled student count for relevant Student Groups
    const distinctGroups = Array.from(
      new Set(
        [...weeklyPlans, ...cwcPlans]
          .map((p) => p.student_group)
          .filter((g): g is string => Boolean(g))
      )
    );

    const groupStudentCountMap = new Map<string, number>();
    await Promise.all(
      distinctGroups.map(async (grpName) => {
        try {
          const grpRes = await frappeAdminGet(
            `resource/Student Group/${encodeURIComponent(grpName)}`,
            {}
          );
          const students = grpRes?.data?.students ?? [];
          groupStudentCountMap.set(grpName, students.length);
        } catch (e) {
          // ignore
        }
      })
    );

    // Fetch batch attendance on exam date if available, properly deduplicating per student
    // (Frappe logs attendance per period/Course Schedule, so multiple periods on the same day duplicate rows)
    const planAttendanceMap = new Map<string, { present: number; absent: number; total: number }>();
    await Promise.all(
      weeklyPlans.slice(0, 20).map(async (plan) => {
        if (!plan.student_group || !plan.schedule_date) return;
        try {
          const attRes = await frappeAdminGet("resource/Student Attendance", {
            fields: JSON.stringify(["student", "status"]),
            filters: JSON.stringify([
              ["student_group", "=", plan.student_group],
              ["date", "=", plan.schedule_date],
            ]),
            limit_page_length: "500",
          });
          const rows: any[] = attRes?.data ?? [];
          if (rows.length > 0) {
            // Deduplicate per student on that day (if any period was Present -> Present, else Absent)
            const studentDailyStatus = new Map<string, string>();
            for (const r of rows) {
              const prev = studentDailyStatus.get(r.student);
              if (r.status === "Present" || !prev) {
                studentDailyStatus.set(r.student, r.status);
              }
            }
            const pCount = Array.from(studentDailyStatus.values()).filter((s) => s === "Present").length;
            const aCount = Array.from(studentDailyStatus.values()).filter((s) => s === "Absent").length;
            planAttendanceMap.set(plan.name, {
              present: pCount,
              absent: aCount,
              total: studentDailyStatus.size,
            });
          }
        } catch (e) {
          // ignore
        }
      })
    );

    // Helper to calculate attended, absent, pass rate
    // Note: Passing threshold is typically >= 35% of maximum_assessment_score
    const processExamSummary = (plan: any) => {
      const results = planResultsMap.get(plan.name) ?? [];
      const resultStudentCount = results.length;
      const attStats = planAttendanceMap.get(plan.name);
      const enrolledCount = groupStudentCountMap.get(plan.student_group) || 0;

      const maxScore = Number(plan.maximum_assessment_score || 0) || 100;
      const passThreshold = maxScore * 0.35; // 35% pass mark

      let passedCount = 0;
      let totalMarks = 0;
      let topScore = 0;
      let topperName = "";

      for (const r of results) {
        const score = Number(r.total_score || 0);
        totalMarks += score;
        if (score >= passThreshold) {
          passedCount++;
        }
        if (score > topScore) {
          topScore = score;
          topperName = r.student_name || r.student;
        }
      }

      // Attended: student count with submitted Assessment Results (or de-duplicated present students)
      const attendedCount = resultStudentCount > 0 ? resultStudentCount : (attStats?.present ?? 0);

      // Absent count:
      // If student group enrolled count is known: absent = max(0, enrolled - attended)
      // Otherwise fall back to de-duplicated daily attendance absentees
      const absentCount =
        enrolledCount > 0
          ? Math.max(0, enrolledCount - attendedCount)
          : attStats
          ? attStats.absent
          : 0;

      const totalEnrolled = enrolledCount > 0 ? enrolledCount : (attendedCount + absentCount);

      const passRate =
        attendedCount > 0 ? Math.round((passedCount / attendedCount) * 100) : 0;
      const avgScorePct =
        attendedCount > 0 && maxScore > 0
          ? Math.round((totalMarks / (attendedCount * maxScore)) * 100)
          : 0;

      return {
        id: plan.name,
        name: plan.assessment_name || plan.name,
        group: plan.assessment_group,
        course: plan.course,
        student_group: plan.student_group,
        branch: plan.custom_branch,
        schedule_date: plan.schedule_date,
        maximum_score: maxScore,
        total_enrolled: totalEnrolled,
        attended_count: attendedCount,
        absent_count: absentCount,
        passed_count: passedCount,
        pass_rate: passRate,
        avg_score_pct: avgScorePct,
        top_score: topScore,
        topper_name: topperName,
      };
    };

    const processedWeeklyExams = weeklyPlans.map(processExamSummary);
    const processedCwcExams = cwcPlans.map(processExamSummary);
    const processedOtherExams = otherPlans.map((p) => ({
      id: p.name,
      name: p.assessment_name || p.name,
      group: p.assessment_group,
      course: p.course,
      student_group: p.student_group,
      branch: p.custom_branch,
      schedule_date: p.schedule_date,
      maximum_score: Number(p.maximum_assessment_score || 0),
    }));

    // 5. Aggregate stats
    const totalWeeklyAttended = processedWeeklyExams.reduce((s, e) => s + e.attended_count, 0);
    const avgWeeklyPassRate =
      processedWeeklyExams.length > 0
        ? Math.round(
            processedWeeklyExams.reduce((s, e) => s + e.pass_rate, 0) /
              processedWeeklyExams.length
          )
        : 0;
    const avgWeeklyScorePct =
      processedWeeklyExams.length > 0
        ? Math.round(
            processedWeeklyExams.reduce((s, e) => s + e.avg_score_pct, 0) /
              processedWeeklyExams.length
          )
        : 0;

    const totalCwcAttended = processedCwcExams.reduce((s, e) => s + e.attended_count, 0);
    const avgCwcPassRate =
      processedCwcExams.length > 0
        ? Math.round(
            processedCwcExams.reduce((s, e) => s + e.pass_rate, 0) /
              processedCwcExams.length
          )
        : 0;

    // Teacher Attendance Stats
    const attPresent = teacherAttendance.filter(
      (a) => a.status === "Present" || a.status === "Work From Home" || a.status === "At Head Office"
    ).length;
    const attAbsent = teacherAttendance.filter((a) => a.status === "Absent").length;
    const attHalfDay = teacherAttendance.filter((a) => a.status === "Half Day").length;
    const attTotal = teacherAttendance.length;
    const attRate = attTotal > 0 ? Math.round(((attPresent + attHalfDay * 0.5) / attTotal) * 100) : 0;

    // WA Stats
    const waTotal = workAssignments.length;
    const waCompleted = workAssignments.filter(
      (w) => w.submission_status === "Submitted" || w.approval_status === "Approved"
    ).length;
    const waPending = workAssignments.filter(
      (w) => w.submission_status === "Pending"
    ).length;

    // Instructor Feedback & Reviews processing
    const rawReviews: any[] = feedbackRes ?? [];
    const validReviews = rawReviews.map((r) => {
      const rawRating = Number(r.rating) || 0;
      const normalizedRating = rawRating > 5 ? Math.round((rawRating / 2) * 10) / 10 : Math.max(1, rawRating || 5);
      return {
        name: r.name,
        instructor: r.instructor || decodedInstructorId,
        instructor_name: r.instructor_name || instructorName,
        branch: r.branch || "",
        course: r.course || "",
        program: r.program || "",
        student: r.student || "",
        student_name: r.is_anonymous ? "Anonymous Student" : (r.student_name || "Verified Parent"),
        is_anonymous: Boolean(r.is_anonymous),
        rating: normalizedRating,
        strengths: r.strengths || "",
        weaknesses: r.weaknesses || "",
        detailed_feedback: r.detailed_feedback || "",
        suggestions: r.suggestions || "",
        review_date: r.review_date || r.creation || "",
        creation: r.creation,
      };
    });

    const totalReviews = validReviews.length;
    const avgRating =
      totalReviews > 0
        ? Number(
            (
              validReviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviews
            ).toFixed(1)
          )
        : 0;

    const strengthCounts: Record<string, number> = {};
    const weaknessCounts: Record<string, number> = {};

    validReviews.forEach((r) => {
      if (r.strengths) {
        const items = r.strengths.split(",").map((s: string) => s.trim()).filter(Boolean);
        items.forEach((item: string) => {
          strengthCounts[item] = (strengthCounts[item] || 0) + 1;
        });
      }
      if (r.weaknesses) {
        const items = r.weaknesses.split(",").map((w: string) => w.trim()).filter(Boolean);
        items.forEach((item: string) => {
          weaknessCounts[item] = (weaknessCounts[item] || 0) + 1;
        });
      }
    });

    const topStrengths = Object.entries(strengthCounts)
      .map(([tag, count]) => ({ tag, count, pct: Math.round((count / (totalReviews || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    const topWeaknesses = Object.entries(weaknessCounts)
      .map(([tag, count]) => ({ tag, count, pct: Math.round((count / (totalReviews || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        instructor: {
          id: instructorDoc.name,
          name: instructorName,
          gender: instructorDoc.gender,
          branch: instructorBranch,
          employee_id: employeeId,
          designation: employeeDoc?.designation || "Instructor",
          department: employeeDoc?.department || instructorDoc.department || "Academics",
          date_of_joining: employeeDoc?.date_of_joining || null,
          cell_number: employeeDoc?.cell_number || null,
          company_email: employeeDoc?.company_email || employeeDoc?.personal_email || null,
          user_id: employeeDoc?.user_id || null,
          assigned_courses: assignedCourses,
          assigned_branches: assignedBranches,
          instructor_log: instructorLog,
        },
        summary: {
          weekly_exams_count: processedWeeklyExams.length,
          weekly_total_attended: totalWeeklyAttended,
          weekly_avg_pass_rate: avgWeeklyPassRate,
          weekly_avg_score_pct: avgWeeklyScorePct,
          cwc_exams_count: processedCwcExams.length,
          cwc_total_attended: totalCwcAttended,
          cwc_avg_pass_rate: avgCwcPassRate,
          attendance: {
            total_days: attTotal,
            present_days: attPresent,
            absent_days: attAbsent,
            half_days: attHalfDay,
            attendance_rate: attRate,
          },
          work_assignments: {
            total: waTotal,
            completed: waCompleted,
            pending: waPending,
            completion_rate: waTotal > 0 ? Math.round((waCompleted / waTotal) * 100) : 100,
          },
          reviews: {
            total_reviews: totalReviews,
            avg_rating: avgRating,
            strengths_count: Object.keys(strengthCounts).length,
            weaknesses_count: Object.keys(weaknessCounts).length,
            top_strengths: topStrengths,
            top_weaknesses: topWeaknesses,
          },
        },
        weekly_exams: processedWeeklyExams,
        cwc_exams: processedCwcExams,
        other_exams: processedOtherExams,
        teacher_attendance: teacherAttendance,
        work_assignments: workAssignments,
        instructor_reviews: validReviews,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Teacher profile analytics error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
