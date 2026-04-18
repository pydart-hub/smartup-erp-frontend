import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/attendance-summary?branch=X&from_date=Y&to_date=Z&student_group=?
 *
 * Returns batch-wise attendance analytics, chronic absentees, and daily trend.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const branch = request.nextUrl.searchParams.get("branch");
    const fromDate = request.nextUrl.searchParams.get("from_date");
    const toDate = request.nextUrl.searchParams.get("to_date");
    const studentGroupFilter = request.nextUrl.searchParams.get("student_group");

    if (!branch || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "branch, from_date, and to_date params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch batches for this branch
    const batchFilters: (string | number)[][] = [
      ["custom_branch", "=", branch],
      ["group_based_on", "=", "Batch"],
      ["disabled", "=", 0],
    ];
    if (studentGroupFilter) batchFilters.push(["name", "=", studentGroupFilter]);

    const batchesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify(batchFilters),
        fields: JSON.stringify(["name", "program", "max_strength"]),
        limit_page_length: "100",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batches: { name: string; program: string; max_strength: number }[] =
      batchesRes.ok ? (await batchesRes.json()).data ?? [] : [];

    if (batches.length === 0) {
      return NextResponse.json({
        batches: [],
        chronic_absentees: [],
        daily_trend: [],
        overall: { total_students: 0, avg_attendance_pct: 0, total_working_days: 0 },
      });
    }

    // 2. Fetch all attendance records for date range + branch
    const attFilters: string[][] = [
      ["custom_branch", "=", branch],
      ["date", ">=", fromDate],
      ["date", "<=", toDate],
    ];
    if (studentGroupFilter) attFilters.push(["student_group", "=", studentGroupFilter]);

    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify(attFilters),
        fields: JSON.stringify(["student", "student_name", "student_group", "date", "status"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const records: {
      student: string; student_name: string; student_group: string;
      date: string; status: string;
    }[] = attRes.ok ? (await attRes.json()).data ?? [] : [];

    // 3. Compute per-batch summaries
    const batchMap = new Map<string, {
      program: string;
      students: Set<string>;
      dates: Set<string>;
      present: number;
      absent: number;
      late: number;
      studentDays: Map<string, { present: number; absent: number; late: number; total: number; name: string }>;
    }>();

    for (const b of batches) {
      batchMap.set(b.name, {
        program: b.program,
        students: new Set(),
        dates: new Set(),
        present: 0,
        absent: 0,
        late: 0,
        studentDays: new Map(),
      });
    }

    for (const r of records) {
      const bData = batchMap.get(r.student_group);
      if (!bData) continue;

      bData.students.add(r.student);
      bData.dates.add(r.date);

      if (r.status === "Present") bData.present++;
      else if (r.status === "Absent") bData.absent++;
      else if (r.status === "Late") bData.late++;

      if (!bData.studentDays.has(r.student)) {
        bData.studentDays.set(r.student, { present: 0, absent: 0, late: 0, total: 0, name: r.student_name });
      }
      const sd = bData.studentDays.get(r.student)!;
      sd.total++;
      if (r.status === "Present") sd.present++;
      else if (r.status === "Absent") sd.absent++;
      else if (r.status === "Late") sd.late++;
    }

    const batchSummaries = batches.map((b) => {
      const data = batchMap.get(b.name);
      if (!data || data.students.size === 0) {
        return {
          student_group: b.name,
          program: b.program,
          total_students: 0,
          total_working_days: 0,
          total_present: 0,
          total_absent: 0,
          total_late: 0,
          avg_attendance_pct: 0,
          chronic_absentees: 0,
        };
      }
      const totalRecords = data.present + data.absent + data.late;
      const avgPct = totalRecords > 0
        ? Math.round(((data.present + data.late) / totalRecords) * 100 * 10) / 10
        : 0;
      const chronic = Array.from(data.studentDays.values()).filter(
        (sd) => sd.total > 0 && ((sd.present + sd.late) / sd.total) * 100 < 75,
      ).length;

      return {
        student_group: b.name,
        program: b.program,
        total_students: data.students.size,
        total_working_days: data.dates.size,
        total_present: data.present,
        total_absent: data.absent,
        total_late: data.late,
        avg_attendance_pct: avgPct,
        chronic_absentees: chronic,
      };
    });

    // 4. Chronic absentees (all students with <75% attendance)
    const chronicAbsentees: {
      student: string; student_name: string; student_group: string;
      total_days: number; present: number; absent: number; late: number; pct: number;
    }[] = [];

    for (const [batchName, data] of batchMap) {
      for (const [student, sd] of data.studentDays) {
        const pct = sd.total > 0 ? Math.round(((sd.present + sd.late) / sd.total) * 100 * 10) / 10 : 0;
        if (pct < 75 && sd.total >= 3) {
          chronicAbsentees.push({
            student,
            student_name: sd.name,
            student_group: batchName,
            total_days: sd.total,
            present: sd.present,
            absent: sd.absent,
            late: sd.late,
            pct,
          });
        }
      }
    }
    chronicAbsentees.sort((a, b) => a.pct - b.pct);

    // 5. Daily trend
    const dailyMap = new Map<string, { present: number; absent: number; late: number; total: number }>();
    for (const r of records) {
      if (!dailyMap.has(r.date)) {
        dailyMap.set(r.date, { present: 0, absent: 0, late: 0, total: 0 });
      }
      const d = dailyMap.get(r.date)!;
      d.total++;
      if (r.status === "Present") d.present++;
      else if (r.status === "Absent") d.absent++;
      else if (r.status === "Late") d.late++;
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Overall
    const allStudents = new Set(records.map((r) => r.student));
    const totalRecords = records.length;
    const totalPresent = records.filter((r) => r.status === "Present" || r.status === "Late").length;
    const overallPct = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      batches: batchSummaries,
      chronic_absentees: chronicAbsentees,
      daily_trend: dailyTrend,
      overall: {
        total_students: allStudents.size,
        avg_attendance_pct: overallPct,
        total_working_days: dailyMap.size,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/attendance-summary] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
