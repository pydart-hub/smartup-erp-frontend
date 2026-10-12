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

// ── Helpers ──

function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── Branch summary ──

export async function getAllBranchesSummary(fromDate?: string, toDate?: string) {
  const companies = await frappeGet("Company", ["name"], [], "name asc");
  const branches = companies.map((c) => String(c.name)).filter((n) => n !== "Smart Up");

  const allStudents = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date"],
    [],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  // Fetch program enrollments to resolve student plan types
  const enrollments = await frappeGet(
    "Program Enrollment",
    ["student", "custom_plan", "docstatus", "enrollment_date"],
    [],
    "enrollment_date desc",
  );

  enrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

  const studentPlanMap = new Map<string, string>();
  for (const e of enrollments) {
    const student = String(e.student);
    const plan = String(e.custom_plan ?? "").trim();
    if (student && plan && !studentPlanMap.has(student)) {
      studentPlanMap.set(student, plan);
    }
  }

  const monthStart = thisMonthStart();

  return branches.map((branch) => {
    const bs = students.filter((s) => s.custom_branch === branch);
    const active = bs.filter((s) => Number(s.enabled) === 1).length;
    const discontinued = bs.filter((s) => Number(s.enabled) === 0).length;
    const male = bs.filter((s) => String(s.gender).toLowerCase() === "male").length;
    const female = bs.filter((s) => String(s.gender).toLowerCase() === "female").length;
    const newThisMonth = bs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

    // Count plan types for ACTIVE students in this branch
    const activeStudentsInBranch = bs.filter((s) => Number(s.enabled) === 1);
    let basic = 0;
    let intermediate = 0;
    let advanced = 0;
    for (const s of activeStudentsInBranch) {
      const plan = studentPlanMap.get(String(s.name)) ?? "";
      if (plan.toLowerCase() === "basic") basic++;
      else if (plan.toLowerCase() === "intermediate") intermediate++;
      else if (plan.toLowerCase() === "advanced") advanced++;
    }

    return {
      branch,
      totalStudents: bs.length,
      active,
      inactive: 0,
      discontinued,
      male,
      female,
      newThisMonth,
      basic,
      intermediate,
      advanced,
    };
  });
}

// ── Branch detail ──

export async function getBranchDetail(branch: string, fromDate?: string, toDate?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "student_name", "enabled", "gender", "student_mobile_number", "custom_parent_name", "joining_date", "custom_disabilities"],
    [["custom_branch", "=", branch]],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const studentNames = students.map((s) => String(s.name));
  const studentSet = new Set(studentNames);
  // Fetch all enrollments without IN filter to avoid URL length limit on large branches
  let allEnrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    allEnrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  // Sort enrollments: active (1) first, draft (0) second, canceled (2) third
  allEnrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

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

export async function getAllClassesSummary(fromDate?: string, toDate?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date"],
    [],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "custom_plan", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  enrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

  const studentProgram = new Map<string, string>();
  const studentPlan = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
    if (!studentPlan.has(sid)) studentPlan.set(sid, String(e.custom_plan ?? ""));
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

      // Count plan types for ACTIVE students in this program (class)
      const activeStudentsInClass = studs.filter((s) => Number(s.enabled) === 1);
      let basic = 0;
      let intermediate = 0;
      let advanced = 0;
      for (const s of activeStudentsInClass) {
        const plan = studentPlan.get(String(s.name)) ?? "";
        if (plan.toLowerCase() === "basic") basic++;
        else if (plan.toLowerCase() === "intermediate") intermediate++;
        else if (plan.toLowerCase() === "advanced") advanced++;
      }

      return {
        program,
        totalStudents: studs.length,
        active,
        discontinued,
        branchCount: branchSet.size,
        male,
        female,
        newThisMonth,
        basic,
        intermediate,
        advanced,
      };
    })
    .sort((a, b) => b.totalStudents - a.totalStudents);
}

// ── Class detail ──

export async function getClassDetail(program: string, fromDate?: string, toDate?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "student_name", "custom_branch", "enabled", "gender", "student_mobile_number", "custom_parent_name", "joining_date", "custom_disabilities"],
    [],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  enrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

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

// ── School summary & detail ──

function normalizeSchoolName(raw?: unknown): string {
  const str = String(raw ?? "").trim();
  if (!str) return "Not Specified";
  // Collapse duplicate whitespace
  return str.replace(/\s+/g, " ");
}

export async function getAllSchoolClassesSummary(fromDate?: string, toDate?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date", "custom_school_name"],
    [],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "custom_plan", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  enrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

  const studentProgram = new Map<string, string>();
  const studentPlan = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program ?? ""));
    if (!studentPlan.has(sid)) studentPlan.set(sid, String(e.custom_plan ?? ""));
  }

  const monthStart = thisMonthStart();

  const programMap = new Map<string, { students: typeof students }>();
  for (const s of students) {
    const prog = studentProgram.get(String(s.name)) ?? "Uncategorized";
    if (!programMap.has(prog)) programMap.set(prog, { students: [] });
    programMap.get(prog)!.students.push(s);
  }

  const CLASS_ORDER = [
    "8th State",
    "9th State",
    "10th State",
    "10th CBSE",
    "11th Science State",
    "11th Commerce State",
    "12th Science State",
    "12th Commerce State",
  ];

  return Array.from(programMap.entries())
    .filter(([prog]) => prog !== "Uncategorized")
    .map(([program, { students: studs }]) => {
      const active = studs.filter((s) => Number(s.enabled) === 1).length;
      const discontinued = studs.filter((s) => Number(s.enabled) === 0).length;
      const branchSet = new Set(studs.map((s) => String(s.custom_branch ?? "")).filter(Boolean));
      const schoolSet = new Set(
        studs
          .map((s) => normalizeSchoolName(s.custom_school_name))
          .filter((name) => name !== "Not Specified"),
      );
      const male = studs.filter((s) => String(s.gender).toLowerCase() === "male").length;
      const female = studs.filter((s) => String(s.gender).toLowerCase() === "female").length;
      const newThisMonth = studs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

      const activeStudentsInClass = studs.filter((s) => Number(s.enabled) === 1);
      let basic = 0;
      let intermediate = 0;
      let advanced = 0;
      for (const s of activeStudentsInClass) {
        const plan = studentPlan.get(String(s.name)) ?? "";
        if (plan.toLowerCase() === "basic") basic++;
        else if (plan.toLowerCase() === "intermediate") intermediate++;
        else if (plan.toLowerCase() === "advanced") advanced++;
      }

      return {
        program,
        totalStudents: studs.length,
        active,
        discontinued,
        schoolCount: schoolSet.size,
        branchCount: branchSet.size,
        male,
        female,
        newThisMonth,
        basic,
        intermediate,
        advanced,
      };
    })
    .sort((a, b) => {
      const ai = CLASS_ORDER.indexOf(a.program);
      const bi = CLASS_ORDER.indexOf(b.program);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.totalStudents - a.totalStudents;
    });
}

export async function getAllSchoolsSummary(fromDate?: string, toDate?: string, program?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled", "gender", "joining_date", "custom_school_name"],
    [],
  );

  let students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "custom_plan", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  enrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

  const studentProgram = new Map<string, string>();
  const studentPlan = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program ?? ""));
    if (!studentPlan.has(sid)) studentPlan.set(sid, String(e.custom_plan ?? ""));
  }

  if (program) {
    students = students.filter((s) => studentProgram.get(String(s.name)) === program);
  }

  const monthStart = thisMonthStart();

  const schoolMap = new Map<string, { displayName: string; students: typeof students }>();
  for (const s of students) {
    const norm = normalizeSchoolName(s.custom_school_name);
    const key = norm.toLowerCase();
    if (!schoolMap.has(key)) {
      schoolMap.set(key, { displayName: norm, students: [] });
    }
    schoolMap.get(key)!.students.push(s);
  }

  return Array.from(schoolMap.values())
    .map(({ displayName, students: studs }) => {
      const active = studs.filter((s) => Number(s.enabled) === 1).length;
      const discontinued = studs.filter((s) => Number(s.enabled) === 0).length;
      const branchSet = new Set(studs.map((s) => String(s.custom_branch ?? "")).filter(Boolean));
      const male = studs.filter((s) => String(s.gender).toLowerCase() === "male").length;
      const female = studs.filter((s) => String(s.gender).toLowerCase() === "female").length;
      const newThisMonth = studs.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

      const activeStudentsInSchool = studs.filter((s) => Number(s.enabled) === 1);
      let basic = 0;
      let intermediate = 0;
      let advanced = 0;
      for (const s of activeStudentsInSchool) {
        const plan = studentPlan.get(String(s.name)) ?? "";
        if (plan.toLowerCase() === "basic") basic++;
        else if (plan.toLowerCase() === "intermediate") intermediate++;
        else if (plan.toLowerCase() === "advanced") advanced++;
      }

      return {
        school: displayName,
        totalStudents: studs.length,
        active,
        discontinued,
        branchCount: branchSet.size,
        male,
        female,
        newThisMonth,
        basic,
        intermediate,
        advanced,
      };
    })
    .sort((a, b) => {
      // Put "Not Specified" at the very bottom
      if (a.school === "Not Specified") return 1;
      if (b.school === "Not Specified") return -1;
      return b.totalStudents - a.totalStudents;
    });
}

export async function getSchoolDetail(schoolName: string, fromDate?: string, toDate?: string, program?: string) {
  const allStudents = await frappeGet(
    "Student",
    ["name", "student_name", "custom_branch", "enabled", "gender", "student_mobile_number", "custom_parent_name", "joining_date", "custom_school_name", "custom_disabilities"],
    [],
  );

  const students = allStudents.filter((s) => {
    const jd = String(s.joining_date ?? "");
    if (fromDate && jd < fromDate) return false;
    if (toDate && jd > toDate) return false;
    return true;
  });

  const targetNormKey = schoolName.trim().toLowerCase();
  let schoolStudents = students.filter((s) => {
    const norm = normalizeSchoolName(s.custom_school_name).toLowerCase();
    return norm === targetNormKey;
  });

  const studentNames = schoolStudents.map((s) => String(s.name));
  const studentSet = new Set(studentNames);

  let allEnrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    allEnrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program", "custom_plan", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    );
  }

  allEnrollments.sort((a, b) => {
    const statusA = Number(a.docstatus ?? 0);
    const statusB = Number(b.docstatus ?? 0);
    const prio = (status: number) => (status === 1 ? 0 : status === 0 ? 1 : 2);
    if (prio(statusA) !== prio(statusB)) return prio(statusA) - prio(statusB);
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });

  const enrollments = allEnrollments.filter((e) => studentSet.has(String(e.student)));

  const studentProgram = new Map<string, string>();
  const studentPlan = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
    if (!studentPlan.has(sid)) studentPlan.set(sid, String(e.custom_plan ?? ""));
  }

  if (program) {
    schoolStudents = schoolStudents.filter((s) => studentProgram.get(String(s.name)) === program);
  }

  const monthStart = thisMonthStart();
  const active = schoolStudents.filter((s) => Number(s.enabled) === 1).length;
  const discontinued = schoolStudents.filter((s) => Number(s.enabled) === 0).length;
  const branchSet = new Set(schoolStudents.map((s) => String(s.custom_branch ?? "")).filter(Boolean));
  const male = schoolStudents.filter((s) => String(s.gender).toLowerCase() === "male").length;
  const female = schoolStudents.filter((s) => String(s.gender).toLowerCase() === "female").length;
  const newThisMonth = schoolStudents.filter((s) => String(s.joining_date ?? "") >= monthStart).length;

  let basic = 0;
  let intermediate = 0;
  let advanced = 0;
  for (const s of schoolStudents.filter((s) => Number(s.enabled) === 1)) {
    const plan = studentPlan.get(String(s.name)) ?? "";
    if (plan.toLowerCase() === "basic") basic++;
    else if (plan.toLowerCase() === "intermediate") intermediate++;
    else if (plan.toLowerCase() === "advanced") advanced++;
  }

  const summary = {
    school: schoolName,
    totalStudents: schoolStudents.length,
    active,
    discontinued,
    branchCount: branchSet.size,
    male,
    female,
    newThisMonth,
    basic,
    intermediate,
    advanced,
  };

  const studentsList = schoolStudents.map((s) => ({
    studentId: String(s.name),
    studentName: String(s.student_name ?? ""),
    status: Number(s.enabled) === 1 ? "Active" : "Discontinued",
    gender: String(s.gender ?? ""),
    phone: String(s.student_mobile_number ?? ""),
    guardian: String(s.custom_parent_name ?? ""),
    joiningDate: String(s.joining_date ?? ""),
    branch: String(s.custom_branch ?? "").replace("Smart Up ", ""),
    program: studentProgram.get(String(s.name)) ?? "—",
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
    const program = body.program ? String(body.program) : undefined;
    const fromDate = body.fromDate ? String(body.fromDate) : undefined;
    const toDate = body.toDate ? String(body.toDate) : undefined;

    if (mode === "branch" && !detail) {
      return NextResponse.json({ data: await getAllBranchesSummary(fromDate, toDate) });
    }
    if (mode === "branch" && detail) {
      return NextResponse.json({ data: await getBranchDetail(detail, fromDate, toDate) });
    }
    if (mode === "class" && !detail) {
      return NextResponse.json({ data: await getAllClassesSummary(fromDate, toDate) });
    }
    if (mode === "class" && detail) {
      return NextResponse.json({ data: await getClassDetail(detail, fromDate, toDate) });
    }
    if (mode === "school-classes") {
      return NextResponse.json({ data: await getAllSchoolClassesSummary(fromDate, toDate) });
    }
    if (mode === "school" && !detail) {
      return NextResponse.json({ data: await getAllSchoolsSummary(fromDate, toDate, program) });
    }
    if (mode === "school" && detail) {
      return NextResponse.json({ data: await getSchoolDetail(detail, fromDate, toDate, program) });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'branch', 'class', 'school-classes', or 'school'" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-students] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch students report" }, { status: 500 });
  }
}
