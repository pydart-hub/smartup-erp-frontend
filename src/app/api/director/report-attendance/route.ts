import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      roles?: string[];
    };
  } catch {
    return null;
  }
}

function isDirectorRole(roles: string[]): boolean {
  return (
    roles.includes("Director") ||
    roles.includes("Management") ||
    roles.includes("General Manager") ||
    roles.includes("Administrator")
  );
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][],
  orderBy?: string,
  limitPageLength = 0,
): Promise<Record<string, unknown>[]> {
  const pageSize = 500;
  const maxRecords = limitPageLength > 0 ? limitPageLength : 10000;
  let allData: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    const currentLimit = Math.min(pageSize, maxRecords - offset);
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(currentLimit),
      limit_start: String(offset),
      ...(orderBy ? { order_by: orderBy } : {}),
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
      { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const page: Record<string, unknown>[] = json?.data ?? [];
    allData = allData.concat(page);
    if (page.length < currentLimit) break;
    offset += pageSize;
  }

  return allData;
}

// Default: current month
function defaultDateRange(body: { fromDate?: string; toDate?: string }) {
  const d = new Date();
  const from = body.fromDate || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const to = body.toDate || d.toISOString().slice(0, 10);
  return { from, to };
}

// ── Branch summary ──

async function getAllBranchesSummary(from: string, to: string) {
  const companies = await frappeGet("Company", ["name"], [], "name asc");
  const branches = companies.map((c) => String(c.name)).filter((n) => n !== "Smart Up");

  // Student attendance records in date range
  const rawAttendance = await frappeGet(
    "Student Attendance",
    ["name", "custom_branch", "student", "status", "date"],
    [
      ["date", ">=", from],
      ["date", "<=", to],
      ["docstatus", "=", 1],
      ["student", "!=", ""],
    ],
  );
  const attendance = rawAttendance.map((a) => ({ ...a, attendance_date: a.date })) as Record<string, unknown>[];

  return branches.map((branch) => {
    const ba = attendance.filter((a) => a.custom_branch === branch);
    const present = ba.filter((a) => a.status === "Present" || a.status === "Half Day").length;
    const absent = ba.filter((a) => a.status === "Absent").length;
    const leave = ba.filter((a) => a.status === "On Leave").length;
    const totalSessions = ba.length;
    const studentSet = new Set(ba.map((a) => String(a.student)));
    const avgAttendancePct = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

    return {
      branch,
      totalSessions,
      avgAttendancePct,
      present,
      absent,
      leave,
      students: studentSet.size,
    };
  });
}

// ── Branch detail ──

async function getBranchDetail(branch: string, from: string, to: string) {
  const rawAttendance = await frappeGet(
    "Student Attendance",
    ["name", "student", "status", "date"],
    [
      ["custom_branch", "=", branch],
      ["date", ">=", from],
      ["date", "<=", to],
      ["docstatus", "=", 1],
      ["student", "!=", ""],
    ],
    "date desc",
  );
  const attendance = rawAttendance.map((a) => ({ ...a, attendance_date: a.date })) as Record<string, unknown>[];

  const totalSessions = attendance.length;
  const presentTotal = attendance.filter((a) => a.status === "Present" || a.status === "Half Day").length;
  const absentTotal = attendance.filter((a) => a.status === "Absent").length;
  const leaveTotal = attendance.filter((a) => a.status === "On Leave").length;
  const studentSet = new Set(attendance.map((a) => String(a.student)));
  const avgAttendancePct = totalSessions > 0 ? Math.round((presentTotal / totalSessions) * 100) : 0;

  const summary = {
    branch,
    totalSessions,
    avgAttendancePct,
    present: presentTotal,
    absent: absentTotal,
    leave: leaveTotal,
    students: studentSet.size,
  };

  // Per-student breakdown
  const studentMap = new Map<string, { name: string; present: number; absent: number; leave: number; lastDate: string }>();
  for (const a of attendance) {
    const sid = String(a.student);
    const cur = studentMap.get(sid) ?? { name: "", present: 0, absent: 0, leave: 0, lastDate: "" };
    if (a.status === "Present" || a.status === "Half Day") cur.present++;
    else if (a.status === "Absent") cur.absent++;
    else if (a.status === "On Leave") cur.leave++;
    const dt = String(a.attendance_date ?? "");
    if ((a.status === "Present" || a.status === "Half Day") && dt > cur.lastDate) cur.lastDate = dt;
    studentMap.set(sid, cur);
  }

  const students = Array.from(studentMap.entries()).map(([sid, s]) => {
    const total = s.present + s.absent + s.leave;
    return {
      studentId: sid,
      studentName: s.name,
      present: s.present,
      absent: s.absent,
      leave: s.leave,
      attendancePct: total > 0 ? Math.round((s.present / total) * 100) : 0,
      lastAttended: s.lastDate || "—",
      disabilities: "",
    };
  }).sort((a, b) => a.attendancePct - b.attendancePct);

  // Fetch student names + disabilities from Student doctype (branch filter avoids large IN-filter URLs)
  const sids = new Set(students.map((s) => s.studentId));
  if (sids.size > 0) {
    const stuRecords = await frappeGet("Student", ["name", "student_name", "custom_disabilities"], [["custom_branch", "=", branch]]);
    const nameMap = new Map<string, string>();
    const disMap = new Map<string, string>();
    for (const r of stuRecords) {
      const sname = String(r.student_name ?? "");
      if (sname && sids.has(String(r.name))) nameMap.set(String(r.name), sname);
      const d = String(r.custom_disabilities ?? "");
      if (d && sids.has(String(r.name))) disMap.set(String(r.name), d);
    }
    for (const s of students) {
      if (!s.studentName) s.studentName = nameMap.get(s.studentId) ?? s.studentId;
      s.disabilities = disMap.get(s.studentId) ?? "";
    }
  }

  return { summary, students };
}

// ── Class summary ──

async function getAllClassesSummary(from: string, to: string) {
  // Get all students for program mapping
  const allStudents = await frappeGet("Student", ["name"], []);
  const studentNames = allStudents.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
    );
  }

  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  const attendance = await frappeGet(
    "Attendance",
    ["name", "student", "status"],
    [
      ["attendance_date", ">=", from],
      ["attendance_date", "<=", to],
      ["docstatus", "=", 1],
      ["student", "!=", ""],
    ],
  );

  const programMap = new Map<string, { present: number; absent: number; leave: number; students: Set<string> }>();
  for (const a of attendance) {
    const sid = String(a.student);
    const prog = studentProgram.get(sid) ?? "Uncategorized";
    const cur = programMap.get(prog) ?? { present: 0, absent: 0, leave: 0, students: new Set<string>() };
    if (a.status === "Present" || a.status === "Half Day") cur.present++;
    else if (a.status === "Absent") cur.absent++;
    else if (a.status === "On Leave") cur.leave++;
    cur.students.add(sid);
    programMap.set(prog, cur);
  }

  return Array.from(programMap.entries())
    .filter(([prog]) => prog !== "Uncategorized")
    .map(([program, s]) => {
      const total = s.present + s.absent + s.leave;
      return {
        program,
        totalSessions: total,
        avgAttendancePct: total > 0 ? Math.round((s.present / total) * 100) : 0,
        present: s.present,
        absent: s.absent,
        leave: s.leave,
        students: s.students.size,
      };
    })
    .sort((a, b) => b.students - a.students);
}

// ── Class detail ──

async function getClassDetail(program: string, from: string, to: string) {
  const allStudents = await frappeGet("Student", ["name"], []);
  const studentNames = allStudents.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
    );
  }

  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  const programStudentIds = new Set(
    allStudents.filter((s) => studentProgram.get(String(s.name)) === program).map((s) => String(s.name)),
  );

  const attendance = await frappeGet(
    "Attendance",
    ["name", "student", "custom_branch", "status", "attendance_date"],
    [
      ["attendance_date", ">=", from],
      ["attendance_date", "<=", to],
      ["docstatus", "=", 1],
      ["student", "!=", ""],
    ],
    "attendance_date desc",
  );

  const progAttendance = attendance.filter((a) => programStudentIds.has(String(a.student)));

  const totalSessions = progAttendance.length;
  const presentTotal = progAttendance.filter((a) => a.status === "Present" || a.status === "Half Day").length;
  const absentTotal = progAttendance.filter((a) => a.status === "Absent").length;
  const leaveTotal = progAttendance.filter((a) => a.status === "On Leave").length;
  const studentSet = new Set(progAttendance.map((a) => String(a.student)));
  const avgAttendancePct = totalSessions > 0 ? Math.round((presentTotal / totalSessions) * 100) : 0;

  const summary = {
    program,
    totalSessions,
    avgAttendancePct,
    present: presentTotal,
    absent: absentTotal,
    leave: leaveTotal,
    students: studentSet.size,
  };

  // Per-student breakdown
  const studentMap = new Map<string, { name: string; branch: string; present: number; absent: number; leave: number; lastDate: string }>();
  for (const a of progAttendance) {
    const sid = String(a.student);
    const br = String(a.custom_branch ?? "").replace("Smart Up ", "");
    const cur = studentMap.get(sid) ?? { name: "", branch: br, present: 0, absent: 0, leave: 0, lastDate: "" };
    if (a.status === "Present" || a.status === "Half Day") cur.present++;
    else if (a.status === "Absent") cur.absent++;
    else if (a.status === "On Leave") cur.leave++;
    const dt = String(a.attendance_date ?? "");
    if ((a.status === "Present" || a.status === "Half Day") && dt > cur.lastDate) cur.lastDate = dt;
    studentMap.set(sid, cur);
  }

  const students = Array.from(studentMap.entries()).map(([sid, s]) => {
    const total = s.present + s.absent + s.leave;
    return {
      studentId: sid,
      studentName: s.name,
      present: s.present,
      absent: s.absent,
      leave: s.leave,
      attendancePct: total > 0 ? Math.round((s.present / total) * 100) : 0,
      lastAttended: s.lastDate || "—",
      branch: s.branch,
      disabilities: "",
    };
  }).sort((a, b) => a.attendancePct - b.attendancePct);

  // Fetch student names + disabilities from Student doctype (filter in JS to avoid large IN-filter URL)
  const sidSet = new Set(students.map((s) => s.studentId));
  if (sidSet.size > 0) {
    const stuRecords = await frappeGet("Student", ["name", "student_name", "custom_disabilities"], []);
    const nameMap = new Map<string, string>();
    const disMap = new Map<string, string>();
    for (const r of stuRecords) {
      const sname = String(r.student_name ?? "");
      if (sname && sidSet.has(String(r.name))) nameMap.set(String(r.name), sname);
      const d = String(r.custom_disabilities ?? "");
      if (d && sidSet.has(String(r.name))) disMap.set(String(r.name), d);
    }
    for (const s of students) {
      if (!s.studentName) s.studentName = nameMap.get(s.studentId) ?? s.studentId;
      s.disabilities = disMap.get(s.studentId) ?? "";
    }
  }

  return { summary, students };
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isDirectorRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Access denied — Director role required" }, { status: 403 });
    }

    const body = await request.json();
    const mode = String(body.mode ?? "");
    const detail = body.detail ? String(body.detail) : null;
    const { from, to } = defaultDateRange(body);

    if (mode === "branch" && !detail) {
      return NextResponse.json({ data: await getAllBranchesSummary(from, to) });
    }
    if (mode === "branch" && detail) {
      return NextResponse.json({ data: await getBranchDetail(detail, from, to) });
    }
    if (mode === "class" && !detail) {
      return NextResponse.json({ data: await getAllClassesSummary(from, to) });
    }
    if (mode === "class" && detail) {
      return NextResponse.json({ data: await getClassDetail(detail, from, to) });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'branch' or 'class'" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-attendance] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch attendance report" }, { status: 500 });
  }
}
