/**
 * enrollment.ts
 * Handles the two-step enrollment workflow:
 *   1. Program Enrollment  – links Student ↔ Program ↔ Academic Year
 *   2. Course Enrollment   – links Program Enrollment ↔ Course ↔ Student Group
 *   3. Student Group membership – adds the student row to a Student Group (batch)
 *
 * Real Frappe field names from live schema inspection 2026-02-23.
 */

import apiClient from "./client";
import {
  getTuitionFeeItem,
  createSalesOrder,
  submitSalesOrder,
  getItemPriceRate,
} from "./sales";
import type { SalesOrderFormData } from "@/lib/types/sales";
import type {
  ProgramEnrollment,
  ProgramEnrollmentFormData,
  CourseEnrollment,
  StudentGroup,
  StudentGroupMember,
} from "@/lib/types/student";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";

// ─────────────────────────────────────────────────────────────
// Program Enrollment
// ─────────────────────────────────────────────────────────────

/** All enrollments, optionally filtered by student / program / academic_year */
export async function getProgramEnrollments(params?: {
  student?: string;
  program?: string;
  academic_year?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<ProgramEnrollment>> {
  const filters: string[][] = [];
  if (params?.student) filters.push(["student", "=", params.student]);
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);

  const fields = JSON.stringify([
    "name", "student", "student_name", "program", "academic_year",
    "enrollment_date", "student_batch_name", "docstatus",
    "custom_program_abb", "custom_student_srr",
  ]);

  const query = new URLSearchParams({
    fields,
    limit_page_length: String(params?.limit_page_length ?? 100),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });

  const { data } = await apiClient.get(`/resource/Program Enrollment?${query}`);
  return data;
}

/** Single Program Enrollment by name */
export async function getProgramEnrollment(name: string): Promise<FrappeSingleResponse<ProgramEnrollment>> {
  const { data } = await apiClient.get(`/resource/Program Enrollment/${encodeURIComponent(name)}`);
  return data;
}

/**
 * Create a new Program Enrollment (saves as draft, then submits).
 * Submission is required so that Fee records can reference it.
 */
export async function createProgramEnrollment(
  payload: ProgramEnrollmentFormData
): Promise<ProgramEnrollment> {
  // 1. Save as draft
  const { data: draft } = await apiClient.post("/resource/Program Enrollment", payload);
  const docName: string = draft.data.name;

  // 2. If a Student Group name was provided, fill custom_batch_name on all
  //    auto-created Course Enrollment children before submitting.
  //    Frappe auto-creates Course Enrollments on PE save; they are mandatory
  //    for the `custom_batch_name` field before docstatus can be set to 1.
  if (payload.student_group_name) {
    try {
      const ceQuery = new URLSearchParams({
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["program_enrollment", "=", docName]]),
        limit_page_length: "50",
      });
      const { data: ceList } = await apiClient.get(`/resource/Course Enrollment?${ceQuery}`);
      const courseEnrollments: { name: string }[] = ceList.data ?? [];
      await Promise.all(
        courseEnrollments.map((ce) =>
          apiClient.put(`/resource/Course Enrollment/${encodeURIComponent(ce.name)}`, {
            custom_batch_name: payload.student_group_name,
          }).catch((e) => console.warn(`[createProgramEnrollment] Could not set custom_batch_name on ${ce.name}:`, e))
        )
      );
    } catch (ceErr) {
      console.warn("[createProgramEnrollment] Could not patch Course Enrollments:", ceErr);
    }
  }

  // 3. Submit (docstatus 0 → 1)
  await apiClient.put(`/resource/Program Enrollment/${encodeURIComponent(docName)}`, {
    docstatus: 1,
  });

  // 4. Return the submitted document
  const { data: submitted } = await apiClient.get(
    `/resource/Program Enrollment/${encodeURIComponent(docName)}`
  );
  return submitted.data;
}

/** Cancel a Program Enrollment */
export async function cancelProgramEnrollment(name: string): Promise<void> {
  await apiClient.put(`/resource/Program Enrollment/${encodeURIComponent(name)}`, {
    docstatus: 2,
  });
}

// ─────────────────────────────────────────────────────────────
// Course Enrollment
// ─────────────────────────────────────────────────────────────

export async function getCourseEnrollments(params?: {
  student?: string;
  program_enrollment?: string;
}): Promise<FrappeListResponse<CourseEnrollment>> {
  const filters: string[][] = [];
  if (params?.student) filters.push(["student", "=", params.student]);
  if (params?.program_enrollment) filters.push(["program_enrollment", "=", params.program_enrollment]);

  const query = new URLSearchParams({
    fields: JSON.stringify([
      "name", "student", "student_name", "course", "program_enrollment",
      "enrollment_date", "custom_batch", "custom_batch_name",
    ]),
    limit_page_length: "100",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });

  const { data } = await apiClient.get(`/resource/Course Enrollment?${query}`);
  return data;
}

export async function createCourseEnrollment(payload: {
  program_enrollment: string;
  course: string;
  student: string;
  enrollment_date: string;
  custom_batch_name?: string; // Student Group name e.g. "CHL-10th-25-1"
}): Promise<FrappeSingleResponse<CourseEnrollment>> {
  const { data } = await apiClient.post("/resource/Course Enrollment", payload);
  return data;
}

// ─────────────────────────────────────────────────────────────
// Student Group  (the actual batch container)
// Naming convention: {BRANCH_ABBR}-{PROG_ABB}-{YY}-{SEQ}
// e.g. CHL-10th-25-1
// ─────────────────────────────────────────────────────────────

/** Get all Student Groups, optionally by branch / program / batch code */
export async function getStudentGroups(params?: {
  custom_branch?: string;   // Company name e.g. "Smart Up Chullickal"
  program?: string;         // Program name e.g. "10th Grade"
  batch?: string;           // Batch code e.g. "CHL-25"
  academic_year?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<StudentGroup>> {
  const filters: string[][] = [["group_based_on", "=", "Batch"]];
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.batch) filters.push(["batch", "=", params.batch]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);

  const query = new URLSearchParams({
    fields: JSON.stringify([
      "name", "student_group_name", "academic_year", "group_based_on",
      "program", "batch", "max_strength", "disabled", "custom_branch",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: String(params?.limit_page_length ?? 200),
  });

  const { data } = await apiClient.get(`/resource/Student Group?${query}`);
  return data;
}

/** Get one Student Group with its full students & instructors child tables */
export async function getStudentGroup(name: string): Promise<FrappeSingleResponse<StudentGroup>> {
  const { data } = await apiClient.get(`/resource/Student Group/${encodeURIComponent(name)}`);
  return data;
}

/** Add a student to a Student Group (appends to the `students` child table) */
export async function addStudentToGroup(
  groupName: string,
  studentId: string,
  studentName: string
): Promise<void> {
  // Fetch current group to get existing students list
  const { data: current } = await apiClient.get(
    `/resource/Student Group/${encodeURIComponent(groupName)}`
  );
  const existing: StudentGroupMember[] = current.data.students || [];

  // Avoid duplicate
  if (existing.some((m) => m.student === studentId)) return;

  const updatedStudents: StudentGroupMember[] = [
    ...existing,
    { student: studentId, student_name: studentName, active: 1 },
  ];

  await apiClient.put(`/resource/Student Group/${encodeURIComponent(groupName)}`, {
    students: updatedStudents,
  });
}

/** Remove a student from a Student Group */
export async function removeStudentFromGroup(
  groupName: string,
  studentId: string
): Promise<void> {
  const { data: current } = await apiClient.get(
    `/resource/Student Group/${encodeURIComponent(groupName)}`
  );
  const updated = (current.data.students as StudentGroupMember[]).filter(
    (m) => m.student !== studentId
  );
  await apiClient.put(`/resource/Student Group/${encodeURIComponent(groupName)}`, {
    students: updated,
  });
}

// ─────────────────────────────────────────────────────────────
// Reference data helpers
// ─────────────────────────────────────────────────────────────

/** Available Programs (class levels) */
export async function getPrograms(): Promise<{ name: string; program_abbreviation?: string }[]> {
  const { data } = await apiClient.get(
    `/resource/Program?fields=["name","program_abbreviation"]&limit=100&order_by=name`
  );
  return data.data;
}

/** Academic Years
 * Fetches from the Academic Year doctype AND scans actual Student Group data
 * so years that have real batches (e.g. 2025-2026) always appear in the
 * dropdown even if the Frappe Academic Year doctype only has future years.
 */
export async function getAcademicYears(): Promise<
  { name: string; year_start_date: string; year_end_date: string }[]
> {
  const [ayRes, sgRes] = await Promise.allSettled([
    apiClient.get(
      `/resource/Academic Year?fields=["name","year_start_date","year_end_date"]&limit=20&order_by=year_start_date desc`
    ),
    apiClient.get(
      `/resource/Student Group?fields=["academic_year"]&filters=[["group_based_on","=","Batch"]]&limit_page_length=0`
    ),
  ]);

  const fromDoctype: { name: string; year_start_date: string; year_end_date: string }[] =
    ayRes.status === "fulfilled" ? (ayRes.value.data.data ?? []) : [];

  // Collect distinct academic_year values from actual batch data
  const batchYears: string[] =
    sgRes.status === "fulfilled"
      ? [...new Set(
          (sgRes.value.data.data as { academic_year: string }[])
            .map((r) => r.academic_year)
            .filter(Boolean)
        )]
      : [];

  // Merge: add batch years that are not already in the doctype list
  const existing = new Set(fromDoctype.map((a) => a.name));
  for (const yr of batchYears) {
    if (!existing.has(yr)) {
      fromDoctype.push({ name: yr, year_start_date: "", year_end_date: "" });
    }
  }

  // Sort descending by name (e.g. "2026-2027" > "2025-2026")
  fromDoctype.sort((a, b) => b.name.localeCompare(a.name));

  return fromDoctype;
}

/** Student Batch Names (the branch-level batch codes like CHL-25, GCC-25) */
export async function getStudentBatchNames(): Promise<{ name: string }[]> {
  const { data } = await apiClient.get(`/resource/Student Batch Name?limit=100`);
  return data.data;
}

/** Get the next available SRR ID for a branch by incrementing the last one */
export async function getNextSrrId(branch: string): Promise<string> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["custom_srr_id"]),
    filters: JSON.stringify([["custom_branch", "=", branch]]),
    order_by: "CAST(custom_srr_id AS UNSIGNED) desc",
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Student?${query}`);
  const rows: { custom_srr_id: string }[] = data.data ?? [];
  if (rows.length === 0) return "001";
  const last = parseInt(rows[0].custom_srr_id, 10);
  if (isNaN(last)) return "001";
  // Zero-pad to at least 3 digits (e.g. 2 → "002", 15 → "015", 100 → "100")
  const padLen = Math.max(3, rows[0].custom_srr_id.length);
  return String(last + 1).padStart(padLen, "0");
}

/** Companies used as Branches */
export async function getBranches(): Promise<{ name: string; abbr: string }[]> {
  const { data } = await apiClient.get(
    `/resource/Company?fields=["name","abbr"]&limit=50&order_by=name`
  );
  return data.data;
}

/**
 * Returns a Map<batchCode, enrolledCount> for ALL submitted Program Enrollments.
 * Used by the dashboard batch overview to show current vs max capacity.
 * When `company` is provided, only counts enrollments whose student_batch_name
 * belongs to Student Groups with that custom_branch.
 */
export async function getBatchEnrollmentCounts(company?: string, academic_year?: string): Promise<Map<string, number>> {
  // If company or academic_year is provided, first get the Student Group names
  // for that branch/year so we can filter enrollment counts to only relevant batches.
  let allowedBatches: Set<string> | null = null;
  if (company || academic_year) {
    const sgFilters: string[][] = [["group_based_on", "=", "Batch"]];
    if (company) sgFilters.push(["custom_branch", "=", company]);
    if (academic_year) sgFilters.push(["academic_year", "=", academic_year]);
    const { data: sgRes } = await apiClient.get(
      `/resource/Student Group?fields=["name"]&filters=${JSON.stringify(sgFilters)}&limit_page_length=0`
    );
    allowedBatches = new Set(
      (sgRes.data as { name: string }[]).map((sg) => sg.name)
    );
  }

  const { data } = await apiClient.get(
    `/resource/Program Enrollment?fields=["student_batch_name"]&filters=${JSON.stringify([["docstatus", "=", "1"]])}&limit_page_length=0`
  );
  const countMap = new Map<string, number>();
  (data.data as { student_batch_name: string }[]).forEach((pe) => {
    if (pe.student_batch_name) {
      // If we have a branch filter, only count batches that belong to this branch
      if (allowedBatches && !allowedBatches.has(pe.student_batch_name)) return;
      countMap.set(pe.student_batch_name, (countMap.get(pe.student_batch_name) ?? 0) + 1);
    }
  });
  return countMap;
}

/**
 * Count of Program Enrollments (= enrolled students) for a given year + branch.
 * Since students don't have an academic_year field, we count via Program Enrollment.
 * If company is provided, only counts enrollments in batches for that branch.
 */
export async function getEnrolledStudentCount(
  company?: string,
  academic_year?: string
): Promise<number> {
  const filters: string[][] = [["docstatus", "=", "1"]];
  if (academic_year) filters.push(["academic_year", "=", academic_year]);

  if (company) {
    // Get batch names for this branch (+ optionally year) to filter PE
    const sgFilters: string[][] = [["group_based_on", "=", "Batch"], ["custom_branch", "=", company]];
    if (academic_year) sgFilters.push(["academic_year", "=", academic_year]);
    const { data: sgRes } = await apiClient.get(
      `/resource/Student Group?fields=["name"]&filters=${JSON.stringify(sgFilters)}&limit_page_length=0`
    );
    const batchNames = (sgRes.data as { name: string }[]).map((sg) => sg.name);
    if (batchNames.length === 0) return 0;
    (filters as unknown as unknown[][]).push(["student_batch_name", "in", batchNames]);
  }

  const query = new URLSearchParams({
    fields: JSON.stringify(["count(name) as cnt"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Program Enrollment?${query}`);
  return data.data?.[0]?.cnt ?? 0;
}

/**
 * Recent Program Enrollments for a given year + branch, ordered by creation desc.
 * Used for the "Recently Admitted" activity feed on the dashboard.
 */
export interface RecentEnrollment {
  name: string;
  student: string;
  student_name: string;
  program: string;
  academic_year: string;
  student_batch_name: string;
  enrollment_date: string;
  creation: string;
}

export async function getRecentEnrollments(params?: {
  company?: string;
  academic_year?: string;
  limit?: number;
}): Promise<RecentEnrollment[]> {
  const filters: string[][] = [["docstatus", "=", "1"]];
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);

  if (params?.company) {
    const sgFilters: string[][] = [["group_based_on", "=", "Batch"], ["custom_branch", "=", params.company]];
    if (params?.academic_year) sgFilters.push(["academic_year", "=", params.academic_year]);
    const { data: sgRes } = await apiClient.get(
      `/resource/Student Group?fields=["name"]&filters=${JSON.stringify(sgFilters)}&limit_page_length=0`
    );
    const batchNames = (sgRes.data as { name: string }[]).map((sg) => sg.name);
    if (batchNames.length === 0) return [];
    (filters as unknown as unknown[][]).push(["student_batch_name", "in", batchNames]);
  }

  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "student", "student_name", "program", "academic_year", "student_batch_name", "enrollment_date", "creation"]),
    filters: JSON.stringify(filters),
    limit_page_length: String(params?.limit ?? 10),
    order_by: "creation desc",
  });
  const { data } = await apiClient.get(`/resource/Program Enrollment?${query}`);
  return data.data ?? [];
}

/**
 * Admits a new student: creates Student record, Program Enrollment,
 * + adds student to the right Student Group (batch).
 *
 * Returns { student, programEnrollment }
 */
export async function admitStudent(form: {
  // Student
  first_name: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  student_email_id?: string;
  student_mobile_number?: string;
  joining_date?: string;
  custom_branch: string;         // Company name
  custom_srr_id?: string;        // SRR ID (auto-generated if not provided)
  // Academic
  program: string;               // Program name
  academic_year: string;
  student_batch_name?: string;   // Batch code (Student Batch Name)
  studentGroupName?: string;     // Student Group to enroll into e.g. "CHL-10th-25-1"
  enrollment_date: string;
  // Guardian
  guardian_name: string;
  guardian_email: string;
  guardian_mobile: string;
  guardian_relation: string;
  guardian_password: string;
  // Payment / Fee
  fee_structure?: string;        // resolved Fee Structure name e.g. "SU ERV-8th State-Basic-4"
  custom_plan?: string;          // "Basic" | "Intermediate" | "Advanced"
  custom_no_of_instalments?: string; // "1" | "4" | "6" | "8"
  custom_mode_of_payment?: string;   // "Cash" | "Online"
  // Instalment schedule (from feeSchedule generator)
  instalmentSchedule?: { amount: number; dueDate: string; label: string }[];
}): Promise<{
  student: { name: string; student_name: string };
  programEnrollment: ProgramEnrollment;
  salesOrder?: string;
  invoices?: string[];
  warnings: string[];
}> {

  // Step 1 — Create Guardian
  const { data: guardianRes } = await apiClient.post("/resource/Guardian", {
    guardian_name: form.guardian_name,
    email_address: form.guardian_email,
    mobile_number: form.guardian_mobile,
  });
  const guardianName: string = guardianRes.data.name;

  // Step 1.5 — Create Frappe User with "Parent" role for guardian login
  try {
    const parentUserRes = await fetch("/api/auth/create-parent-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: form.guardian_email,
        full_name: form.guardian_name,
        password: form.guardian_password,
      }),
    });
    if (!parentUserRes.ok) {
      const errBody = await parentUserRes.json().catch(() => ({}));
      console.warn(
        "[admitStudent] Parent user creation returned error:",
        parentUserRes.status,
        errBody
      );
    }
  } catch (userError) {
    // Non-blocking — guardian + student flow continues even if user creation fails
    console.warn("[admitStudent] Parent user creation failed (non-blocking):", userError);
  }

  // Step 2 — Create Student (linked to guardian)
  // If the caller provided a custom_srr_id, use it; otherwise auto-generate.
  let srrId = form.custom_srr_id || await getNextSrrId(form.custom_branch);

  // Helper to build the student payload for a given SRR ID
  function buildStudentPayload(srrIdVal: string) {
    const namePart = [form.first_name, form.last_name]
      .filter(Boolean)
      .join("")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const autoEmail = `${namePart}${srrIdVal}@dummy.com`;

    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      student_email_id: form.student_email_id || autoEmail,
      joining_date: form.joining_date || form.enrollment_date,
      custom_branch: form.custom_branch,
      custom_srr_id: srrIdVal,
      enabled: 1,
      guardians: [
        {
          doctype: "Student Guardians",
          guardian: guardianName,
          guardian_name: form.guardian_name,
          relation: form.guardian_relation,
        },
      ],
    };
    if (form.middle_name) payload.middle_name = form.middle_name;
    if (form.blood_group) payload.blood_group = form.blood_group;
    if (form.student_mobile_number) payload.student_mobile_number = form.student_mobile_number;
    return payload;
  }

  // Try to create the student; on DuplicateEntryError (SRR ID collision), auto-increment SRR ID and retry up to 5 times
  const MAX_RETRIES = 5;
  let student: { name: string; student_name: string } | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data: studentRes } = await apiClient.post("/resource/Student", buildStudentPayload(srrId));
      student = studentRes.data as { name: string; student_name: string };
      break; // success
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, unknown>; status?: number } })?.response;
      const excType = String(errData?.data?.exc_type ?? "");
      const excMsg = String(errData?.data?.exception ?? "");

      // Email already taken — not fixable by changing the SRR ID, throw immediately
      if (excType.includes("UniqueValidationError") || excMsg.includes("student_email_id") || excMsg.includes("Duplicate entry") && excMsg.includes("student_email_id")) {
        throw Object.assign(new Error(
          `The email address "${form.student_email_id}" is already registered to another student. Please use a different email.`
        ), { __type: "duplicate_email" });
      }

      const isDuplicate = errData?.status === 409 ||
        excType.includes("DuplicateEntryError") ||
        excMsg.includes("DuplicateEntryError");
      if (isDuplicate && attempt < MAX_RETRIES) {
        // Increment the SRR ID and retry
        const num = parseInt(srrId, 10);
        const padLen = Math.max(3, srrId.length);
        srrId = String((isNaN(num) ? 0 : num) + 1).padStart(padLen, "0");
        console.warn(`[admitStudent] SRR ID collision, retrying with ${srrId} (attempt ${attempt + 2})`);
        continue;
      }
      // Not a retryable error or ran out of retries — re-throw
      throw err;
    }
  }
  if (!student) {
    throw new Error(`Failed to create student — SRR ID collision after ${MAX_RETRIES + 1} attempts. Please choose a different SRR ID.`);
  }

  // Step 3 — Create & Submit Program Enrollment
  const programEnrollment = await createProgramEnrollment({
    student: student.name,
    program: form.program,
    academic_year: form.academic_year,
    enrollment_date: form.enrollment_date,
    student_batch_name: form.student_batch_name,
    student_group_name: form.studentGroupName,  // needed to fill custom_batch_name on Course Enrollments
    // Fee selection — stored on PE for parent dashboard
    custom_fee_structure: form.fee_structure,
    custom_plan: form.custom_plan,
    custom_no_of_instalments: form.custom_no_of_instalments,
  });

  // Step 4 — Add student to Student Group (batch) if provided
  if (form.studentGroupName) {
    await addStudentToGroup(form.studentGroupName, student.name, student.student_name);
  }

  // Step 5 — Auto-create Sales Order + Sales Invoice for tuition fee
  // Frappe's Student after_insert hook auto-creates a Customer linked to the
  // Student (visible in _server_messages). We read it back and use it for the SO.
  let salesOrderName: string | undefined;
  const warnings: string[] = [];
  try {
    // 5a. Read back the Student to get the auto-created customer
    const { data: freshStudent } = await apiClient.get(
      `/resource/Student/${encodeURIComponent(student.name)}?fields=["customer"]`
    );
    const customerName: string | undefined = freshStudent.data?.customer;
    if (!customerName) throw new Error("No customer linked to student");

    // 5b. Resolve the tuition fee item for this program
    const tuitionItem = await getTuitionFeeItem(form.program);
    if (!tuitionItem) {
      console.warn(`[admitStudent] No tuition fee item found for program "${form.program}" — skipping SO creation`);
    } else {
      const today = new Date().toISOString().split("T")[0];
      const txnDate = form.enrollment_date || today;

      // 5c. Determine the rate:
      //     1st choice → Fee Structure total_amount (most accurate, matches selected plan)
      //     2nd choice → Item Price table
      //     3rd choice → 0 (fallback)
      let rate = 0;
      if (form.fee_structure) {
        try {
          const { data: fsRes } = await apiClient.get(
            `/resource/Fee Structure/${encodeURIComponent(form.fee_structure)}?fields=["total_amount"]`
          );
          rate = fsRes.data?.total_amount ?? 0;
        } catch {
          // fee structure lookup failed — fall through to Item Price
        }
      }
      if (rate === 0) {
        rate = await getItemPriceRate(tuitionItem.item_code);
      }

      // 5d. Create Sales Order (invoice is created later when payment is due)
      const soPayload: SalesOrderFormData = {
        customer: customerName,
        company: form.custom_branch,
        transaction_date: txnDate,
        delivery_date: txnDate,
        order_type: "Sales",
        items: [{ item_code: tuitionItem.item_code, qty: 1, rate }],
        // Custom fields for student fee tracking
        custom_academic_year: form.academic_year || "2026-2027",
        student: student.name,
        custom_no_of_instalments: form.custom_no_of_instalments || undefined,
        custom_plan: form.custom_plan || undefined,
        custom_mode_of_payment: form.custom_mode_of_payment || undefined,
      };
      const soRes = await createSalesOrder(soPayload);
      salesOrderName = soRes.data.name;

      // 5e. Submit the Sales Order
      await submitSalesOrder(salesOrderName);
    }
  } catch (soError) {
    // Non-blocking — student + enrollment are already created
    const msg = soError instanceof Error ? soError.message : String(soError);
    console.warn("[admitStudent] Auto Sales Order creation failed (non-blocking):", soError);
    warnings.push(`Sales Order creation failed: ${msg}`);
  }

  // Step 6 — Auto-create Sales Invoices per instalment
  let invoiceNames: string[] | undefined;
  if (salesOrderName && form.instalmentSchedule?.length) {
    try {
      const invRes = await fetch("/api/admission/create-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          salesOrderName,
          schedule: form.instalmentSchedule,
        }),
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        invoiceNames = invData.invoices;
        if (invData.failed?.length) {
          warnings.push(`${invData.failed.length} instalment invoice(s) failed to create.`);
        }
      } else {
        const errBody = await invRes.text();
        console.warn("[admitStudent] Invoice creation returned error:", invRes.status, errBody);
        warnings.push(`Invoice creation failed (HTTP ${invRes.status}). Invoices can be created later from the Sales Order.`);
      }
    } catch (invError) {
      const msg = invError instanceof Error ? invError.message : String(invError);
      console.warn("[admitStudent] Auto Invoice creation failed (non-blocking):", invError);
      warnings.push(`Invoice creation failed: ${msg}. Invoices can be created later from the Sales Order.`);
    }
  } else if (salesOrderName && !form.instalmentSchedule?.length) {
    warnings.push("No instalment schedule provided — invoices were not created. You can create them from the Sales Order page.");
  }

  return { student, programEnrollment, salesOrder: salesOrderName, invoices: invoiceNames, warnings };
}
