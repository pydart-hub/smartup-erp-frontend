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
  const day = today.getUTCDay(); // 0 = Sunday, 1 = Monday
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

function getWorkingDays(start: string, end: string, holidayDates: Set<string>): Set<string> {
  const startDate = parseDateUTC(start);
  const endDate = parseDateUTC(end);
  const days = new Set<string>();

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue; // Sunday holiday
    const dateOnly = formatDateUTC(d);
    if (holidayDates.has(dateOnly)) continue;
    days.add(dateOnly);
  }

  return days;
}

/**
 * GET /api/analytics/branch-actions-needed
 *
 * Branch-wise weekly action dashboard for General Manager.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const today = new Date();
    const academicStart = getAcademicWindowStartUTC(today);

    // Allow overriding the week via ?week_start=YYYY-MM-DD
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("week_start");
    let weekStart: string;
    let weekEnd: string;

    if (weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)) {
      // Snap to Monday of the provided date's week
      const provided = parseDateUTC(weekStartParam);
      const day = provided.getUTCDay();
      const mondayOffset = (day + 6) % 7;
      const monday = new Date(provided);
      monday.setUTCDate(provided.getUTCDate() - mondayOffset);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      weekStart = formatDateUTC(monday);
      weekEnd = formatDateUTC(sunday);
    } else {
      ({ weekStart, weekEnd } = getCurrentWeekWindowUTC(today));
    }

    const windowStart = weekStart < academicStart ? academicStart : weekStart;
    const windowEnd = weekEnd;
    const publicHolidays = getPublicHolidayDates(windowStart, windowEnd);
    const workingDays = getWorkingDays(windowStart, windowEnd, publicHolidays);

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

    const branchActions = await Promise.all(
      companies.map(async (company) => {
        const schedulesRes = await fetch(
          `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
            filters: JSON.stringify([
              ["custom_branch", "=", company.name],
              ["schedule_date", ">=", windowStart],
              ["schedule_date", "<=", windowEnd],
            ]),
            fields: JSON.stringify(["schedule_date", "instructor"]),
            limit_page_length: "0",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const schedules: { schedule_date: string; instructor?: string }[] =
          schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];

        const attendanceRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
            filters: JSON.stringify([
              ["custom_branch", "=", company.name],
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
          if (dateOnly && workingDays.has(dateOnly)) scheduledWorkingDaySet.add(dateOnly);
        }

        const attendanceDaySet = new Set<string>();
        for (const a of attendance) {
          const dateOnly = normalizeDateOnly(a.date);
          if (dateOnly && workingDays.has(dateOnly)) attendanceDaySet.add(dateOnly);
        }

        const totalWorkingDays = workingDays.size;
        const scheduledDays = scheduledWorkingDaySet.size;
        const notScheduledDays = Math.max(totalWorkingDays - scheduledDays, 0);
        const attendanceMarkedOnScheduledDays = Array.from(scheduledWorkingDaySet)
          .filter((d) => attendanceDaySet.has(d)).length;
        const attendanceNotMarkedOnScheduledDays = Math.max(
          scheduledDays - attendanceMarkedOnScheduledDays,
          0,
        );

        const actionsNeeded = notScheduledDays + attendanceNotMarkedOnScheduledDays;
        const instructorsThisWeek = new Set(
          schedules.map((s) => s.instructor).filter((x): x is string => !!x),
        ).size;

        const actionItems: string[] = [];
        if (notScheduledDays > 0) {
          actionItems.push(`${notScheduledDays} working day(s) not scheduled this week`);
        }
        if (attendanceNotMarkedOnScheduledDays > 0) {
          actionItems.push(`${attendanceNotMarkedOnScheduledDays} scheduled day(s) attendance not marked`);
        }
        if (actionItems.length === 0) {
          actionItems.push("No immediate scheduling or attendance action needed this week.");
        }

        return {
          branch: company.name,
          branch_name: company.company_name,
          week_from_date: windowStart,
          week_to_date: windowEnd,
          working_days_this_week: totalWorkingDays,
          scheduled_days_this_week: scheduledDays,
          not_scheduled_days_this_week: notScheduledDays,
          attendance_marked_on_scheduled_days_this_week: attendanceMarkedOnScheduledDays,
          attendance_not_marked_on_scheduled_days_this_week: attendanceNotMarkedOnScheduledDays,
          actions_needed_days: actionsNeeded,
          instructors_scheduled_this_week: instructorsThisWeek,
          action_items: actionItems,
        };
      }),
    );

    const activeBranches = branchActions.filter((b) => b.working_days_this_week > 0);
    const branchesWithActions = activeBranches.filter((b) => b.actions_needed_days > 0).length;
    const totalActionsNeededDays = activeBranches.reduce((sum, b) => sum + b.actions_needed_days, 0);

    return NextResponse.json({
      branches: activeBranches,
      overall: {
        week_from_date: windowStart,
        week_to_date: windowEnd,
        public_holiday_days_this_week: publicHolidays.size,
        working_days_this_week: workingDays.size,
        total_branches: activeBranches.length,
        branches_with_actions: branchesWithActions,
        total_actions_needed_days: totalActionsNeededDays,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/branch-actions-needed] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
