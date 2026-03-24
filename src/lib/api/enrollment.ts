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
  //    Frappe sometimes returns HTTP 409 (Conflict) even when the PE is created.
  //    This happens due to naming collisions that Frappe resolves internally.
  //    We handle 409 by checking if the PE was actually created.
  let docName: string;
  try {
    const { data: draft } = await apiClient.post("/resource/Program Enrollment", payload);
    docName = draft.data.name;
  } catch (postErr: unknown) {
    const axiosErr = postErr as { response?: { status?: number; data?: { data?: { name?: string }; exc_type?: string; exception?: string; _server_messages?: string } } };
    const status = axiosErr?.response?.status;
    const respData = axiosErr?.response?.data;

    // If 409, Frappe may have still created the PE. Try to find it.
    if (status === 409) {
      console.warn("[createProgramEnrollment] Got 409 Conflict — checking if PE was created anyway...");

      // Try extracting name from 409 response body first
      if (respData?.data?.name) {
        docName = respData.data.name;
        console.log(`[createProgramEnrollment] Found PE name in 409 response: ${docName}`);
      } else {
        // Fall back to querying for the PE by student + program + academic_year
        const searchQuery = new URLSearchParams({
          fields: JSON.stringify(["name", "docstatus"]),
          filters: JSON.stringify([
            ["student", "=", payload.student],
            ["program", "=", payload.program],
            ["academic_year", "=", payload.academic_year],
          ]),
          order_by: "creation desc",
          limit_page_length: "1",
        });
        try {
          const { data: searchRes } = await apiClient.get(`/resource/Program Enrollment?${searchQuery}`);
          const found = searchRes.data?.[0];
          if (found?.name) {
            docName = found.name;
            console.log(`[createProgramEnrollment] Found PE via search after 409: ${docName}`);
          } else {
            throw new Error(`Program Enrollment creation failed (HTTP 409) and no PE found for student=${payload.student}, program=${payload.program}`);
          }
        } catch (searchErr) {
          console.error("[createProgramEnrollment] Failed to recover from 409:", searchErr);
          throw postErr; // throw the original error
        }
      }
    } else {
      // Non-409 error — throw as-is
      throw postErr;
    }
  }

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
  //    Check current docstatus first — the PE may already be submitted (e.g. during 409 recovery)
  try {
    const { data: currentPE } = await apiClient.get(
      `/resource/Program Enrollment/${encodeURIComponent(docName)}?fields=["docstatus"]`
    );
    if (currentPE.data?.docstatus === 0) {
      await apiClient.put(`/resource/Program Enrollment/${encodeURIComponent(docName)}`, {
        docstatus: 1,
      });
    }
  } catch (submitErr) {
    console.warn(`[createProgramEnrollment] Failed to submit PE ${docName}:`, submitErr);
    // Don't throw — the PE exists as draft, caller can still proceed
  }

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
  // Step 1: get all Student Groups (name, program, batch) for this branch/year
  const sgFilters: string[][] = [["group_based_on", "=", "Batch"]];
  if (company) sgFilters.push(["custom_branch", "=", company]);
  if (academic_year) sgFilters.push(["academic_year", "=", academic_year]);

  const { data: sgRes } = await apiClient.get(
    `/resource/Student Group?fields=["name","program","batch"]&filters=${JSON.stringify(sgFilters)}&limit_page_length=0`
  );
  const groups = sgRes.data as { name: string; program: string; batch: string }[];
  if (groups.length === 0) return new Map();

  // Build a lookup from composite key "program|batch" → Student Group name(s)
  const keyToGroups = new Map<string, string[]>();
  for (const sg of groups) {
    if (sg.program && sg.batch) {
      const key = `${sg.program}|${sg.batch}`;
      const arr = keyToGroups.get(key) ?? [];
      arr.push(sg.name);
      keyToGroups.set(key, arr);
    }
  }

  // Collect all batch codes to filter PEs
  const batchCodes = [...new Set(groups.map((sg) => sg.batch).filter(Boolean))];
  if (batchCodes.length === 0) return new Map();

  // Step 2: get all submitted PEs with program + student_batch_name matching these batches
  const peFilters: unknown[][] = [
    ["docstatus", "=", "1"],
    ["student_batch_name", "in", batchCodes],
  ];
  const { data: peRes } = await apiClient.get(
    `/resource/Program Enrollment?fields=["student_batch_name","program"]&filters=${JSON.stringify(peFilters)}&limit_page_length=0`
  );

  // Step 3: map each PE to the correct Student Group(s) via "program|batch" key
  const countMap = new Map<string, number>();
  (peRes.data as { student_batch_name: string; program: string }[]).forEach((pe) => {
    if (pe.program && pe.student_batch_name) {
      const key = `${pe.program}|${pe.student_batch_name}`;
      const sgNames = keyToGroups.get(key);
      if (sgNames) {
        for (const sgName of sgNames) {
          countMap.set(sgName, (countMap.get(sgName) ?? 0) + 1);
        }
      }
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
    // Get batch codes for this branch (+ optionally year) to filter PE.
    // PE.student_batch_name stores the Student Batch Name (e.g. "Vennala 26-27"),
    // so we must compare against SG.batch, not SG.name.
    const sgFilters: string[][] = [["group_based_on", "=", "Batch"], ["custom_branch", "=", company]];
    if (academic_year) sgFilters.push(["academic_year", "=", academic_year]);
    const { data: sgRes } = await apiClient.get(
      `/resource/Student Group?fields=["batch"]&filters=${JSON.stringify(sgFilters)}&limit_page_length=0`
    );
    const batchCodes = [...new Set(
      (sgRes.data as { batch: string }[]).map((sg) => sg.batch).filter(Boolean)
    )];
    if (batchCodes.length === 0) return 0;
    (filters as unknown as unknown[][]).push(["student_batch_name", "in", batchCodes]);
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
 * Uses stage-based progress tracking. Each stage reports its status
 * so the UI can show exactly where the process is and what failed.
 *
 * Returns { student, programEnrollment, completedStages, ... }
 */

export type AdmissionStage =
  | "guardian" | "parent_user" | "student" | "enrollment"
  | "batch_assign" | "sales_order" | "invoices";

export interface AdmissionStageStatus {
  stage: AdmissionStage;
  label: string;
  status: "pending" | "in_progress" | "success" | "failed" | "skipped";
  error?: string;
}

export interface AdmitStudentForm {
  // Student
  first_name: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  student_email_id?: string;
  student_mobile_number?: string;
  custom_aadhaar?: string;         // Aadhaar number (12 digits)
  custom_disabilities?: string;  // Disabilities / Special Needs
  joining_date?: string;
  custom_branch: string;         // Company name
  custom_branch_abbr?: string;   // Company abbreviation for unique email generation
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
  // Subject-wise admission context (not sent to Frappe, only for fee config lookup)
  custom_subject?: string;       // e.g. "Physics", "Phy-Chem"
  // Instalment schedule (from feeSchedule generator)
  instalmentSchedule?: { amount: number; dueDate: string; label: string }[];
}

export interface AdmitStudentResult {
  student: { name: string; student_name: string };
  programEnrollment: ProgramEnrollment;
  salesOrder?: string;
  invoices?: string[];
  warnings: string[];
  stages: AdmissionStageStatus[];
}

export async function admitStudent(
  form: AdmitStudentForm,
  onStageUpdate?: (stages: AdmissionStageStatus[]) => void,
): Promise<AdmitStudentResult> {

  // ── Upfront validation ──
  if (!form.first_name?.trim()) {
    throw Object.assign(
      new Error("Student first name is required"),
      { __type: "validation_error" },
    );
  }
  if (!form.guardian_name?.trim()) {
    throw Object.assign(
      new Error("Guardian name is required"),
      { __type: "validation_error" },
    );
  }
  if (!form.guardian_email?.trim()) {
    throw Object.assign(
      new Error("Guardian email is required"),
      { __type: "validation_error" },
    );
  }
  if (!form.custom_branch?.trim()) {
    throw Object.assign(
      new Error("Branch is required"),
      { __type: "validation_error" },
    );
  }
  if (!form.program?.trim()) {
    throw Object.assign(
      new Error("Program is required"),
      { __type: "validation_error" },
    );
  }

  // ── Stage tracking ──
  const stages: AdmissionStageStatus[] = [
    { stage: "guardian", label: "Creating Guardian", status: "pending" },
    { stage: "parent_user", label: "Creating Parent Login", status: "pending" },
    { stage: "student", label: "Creating Student Record", status: "pending" },
    { stage: "enrollment", label: "Program Enrollment", status: "pending" },
    { stage: "batch_assign", label: "Batch Assignment", status: "pending" },
    { stage: "sales_order", label: "Sales Order & Fees", status: "pending" },
    { stage: "invoices", label: "Creating Invoices", status: "pending" },
  ];

  function updateStage(
    stage: AdmissionStage,
    status: AdmissionStageStatus["status"],
    error?: string,
  ) {
    const s = stages.find((s) => s.stage === stage);
    if (s) {
      s.status = status;
      if (error) s.error = error;
    }
    onStageUpdate?.([...stages]);
  }

  const warnings: string[] = [];

  // ───────────────────────────────────────────────────
  // Step 1 — Create Guardian
  // ───────────────────────────────────────────────────
  updateStage("guardian", "in_progress");
  let guardianName: string;
  try {
    const { data: guardianRes } = await apiClient.post("/resource/Guardian", {
      guardian_name: form.guardian_name,
      email_address: form.guardian_email,
      mobile_number: form.guardian_mobile,
    });
    guardianName = guardianRes.data.name;
    updateStage("guardian", "success");
  } catch (err) {
    const msg = extractFrappeError(err, "Failed to create guardian");
    updateStage("guardian", "failed", msg);
    throw Object.assign(new Error(msg), { __type: "guardian_failed", stages });
  }

  // ───────────────────────────────────────────────────
  // Step 1.5 — Create Frappe User with "Parent" role
  // ───────────────────────────────────────────────────
  updateStage("parent_user", "in_progress");
  try {
    const parentUserRes = await fetch("/api/auth/create-parent-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: form.guardian_email,
        full_name: form.guardian_name,
        password: form.guardian_password,
        phone: form.guardian_mobile || undefined,
        student_name: [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" "),
        program: form.program || undefined,
        branch: form.custom_branch || undefined,
      }),
    });
    if (!parentUserRes.ok) {
      const errBody = await parentUserRes.json().catch(() => ({}));
      const msg = (errBody as { error?: string }).error || `HTTP ${parentUserRes.status}`;
      console.warn("[admitStudent] Parent user creation error:", msg);
      warnings.push(`Parent login creation failed: ${msg}. Can be created later.`);
      updateStage("parent_user", "failed", msg);
    } else {
      updateStage("parent_user", "success");
    }
  } catch (userError) {
    // Non-blocking — guardian + student flow continues even if user creation fails
    const msg = userError instanceof Error ? userError.message : String(userError);
    console.warn("[admitStudent] Parent user creation failed (non-blocking):", userError);
    warnings.push(`Parent login creation failed: ${msg}. Can be created later.`);
    updateStage("parent_user", "failed", msg);
  }

  // ───────────────────────────────────────────────────
  // Step 2 — Create Student (linked to guardian)
  // ───────────────────────────────────────────────────
  updateStage("student", "in_progress");
  let srrId = form.custom_srr_id || await getNextSrrId(form.custom_branch);

  // Helper to build the student payload for a given SRR ID
  // Includes branch abbreviation in auto-email to prevent cross-branch collisions
  function buildStudentPayload(srrIdVal: string) {
    const namePart = [form.first_name, form.last_name]
      .filter(Boolean)
      .join("")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    // Include branch abbreviation to prevent email collision across branches
    const branchPart = (form.custom_branch_abbr || form.custom_branch)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10);
    const autoEmail = `${namePart}.${branchPart}.${srrIdVal}@dummy.com`;
    // Store computed email so we can pre-create the user
    currentStudentEmail = form.student_email_id || autoEmail;

    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      student_email_id: currentStudentEmail,
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
    if (form.custom_aadhaar) payload.custom_aadhaar = form.custom_aadhaar;
    if (form.custom_disabilities) payload.custom_disabilities = form.custom_disabilities;
    return payload;
  }

  // PRE-CREATE the Frappe User for the student email BEFORE creating the Student.
  // Frappe's Student.validate_user() auto-creates a User from student_email_id and
  // sends a welcome email. If SMTP quota is exceeded or the username collides, this
  // crashes the ENTIRE Student insert. By pre-creating the User via admin API with
  // send_welcome_email=0, we avoid both issues.
  let currentStudentEmail = "";
  buildStudentPayload(srrId); // compute the email
  let studentUserCreated = false;
  try {
    await apiClient.post("/resource/User", {
      email: currentStudentEmail,
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      send_welcome_email: 0,
      new_password: `Student@${srrId}`,
      roles: [{ role: "Student" }],
      enabled: 1,
    });
    studentUserCreated = true;

    // Explicitly set password via set_value — new_password in creation payload
    // does not reliably work on Frappe Cloud for Website Users
    try {
      await apiClient.post("/method/frappe.client.set_value", {
        doctype: "User",
        name: currentStudentEmail,
        fieldname: "new_password",
        value: `Student@${srrId}`,
      });
      console.log(`[admitStudent] Student password set via set_value for ${currentStudentEmail}`);
    } catch (pwdErr) {
      console.warn("[admitStudent] Student password set_value failed (non-blocking):", pwdErr);
    }
  } catch (preUserErr) {
    // 409 / DuplicateEntryError is fine — user already exists
    const errStatus = (preUserErr as { response?: { status?: number } })?.response?.status;
    const excType = String(
      (preUserErr as { response?: { data?: { exc_type?: string } } })?.response?.data?.exc_type ?? ""
    );
    if (errStatus !== 409 && !excType.includes("DuplicateEntryError")) {
      console.warn("[admitStudent] Pre-create student user failed (non-blocking):", preUserErr);
      // Don't throw — Frappe might still succeed if SMTP is working
    }
  }

  // Try to create the student; on DuplicateEntryError, retry with incremented SRR ID
  const MAX_RETRIES = 10;
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
      if (excType.includes("UniqueValidationError") || excMsg.includes("student_email_id") || (excMsg.includes("Duplicate entry") && excMsg.includes("student_email_id"))) {
        const msg = `The email "${form.student_email_id}" is already registered to another student. Please use a different email.`;
        updateStage("student", "failed", msg);
        throw Object.assign(new Error(msg), { __type: "duplicate_email", stages });
      }

      const isDuplicate = errData?.status === 409 ||
        excType.includes("DuplicateEntryError") ||
        excMsg.includes("DuplicateEntryError");
      if (isDuplicate && attempt < MAX_RETRIES) {
        const num = parseInt(srrId, 10);
        const padLen = Math.max(3, srrId.length);
        srrId = String((isNaN(num) ? 0 : num) + 1).padStart(padLen, "0");
        console.warn(`[admitStudent] SRR ID collision, retrying with ${srrId} (attempt ${attempt + 2})`);
        continue;
      }
      // Not a retryable error or ran out of retries — re-throw with details
      const msg = extractFrappeError(err, "Failed to create student record");
      updateStage("student", "failed", msg);
      throw Object.assign(new Error(msg), { __type: "student_failed", stages });
    }
  }
  if (!student) {
    const msg = `SRR ID collision after ${MAX_RETRIES + 1} attempts. Please choose a different SRR ID.`;
    updateStage("student", "failed", msg);
    throw Object.assign(new Error(msg), { __type: "student_failed", stages });
  }
  updateStage("student", "success");

  // ───────────────────────────────────────────────────
  // Step 2.5 — Send welcome email to student (non-blocking)
  // ───────────────────────────────────────────────────
  if (studentUserCreated) {
    try {
      const studentFullName = [form.first_name, form.middle_name, form.last_name]
        .filter(Boolean)
        .join(" ");
      const welcomeRes = await fetch("/api/auth/send-student-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: currentStudentEmail,
          full_name: studentFullName,
          student_id: student.name,
          program: form.program,
          branch: form.custom_branch,
          phone: form.student_mobile_number || undefined,
        }),
      });
      if (welcomeRes.ok) {
        const welcomeData = await welcomeRes.json() as { skipped?: boolean };
        if (welcomeData.skipped) {
          console.log("[admitStudent] Student welcome email skipped (dummy address)");
        } else {
          console.log("[admitStudent] Student welcome email sent successfully");
        }
      } else {
        console.warn("[admitStudent] Student welcome email failed:", welcomeRes.status);
      }
    } catch (welcomeErr) {
      // Non-blocking — student creation already succeeded
      console.warn("[admitStudent] Student welcome email failed (non-blocking):", welcomeErr);
    }
  }

  // ───────────────────────────────────────────────────
  // Step 3 — Create & Submit Program Enrollment
  // ───────────────────────────────────────────────────
  updateStage("enrollment", "in_progress");
  let programEnrollment: ProgramEnrollment;
  try {
    programEnrollment = await createProgramEnrollment({
      student: student.name,
      program: form.program,
      academic_year: form.academic_year,
      enrollment_date: form.enrollment_date,
      student_batch_name: form.student_batch_name,
      student_group_name: form.studentGroupName,
      // Fee selection — stored on PE for parent dashboard
      custom_fee_structure: form.fee_structure,
      custom_plan: form.custom_plan,
      custom_no_of_instalments: form.custom_no_of_instalments,
    });
    updateStage("enrollment", "success");
  } catch (peErr) {
    const msg = extractFrappeError(peErr, "Failed to create program enrollment");
    updateStage("enrollment", "failed", msg);
    // Student was already created — mark this in the error so the UI can inform
    warnings.push(`Enrollment failed but student record was created (${student.name}). Please complete enrollment manually.`);
    throw Object.assign(new Error(msg), { __type: "enrollment_failed", stages, student, warnings });
  }

  // ───────────────────────────────────────────────────
  // Step 4 — Add student to Student Group (batch)
  // ───────────────────────────────────────────────────
  if (form.studentGroupName) {
    updateStage("batch_assign", "in_progress");
    try {
      await addStudentToGroup(form.studentGroupName, student.name, student.student_name);
      updateStage("batch_assign", "success");
    } catch (batchErr) {
      const msg = extractFrappeError(batchErr, "Failed to add student to batch");
      console.warn("[admitStudent] Batch assignment failed (non-blocking):", batchErr);
      warnings.push(`Batch assignment failed: ${msg}. You can add the student to a batch manually.`);
      updateStage("batch_assign", "failed", msg);
    }
  } else {
    updateStage("batch_assign", "skipped");
  }

  // ───────────────────────────────────────────────────
  // Step 5 — Auto-create Sales Order for tuition fee
  // ───────────────────────────────────────────────────
  updateStage("sales_order", "in_progress");
  let salesOrderName: string | undefined;
  try {
    // 5a. Read back the Student to get the auto-created customer
    const { data: freshStudent } = await apiClient.get(
      `/resource/Student/${encodeURIComponent(student.name)}?fields=["customer"]`
    );
    const customerName: string | undefined = freshStudent.data?.customer;
    if (!customerName) throw new Error("No customer linked to student — Frappe may not have auto-created it");

    // 5b. Resolve the tuition fee item for this program
    const tuitionItem = await getTuitionFeeItem(form.program);
    if (!tuitionItem) {
      warnings.push(`No tuition fee item found for "${form.program}". Sales order was not created.`);
      updateStage("sales_order", "skipped");
    } else {
      const today = new Date().toISOString().split("T")[0];
      const txnDate = form.enrollment_date || today;

      // 5c. Determine the rate
      let rate = 0;
      if (form.fee_structure) {
        try {
          const { data: fsRes } = await apiClient.get(
            `/resource/Fee Structure/${encodeURIComponent(form.fee_structure)}?fields=["total_amount"]`
          );
          rate = fsRes.data?.total_amount ?? 0;
        } catch {
          // fee structure lookup failed — fall through
        }
      }
      if (rate === 0) {
        rate = await getItemPriceRate(tuitionItem.item_code);
      }
      if (rate === 0) {
        warnings.push("Fee rate resolved to ₹0. Please verify the fee structure and item pricing.");
      }

      // 5d. Create Sales Order
      // For multi-instalment plans, use qty=number_of_instalments so each
      // invoice can bill qty=1 without triggering Frappe's overbilling check.
      // Don't round the per-instalment rate — let Frappe handle currency
      // precision server-side so qty × rate rounds to the exact total.
      const numInstalments = parseInt(form.custom_no_of_instalments || "1", 10) || 1;
      const scheduleSum = form.instalmentSchedule?.reduce((sum, s) => sum + s.amount, 0) ?? 0;
      const soQty = numInstalments > 1 ? numInstalments : 1;
      const soRate = numInstalments > 1 && scheduleSum > 0
        ? scheduleSum / numInstalments
        : rate;

      const soPayload: SalesOrderFormData = {
        customer: customerName,
        company: form.custom_branch,
        transaction_date: txnDate,
        delivery_date: txnDate,
        order_type: "Sales",
        items: [{ item_code: tuitionItem.item_code, qty: soQty, rate: soRate }],
        // Custom fields for student fee tracking
        custom_academic_year: form.academic_year || "2026-2027",
        student: student.name,
        custom_no_of_instalments: form.custom_no_of_instalments || undefined,
        custom_plan: form.custom_plan || undefined,
      };
      const soRes = await createSalesOrder(soPayload);
      salesOrderName = soRes.data.name;

      // 5e. Submit the Sales Order
      await submitSalesOrder(salesOrderName);
      updateStage("sales_order", "success");
    }
  } catch (soError) {
    // Non-blocking — student + enrollment are already created
    const msg = soError instanceof Error ? soError.message : String(soError);
    console.warn("[admitStudent] Auto Sales Order creation failed (non-blocking):", soError);
    warnings.push(`Sales Order creation failed: ${msg}`);
    updateStage("sales_order", "failed", msg);
  }

  // ───────────────────────────────────────────────────
  // Step 6 — Auto-create Sales Invoices per instalment
  // ───────────────────────────────────────────────────
  let invoiceNames: string[] | undefined;
  if (salesOrderName && form.instalmentSchedule?.length) {
    updateStage("invoices", "in_progress");
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
          updateStage("invoices", "failed", `${invData.failed.length} failed`);
        } else {
          updateStage("invoices", "success");
        }
      } else {
        const errBody = await invRes.text();
        console.warn("[admitStudent] Invoice creation returned error:", invRes.status, errBody);
        warnings.push(`Invoice creation failed (HTTP ${invRes.status}). Invoices can be created later from the Sales Order.`);
        updateStage("invoices", "failed", `HTTP ${invRes.status}`);
      }
    } catch (invError) {
      const msg = invError instanceof Error ? invError.message : String(invError);
      console.warn("[admitStudent] Auto Invoice creation failed (non-blocking):", invError);
      warnings.push(`Invoice creation failed: ${msg}. Invoices can be created later from the Sales Order.`);
      updateStage("invoices", "failed", msg);
    }
  } else if (salesOrderName && !form.instalmentSchedule?.length) {
    warnings.push("No instalment schedule provided — invoices were not created. You can create them from the Sales Order page.");
    updateStage("invoices", "skipped");
  } else {
    updateStage("invoices", "skipped");
  }

  return { student, programEnrollment, salesOrder: salesOrderName, invoices: invoiceNames, warnings, stages };
}

/**
 * Extract a human-readable error message from a Frappe API error response.
 */
function extractFrappeError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return (err as Error)?.message || fallback;

  // Check for our own typed errors
  if ((err as { __type?: string }).__type) {
    return (err as Error).message || fallback;
  }

  // Handle _server_messages (JSON-encoded array of {message} objects)
  if (typeof data._server_messages === "string") {
    try {
      const parsed: { message: string }[] = JSON.parse(data._server_messages as string);
      const msgs = parsed.map((m) => {
        try { return JSON.parse(m.message).message || m.message; } catch { return m.message; }
      }).filter(Boolean);
      if (msgs.length) return msgs.join(". ");
    } catch {
      return String(data._server_messages);
    }
  }

  // Handle direct message
  if (typeof data.message === "string") return data.message;

  // Handle exception string
  if (typeof data.exception === "string") {
    return (data.exception as string).split("\n")[0].replace(/^.*?:\s*/, "");
  }

  // Handle exc_type
  if (data.exc_type === "DuplicateEntryError") {
    return "A record with this name already exists (duplicate entry).";
  }
  if (data.exc_type === "ValidationError") {
    return "Validation error from Frappe. Please check the submitted data.";
  }

  return fallback;
}
