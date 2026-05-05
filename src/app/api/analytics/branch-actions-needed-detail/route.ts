import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateUTC(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function normalizeDateOnly(value?: string | null): string | null {
  if (!value) return null;
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function getAcademicWindowStartUTC(today: Date): string {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const startYear = month > 3 || (month === 3 && day >= 1) ? year : year - 1;
  return `${startYear}-05-01`;
}

function getCurrentWeekWindowUTC(today: Date) {
  const day = today.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    weekStart: formatDateUTC(weekStart),
    weekEnd: formatDateUTC(weekEnd),
  };
}

function getPublicHolidayDates(start: string, end: string): Set<string> {
  const startDate = parseDateUTC(start);
  const endDate = parseDateUTC(end);
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const holidayDates = new Set<string>();

  for (let year = startYear; year <= endYear; year++) {
    const mayFirst = `${year}-05-01`;
    if (mayFirst >= start && mayFirst <= end) {
      holidayDates.add(mayFirst);
    }
  }

  return holidayDates;
}

function getWorkingDays(start: string, end: string, holidayDates: Set<string>): string[] {
  const startDate = parseDateUTC(start);
  const endDate = parseDateUTC(end);
  const days: string[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue;
    const dateOnly = formatDateUTC(d);
    if (holidayDates.has(dateOnly)) continue;
    days.push(dateOnly);
  }

  return days;
}

/**
 * GET /api/analytics/branch-actions-needed-detail?branch=X
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
    const today = new Date();
    const academicStart = getAcademicWindowStartUTC(today);
    const { weekStart, weekEnd } = getCurrentWeekWindowUTC(today);

    const windowStart = weekStart < academicStart ? academicStart : weekStart;
    const windowEnd = weekEnd;
    const publicHolidays = getPublicHolidayDates(windowStart, windowEnd);
    const workingDays = getWorkingDays(windowStart, windowEnd, publicHolidays);

    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([
          ["custom_branch", "=", branch],
          ["schedule_date", ">=", windowStart],
          ["schedule_date", "<=", windowEnd],
        ]),
        fields: JSON.stringify(["schedule_date", "instructor", "course", "student_group"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const schedules: { schedule_date: string; instructor?: string; course?: string; student_group?: string }[] =
      schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];

    const attendanceRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([
          ["custom_branch", "=", branch],
          ["date", ">=", windowStart],
          ["date", "<=", windowEnd],
        ]),
        fields: JSON.stringify(["date"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attendance: { date: string }[] =
      attendanceRes.ok ? (await attendanceRes.json()).data ?? [] : [];

    const scheduledWorkingDaySet = new Set<string>();
    for (const s of schedules) {
      const dateOnly = normalizeDateOnly(s.schedule_date);
      if (dateOnly && workingDays.includes(dateOnly)) scheduledWorkingDaySet.add(dateOnly);
    }

    const attendanceDaySet = new Set<string>();
    for (const a of attendance) {
      const dateOnly = normalizeDateOnly(a.date);
      if (dateOnly && workingDays.includes(dateOnly)) attendanceDaySet.add(dateOnly);
    }

    const dayDetails = workingDays.map((date) => {
      const scheduled = scheduledWorkingDaySet.has(date);
      const attendanceMarked = scheduled && attendanceDaySet.has(date);

      let status: "not_scheduled" | "attendance_not_marked" | "resolved" = "resolved";
      if (!scheduled) status = "not_scheduled";
      else if (!attendanceMarked) status = "attendance_not_marked";

      return {
        date,
        scheduled,
        attendance_marked: attendanceMarked,
        status,
      };
    });

    const notScheduledDates = dayDetails.filter((d) => d.status === "not_scheduled").map((d) => d.date);
    const attendanceNotMarkedDates = dayDetails
      .filter((d) => d.status === "attendance_not_marked")
      .map((d) => d.date);

    return NextResponse.json({
      branch,
      week_from_date: windowStart,
      week_to_date: windowEnd,
      public_holiday_days_this_week: publicHolidays.size,
      working_days_this_week: workingDays.length,
      scheduled_days_this_week: scheduledWorkingDaySet.size,
      not_scheduled_days_this_week: notScheduledDates.length,
      attendance_not_marked_on_scheduled_days_this_week: attendanceNotMarkedDates.length,
      actions_needed_days: notScheduledDates.length + attendanceNotMarkedDates.length,
      not_scheduled_dates: notScheduledDates,
      attendance_not_marked_dates: attendanceNotMarkedDates,
      day_details: dayDetails,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/branch-actions-needed-detail] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
