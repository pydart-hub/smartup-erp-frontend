import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/schedule-summary?branch=...
 *
 * Returns course schedule + event analytics for a branch:
 * - Class-wise schedule summary (grouped by program)
 * - Per-batch detail within each class
 * - Event list with type breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");
    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch ALL course schedules for this branch
    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([["custom_branch", "=", branch]]),
        fields: JSON.stringify([
          "name", "course", "student_group", "program",
          "instructor", "instructor_name",
          "schedule_date", "from_time", "to_time", "room",
          "custom_topic", "custom_topic_covered",
          "custom_event_type", "custom_event_title",
        ]),
        order_by: "schedule_date desc, from_time asc",
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const allSchedules: {
      name: string; course: string; student_group: string; program: string;
      instructor: string; instructor_name: string;
      schedule_date: string; from_time: string; to_time: string; room: string;
      custom_topic: string; custom_topic_covered: 0 | 1;
      custom_event_type: string; custom_event_title: string;
    }[] = schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];

    // 2. Fetch attendance records to determine "conducted" sessions
    //    A schedule is "conducted" if there's at least one attendance for that group+date
    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([["custom_branch", "=", branch]]),
        fields: JSON.stringify(["student_group", "date"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attRecords: { student_group: string; date: string }[] =
      attRes.ok ? (await attRes.json()).data ?? [] : [];

    const conductedSet = new Set<string>();
    for (const r of attRecords) {
      if (r.student_group && r.date) conductedSet.add(`${r.student_group}|||${r.date}`);
    }

    // 3. Separate classes vs events
    const classSchedules = allSchedules.filter((s) => !s.custom_event_type);
    const eventSchedules = allSchedules.filter((s) => !!s.custom_event_type);

    // 4. Group class schedules by program
    const programMap = new Map<string, typeof classSchedules>();
    for (const s of classSchedules) {
      const key = s.program || "Uncategorized";
      if (!programMap.has(key)) programMap.set(key, []);
      programMap.get(key)!.push(s);
    }

    const classes = Array.from(programMap.entries()).map(([program, schedules]) => {
      const totalScheduled = schedules.length;
      const conducted = schedules.filter((s) =>
        conductedSet.has(`${s.student_group}|||${s.schedule_date}`),
      ).length;
      const upcoming = schedules.filter((s) => s.schedule_date >= today).length;
      const withTopic = schedules.filter((s) => s.custom_topic);
      const topicsCovered = withTopic.filter((s) => s.custom_topic_covered).length;
      const topicCoveragePct = withTopic.length > 0
        ? Math.round((topicsCovered / withTopic.length) * 100 * 10) / 10
        : 0;
      const conductedPct = totalScheduled > 0
        ? Math.round((conducted / totalScheduled) * 100 * 10) / 10
        : 0;

      // Group by batch (student_group) within this program
      const batchMap = new Map<string, typeof schedules>();
      for (const s of schedules) {
        const bk = s.student_group || "Unknown";
        if (!batchMap.has(bk)) batchMap.set(bk, []);
        batchMap.get(bk)!.push(s);
      }

      const batches = Array.from(batchMap.entries()).map(([student_group, batchSchedules]) => {
        const bTotal = batchSchedules.length;
        const bConducted = batchSchedules.filter((s) =>
          conductedSet.has(`${s.student_group}|||${s.schedule_date}`),
        ).length;
        const bUpcoming = batchSchedules.filter((s) => s.schedule_date >= today).length;
        const bWithTopic = batchSchedules.filter((s) => s.custom_topic);
        const bTopicsCovered = bWithTopic.filter((s) => s.custom_topic_covered).length;
        const bTopicPct = bWithTopic.length > 0
          ? Math.round((bTopicsCovered / bWithTopic.length) * 100 * 10) / 10
          : 0;

        // Unique instructors in this batch
        const instructors = Array.from(
          new Map(
            batchSchedules
              .filter((s) => s.instructor)
              .map((s) => [s.instructor, s.instructor_name || s.instructor]),
          ).entries(),
        ).map(([id, name]) => ({ id, name }));

        // Unique courses
        const courses = [...new Set(batchSchedules.map((s) => s.course).filter(Boolean))];

        // Recent & upcoming schedules (last 10 + next 10)
        const recent = batchSchedules
          .filter((s) => s.schedule_date < today)
          .sort((a, b) => b.schedule_date.localeCompare(a.schedule_date))
          .slice(0, 10)
          .map((s) => ({
            name: s.name,
            course: s.course,
            instructor_name: s.instructor_name || s.instructor,
            date: s.schedule_date,
            from_time: s.from_time,
            to_time: s.to_time,
            topic: s.custom_topic || null,
            topic_covered: s.custom_topic_covered ?? 0,
            conducted: conductedSet.has(`${s.student_group}|||${s.schedule_date}`),
          }));

        const upcomingList = batchSchedules
          .filter((s) => s.schedule_date >= today)
          .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
          .slice(0, 10)
          .map((s) => ({
            name: s.name,
            course: s.course,
            instructor_name: s.instructor_name || s.instructor,
            date: s.schedule_date,
            from_time: s.from_time,
            to_time: s.to_time,
            topic: s.custom_topic || null,
            topic_covered: s.custom_topic_covered ?? 0,
            conducted: false,
          }));

        return {
          student_group,
          total_scheduled: bTotal,
          conducted: bConducted,
          upcoming: bUpcoming,
          topic_coverage_pct: bTopicPct,
          instructors,
          courses,
          recent,
          upcoming_list: upcomingList,
        };
      }).sort((a, b) => b.total_scheduled - a.total_scheduled);

      return {
        program,
        total_scheduled: totalScheduled,
        conducted,
        conducted_pct: conductedPct,
        upcoming,
        topic_coverage_pct: topicCoveragePct,
        batches,
      };
    }).sort((a, b) => b.total_scheduled - a.total_scheduled);

    // 5. Event analytics
    const eventTypeMap = new Map<string, number>();
    for (const e of eventSchedules) {
      const t = e.custom_event_type || "Other";
      eventTypeMap.set(t, (eventTypeMap.get(t) || 0) + 1);
    }

    const thisMonthStart = `${today.slice(0, 7)}-01`;
    const eventsThisMonth = eventSchedules.filter((e) => e.schedule_date >= thisMonthStart).length;
    const upcomingEvents = eventSchedules.filter((e) => e.schedule_date >= today).length;

    const events = {
      total: eventSchedules.length,
      this_month: eventsThisMonth,
      upcoming: upcomingEvents,
      by_type: Array.from(eventTypeMap.entries()).map(([type, count]) => ({ type, count })),
      list: eventSchedules
        .sort((a, b) => b.schedule_date.localeCompare(a.schedule_date))
        .slice(0, 50)
        .map((e) => ({
          name: e.name,
          event_type: e.custom_event_type,
          event_title: e.custom_event_title,
          student_group: e.student_group || null,
          program: e.program || null,
          course: e.course || null,
          instructor_name: e.instructor_name || e.instructor || null,
          date: e.schedule_date,
          from_time: e.from_time,
          to_time: e.to_time,
          topic: e.custom_topic || null,
        })),
    };

    // 6. Overall summary
    const totalScheduled = classSchedules.length;
    const totalConducted = classSchedules.filter((s) =>
      conductedSet.has(`${s.student_group}|||${s.schedule_date}`),
    ).length;
    const totalUpcoming = classSchedules.filter((s) => s.schedule_date >= today).length;
    const allWithTopic = classSchedules.filter((s) => s.custom_topic);
    const allTopicsCovered = allWithTopic.filter((s) => s.custom_topic_covered).length;
    const overallTopicPct = allWithTopic.length > 0
      ? Math.round((allTopicsCovered / allWithTopic.length) * 100 * 10) / 10
      : 0;

    return NextResponse.json({
      overall: {
        total_scheduled: totalScheduled,
        total_conducted: totalConducted,
        conducted_pct: totalScheduled > 0
          ? Math.round((totalConducted / totalScheduled) * 100 * 10) / 10
          : 0,
        total_upcoming: totalUpcoming,
        topic_coverage_pct: overallTopicPct,
      },
      classes,
      events,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/schedule-summary] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
