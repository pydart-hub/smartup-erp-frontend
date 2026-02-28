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

  // 2. Submit (docstatus 0 → 1)
  await apiClient.put(`/resource/Program Enrollment/${encodeURIComponent(docName)}`, {
    docstatus: 1,
  });

  // 3. Return the submitted document
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

/** Academic Years */
export async function getAcademicYears(): Promise<
  { name: string; year_start_date: string; year_end_date: string }[]
> {
  const { data } = await apiClient.get(
    `/resource/Academic Year?fields=["name","year_start_date","year_end_date"]&limit=20&order_by=year_start_date desc`
  );
  return data.data;
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
  return String(last + 1);
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
export async function getBatchEnrollmentCounts(company?: string): Promise<Map<string, number>> {
  // If company is provided, first get the Student Group names for that branch
  // so we can filter enrollment counts to only relevant batches.
  let allowedBatches: Set<string> | null = null;
  if (company) {
    const { data: sgRes } = await apiClient.get(
      `/resource/Student Group?fields=["name"]&filters=${JSON.stringify([
        ["group_based_on", "=", "Batch"],
        ["custom_branch", "=", company],
      ])}&limit_page_length=0`
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
 * Full admission flow: creates Guardian + Student + Program Enrollment
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
}): Promise<{
  student: { name: string; student_name: string };
  programEnrollment: ProgramEnrollment;
  salesOrder?: string;
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
  const srrId = form.custom_srr_id || await getNextSrrId(form.custom_branch);
  const namePart = [form.first_name, form.last_name]
    .filter(Boolean)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const autoEmail = `${namePart}${srrId}@dummy.com`;

  // Build the student payload — strip undefined/empty-string optionals to avoid
  // Frappe treating them as invalid Select values.
  const studentPayload: Record<string, unknown> = {
    first_name: form.first_name,
    last_name: form.last_name || undefined,
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    student_email_id: form.student_email_id || autoEmail,
    joining_date: form.joining_date || form.enrollment_date,
    custom_branch: form.custom_branch,
    custom_srr_id: srrId,
    enabled: 1,
    // Frappe REST API requires the child-table doctype field on every row.
    guardians: [
      {
        doctype: "Student Guardians",
        guardian: guardianName,
        guardian_name: form.guardian_name,
        relation: form.guardian_relation,
      },
    ],
  };
  if (form.middle_name) studentPayload.middle_name = form.middle_name;
  if (form.blood_group) studentPayload.blood_group = form.blood_group;
  if (form.student_mobile_number) studentPayload.student_mobile_number = form.student_mobile_number;

  const { data: studentRes } = await apiClient.post("/resource/Student", studentPayload);
  const student = studentRes.data as { name: string; student_name: string };

  // Step 3 — Create & Submit Program Enrollment
  const programEnrollment = await createProgramEnrollment({
    student: student.name,
    program: form.program,
    academic_year: form.academic_year,
    enrollment_date: form.enrollment_date,
    student_batch_name: form.student_batch_name,
  });

  // Step 4 — Add student to Student Group (batch) if provided
  if (form.studentGroupName) {
    await addStudentToGroup(form.studentGroupName, student.name, student.student_name);
  }

  // Step 5 — Auto-create Sales Order for tuition fee
  // Frappe's Student after_insert hook auto-creates a Customer linked to the
  // Student (visible in _server_messages). We read it back and use it for the SO.
  let salesOrderName: string | undefined;
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

      // 5c. Create Sales Order (rate 0 → Frappe auto-fills from Item Price)
      const soPayload: SalesOrderFormData = {
        customer: customerName,
        company: form.custom_branch,
        transaction_date: form.enrollment_date || today,
        delivery_date: form.enrollment_date || today,
        order_type: "Sales",
        items: [{ item_code: tuitionItem.item_code, qty: 1, rate: 0 }],
      };
      const soRes = await createSalesOrder(soPayload);
      salesOrderName = soRes.data.name;

      // 5d. Submit the Sales Order
      await submitSalesOrder(salesOrderName);
    }
  } catch (soError) {
    // Non-blocking — student + enrollment are already created
    console.warn("[admitStudent] Auto Sales Order creation failed (non-blocking):", soError);
  }

  return { student, programEnrollment, salesOrder: salesOrderName };
}
