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
  return roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
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

// ── Helpers ──

function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── Branch summary ──

async function getAllBranchesSummary() {
  const companies = await frappeGet("Company", ["name"], [], "name asc");
  const branches = companies.map((c) => String(c.name)).filter((n) => n !== "Smart Up");

  const students = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date"],
    [],
  );

  const monthStart = thisMonthStart();

  return branches.map((branch) => {
    const bs = students.filter((s) => s.custom_branch === branch);
    const active = bs.filter((s) => Number(s.enabled) === 1).length;
    const discontinued = bs.filter((s) => Number(s.enabled) === 0).length;
    const male = bs.filter((s) => String(s.gender).toLowerCase() === "male").length;
    const female = bs.filter((s) => String(s.gender).toLowerCase() === "female").length;
    const newThisMonth = bs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

    return {
      branch,
      totalStudents: bs.length,
      active,
      inactive: 0,
      discontinued,
      male,
      female,
      newThisMonth,
    };
  });
}

// ── Branch detail ──

async function getBranchDetail(branch: string) {
  const students = await frappeGet(
    "Student",
    ["name", "student_name", "enabled", "gender", "student_mobile_number", "custom_parent_name", "joining_date", "custom_disabilities"],
    [["custom_branch", "=", branch]],
  );

  const studentNames = students.map((s) => String(s.name));
  const studentSet = new Set(studentNames);
  // Fetch all enrollments without IN filter to avoid URL length limit on large branches
  let allEnrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    allEnrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
    );
  }
  const enrollments = allEnrollments.filter((e) => studentSet.has(String(e.student)));

  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  const monthStart = thisMonthStart();
  const bs = students;
  const active = bs.filter((s) => Number(s.enabled) === 1).length;
  const discontinued = bs.filter((s) => Number(s.enabled) === 0).length;
  const male = bs.filter((s) => String(s.gender).toLowerCase() === "male").length;
  const female = bs.filter((s) => String(s.gender).toLowerCase() === "female").length;
  const newThisMonth = bs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

  const summary = {
    branch,
    totalStudents: bs.length,
    active,
    inactive: 0,
    discontinued,
    male,
    female,
    newThisMonth,
  };

  const studentsList = students.map((s) => ({
    studentId: String(s.name),
    studentName: String(s.student_name ?? ""),
    status: Number(s.enabled) === 1 ? "Active" : "Discontinued",
    gender: String(s.gender ?? ""),
    phone: String(s.student_mobile_number ?? ""),
    guardian: String(s.custom_parent_name ?? ""),
    joiningDate: String(s.joining_date ?? ""),
    program: studentProgram.get(String(s.name)) ?? "—",
    disabilities: String(s.custom_disabilities ?? ""),
  }));

  return { summary, students: studentsList };
}

// ── Class summary ──

async function getAllClassesSummary() {
  const students = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date"],
    [],
  );
  const studentNames = students.map((s) => String(s.name));

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

  const monthStart = thisMonthStart();

  const programMap = new Map<string, { students: typeof students }>();
  for (const s of students) {
    const prog = studentProgram.get(String(s.name)) ?? "Uncategorized";
    if (!programMap.has(prog)) programMap.set(prog, { students: [] });
    programMap.get(prog)!.students.push(s);
  }

  return Array.from(programMap.entries())
    .filter(([prog]) => prog !== "Uncategorized")
    .map(([program, { students: studs }]) => {
      const active = studs.filter((s) => Number(s.enabled) === 1).length;
      const discontinued = studs.filter((s) => Number(s.enabled) === 0).length;
      const branchSet = new Set(studs.map((s) => String(s.custom_branch ?? "")).filter(Boolean));
      const male = studs.filter((s) => String(s.gender).toLowerCase() === "male").length;
      const female = studs.filter((s) => String(s.gender).toLowerCase() === "female").length;
      const newThisMonth = studs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

      return {
        program,
        totalStudents: studs.length,
        active,
        discontinued,
        branchCount: branchSet.size,
        male,
        female,
        newThisMonth,
      };
    })
    .sort((a, b) => b.totalStudents - a.totalStudents);
}

// ── Class detail ──

async function getClassDetail(program: string) {
  const students = await frappeGet(
    "Student",
    ["name", "student_name", "custom_branch", "enabled", "gender", "student_mobile_number", "custom_parent_name", "joining_date", "custom_disabilities"],
    [],
  );
  const studentNames = students.map((s) => String(s.name));

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

  const programStudents = students.filter((s) => studentProgram.get(String(s.name)) === program);
  const monthStart = thisMonthStart();

  const active = programStudents.filter((s) => Number(s.enabled) === 1).length;
  const discontinued = programStudents.filter((s) => Number(s.enabled) === 0).length;
  const branchSet = new Set(programStudents.map((s) => String(s.custom_branch ?? "")).filter(Boolean));
  const male = programStudents.filter((s) => String(s.gender).toLowerCase() === "male").length;
  const female = programStudents.filter((s) => String(s.gender).toLowerCase() === "female").length;
  const newThisMonth = programStudents.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

  const summary = {
    program,
    totalStudents: programStudents.length,
    active,
    discontinued,
    branchCount: branchSet.size,
    male,
    female,
    newThisMonth,
  };

  const studentsList = programStudents.map((s) => ({
    studentId: String(s.name),
    studentName: String(s.student_name ?? ""),
    status: Number(s.enabled) === 1 ? "Active" : "Discontinued",
    gender: String(s.gender ?? ""),
    phone: String(s.student_mobile_number ?? ""),
    guardian: String(s.custom_parent_name ?? ""),
    joiningDate: String(s.joining_date ?? ""),
    branch: String(s.custom_branch ?? "").replace("Smart Up ", ""),
    disabilities: String(s.custom_disabilities ?? ""),
  }));

  return { summary, students: studentsList };
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

    if (mode === "branch" && !detail) {
      return NextResponse.json({ data: await getAllBranchesSummary() });
    }
    if (mode === "branch" && detail) {
      return NextResponse.json({ data: await getBranchDetail(detail) });
    }
    if (mode === "class" && !detail) {
      return NextResponse.json({ data: await getAllClassesSummary() });
    }
    if (mode === "class" && detail) {
      return NextResponse.json({ data: await getClassDetail(detail) });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'branch' or 'class'" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-students] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch students report" }, { status: 500 });
  }
}
