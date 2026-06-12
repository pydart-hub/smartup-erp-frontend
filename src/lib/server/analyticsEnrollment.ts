const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;

export type BatchStudentMember = {
  student: string;
  student_name?: string;
  active?: number | string | boolean;
};

type ActiveStudentRow = {
  name: string;
  student_name?: string;
  custom_branch?: string;
};

type ProgramEnrollmentRow = {
  name?: string;
  student: string;
  program?: string;
  enrollment_date?: string;
  student_batch_name?: string;
};

type CourseEnrollmentRow = {
  student: string;
  course?: string;
  program_enrollment?: string;
  custom_batch_name?: string;
};

type StudentEnabledRow = {
  name: string;
  enabled?: number | string | boolean;
  student_name?: string;
};

function isTruthyFlag(value: number | string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false";
  return true;
}

async function fetchFrappeList<T>(auth: string, doctype: string, params: Record<string, string>): Promise<T[]> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${doctype}?${new URLSearchParams(params)}`,
    { headers: { Authorization: auth }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

async function fetchStudentGroupMembers(auth: string, batchName: string): Promise<BatchStudentMember[]> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(batchName)}`,
    { headers: { Authorization: auth }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data?.students ?? [];
}

export function normalizeProgramLabel(value?: string | null): string {
  const raw = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return "uncategorised";

  const aliases: Record<string, string> = {
    "plus one": "11th science",
    "plus two": "12th science",
    "11th state": "11th science state",
    "11th cbse": "11th science cbse",
    "12th state": "12th science state",
    "12th cbse": "12th science cbse",
  };

  const canonical = aliases[raw] ?? raw;

  return canonical
    .replace(/\bscience state\b/g, "science")
    .replace(/\bscience cbse\b/g, "science")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareAcademicPrograms(a: string, b: string): number {
  const preferredOrder = [
    "10th State",
    "10th CBSE",
    "9th State",
    "9th CBSE",
    "8th State",
    "8th CBSE",
    "7th State",
    "7th CBSE",
    "6th State",
    "6th CBSE",
    "5th State",
    "5th CBSE",
    "12th Science State",
    "12th Science CBSE",
    "11th Science State",
    "11th Science CBSE",
  ];

  const ai = preferredOrder.findIndex((item) => item.toLowerCase() === a.trim().toLowerCase());
  const bi = preferredOrder.findIndex((item) => item.toLowerCase() === b.trim().toLowerCase());

  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export async function getActiveStudentSetsForBatches(
  auth: string,
  batchNames: string[],
): Promise<{
  batchStudents: Map<string, Set<string>>;
  studentNames: Map<string, string>;
  allStudents: Set<string>;
}> {
  const batchStudents = new Map<string, Set<string>>();
  const studentNames = new Map<string, string>();

  const memberLists = await Promise.all(batchNames.map((batchName) => fetchStudentGroupMembers(auth, batchName)));

  const candidateIds = new Set<string>();
  memberLists.forEach((members, index) => {
    const batchName = batchNames[index];
    const activeStudents = new Set<string>();

    for (const member of members) {
      if (!member.student || !isTruthyFlag(member.active)) continue;
      activeStudents.add(member.student);
      candidateIds.add(member.student);
      if (member.student_name) studentNames.set(member.student, member.student_name);
    }

    batchStudents.set(batchName, activeStudents);
  });

  const enabledStudentIds = new Set<string>();
  const ids = Array.from(candidateIds);
  const chunkSize = 100;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const rows = await fetchFrappeList<StudentEnabledRow>(auth, "Student", {
      fields: JSON.stringify(["name", "enabled", "student_name"]),
      filters: JSON.stringify([["name", "in", chunk]]),
      limit_page_length: String(chunk.length + 5),
    });

    for (const row of rows) {
      if (row.name && isTruthyFlag(row.enabled)) {
        enabledStudentIds.add(row.name);
        if (row.student_name) studentNames.set(row.name, row.student_name);
      }
    }
  }

  const allStudents = new Set<string>();
  for (const [batchName, students] of batchStudents.entries()) {
    const filtered = new Set<string>();
    for (const studentId of students) {
      if (!enabledStudentIds.has(studentId)) continue;
      filtered.add(studentId);
      allStudents.add(studentId);
    }
    batchStudents.set(batchName, filtered);
  }

  return { batchStudents, studentNames, allStudents };
}

export async function getActiveStudentsByLatestProgram(auth: string): Promise<
  Array<{ student: string; student_name: string; branch: string; program: string; normalized_program: string; batch_name: string; program_enrollment: string }>
> {
  const activeStudents = await fetchFrappeList<ActiveStudentRow>(auth, "Student", {
    fields: JSON.stringify(["name", "student_name", "custom_branch"]),
    filters: JSON.stringify([["enabled", "=", 1]]),
    limit_page_length: "10000",
  });

  const studentMap = new Map(
    activeStudents
      .filter((row) => row.name)
      .map((row) => [
        row.name,
        {
          student: row.name,
          student_name: row.student_name ?? row.name,
          branch: row.custom_branch ?? "",
        },
      ]),
  );

  const enrollments = await fetchFrappeList<ProgramEnrollmentRow>(auth, "Program%20Enrollment", {
    fields: JSON.stringify(["name", "student", "program", "enrollment_date", "student_batch_name"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    order_by: "enrollment_date desc",
    limit_page_length: "20000",
  });

  const latestEnrollmentByStudent = new Map<string, { program: string; batch_name: string; program_enrollment: string }>();
  for (const row of enrollments) {
    if (!row.student || latestEnrollmentByStudent.has(row.student) || !studentMap.has(row.student)) continue;
    latestEnrollmentByStudent.set(row.student, {
      program: row.program?.trim() || "Uncategorized",
      batch_name: row.student_batch_name?.trim() || "",
      program_enrollment: row.name?.trim() || "",
    });
  }

  return Array.from(studentMap.values()).map((student) => {
    const enrollment = latestEnrollmentByStudent.get(student.student);
    const program = enrollment?.program ?? "Uncategorized";
    return {
      ...student,
      program,
      normalized_program: normalizeProgramLabel(program),
      batch_name: enrollment?.batch_name ?? "",
      program_enrollment: enrollment?.program_enrollment ?? "",
    };
  });
}

export async function getActiveCourseEnrollmentsForLatestPrograms(auth: string): Promise<
  Array<{
    student: string;
    course: string;
    program: string;
    normalized_program: string;
    branch: string;
    batch_name: string;
    batch_group_name: string;
    program_enrollment: string;
  }>
> {
  const activeStudents = await getActiveStudentsByLatestProgram(auth);
  const latestProgramByEnrollment = new Map(
    activeStudents
      .filter((student) => student.program_enrollment)
      .map((student) => [
        student.program_enrollment,
        {
          student: student.student,
          program: student.program,
          normalized_program: student.normalized_program,
          branch: student.branch,
          batch_name: student.batch_name,
        },
      ]),
  );

  const courseEnrollments = await fetchFrappeList<CourseEnrollmentRow>(auth, "Course%20Enrollment", {
    fields: JSON.stringify(["student", "course", "program_enrollment", "custom_batch_name"]),
    limit_page_length: "50000",
  });

  return courseEnrollments
    .map((row) => {
      const programRef = row.program_enrollment?.trim() || "";
      const latest = latestProgramByEnrollment.get(programRef);
      const course = row.course?.trim() || "";
      if (!latest || !row.student || !course) return null;
      return {
        student: row.student,
        course,
        program: latest.program,
        normalized_program: latest.normalized_program,
        branch: latest.branch,
        batch_name: latest.batch_name,
        batch_group_name: row.custom_batch_name?.trim() || "",
        program_enrollment: programRef,
      };
    })
    .filter((row): row is {
      student: string;
      course: string;
      program: string;
      normalized_program: string;
      branch: string;
      batch_name: string;
      batch_group_name: string;
      program_enrollment: string;
    } => Boolean(row));
}
