/**
 * employees.ts
 * API layer for ERPNext Employee and Attendance (HR) doctypes.
 *
 * - Employee       (/api/resource/Employee)
 * - Attendance     (/api/resource/Attendance)       — HR Employee Attendance
 * - Instructor     (/api/resource/Instructor)
 *
 * All calls go through /api/proxy which injects auth headers.
 */

import apiClient from "./client";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";

// ── Types ──

export interface Employee {
  name: string;
  first_name?: string;
  last_name?: string;
  employee_name: string;
  company: string;
  department?: string;
  designation?: string;
  user_id?: string;
  status: string;
  image?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  gender?: string;
  cell_number?: string;
  personal_email?: string;
  employment_type?: string;
  branch?: string;
  custom_basic_salary?: number;
  custom_payable_account?: string;
  // Bank Details
  bank_name?: string;
  bank_ac_no?: string;
  ifsc_code?: string;
  bank_branch_location?: string;
}

export interface EmployeeAttendance {
  name: string;
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string; // "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home"
  company: string;
  department?: string;
  leave_type?: string;
  late_entry?: number;
  early_exit?: number;
}

export interface Instructor {
  name: string;
  instructor_name: string;
  employee: string;
  department?: string;
  status?: string;
  image?: string;
  gender?: string;
  custom_company?: string;
}

// ── Employee List Fields ──
const EMPLOYEE_FIELDS = JSON.stringify([
  "name", "first_name", "last_name", "employee_name", "company", "department",
  "designation", "user_id", "status", "image", "date_of_birth", "date_of_joining",
  "gender", "cell_number", "personal_email", "employment_type", "branch",
  "custom_basic_salary", "custom_payable_account",
  "bank_name", "bank_ac_no", "ifsc_code", "bank_branch_location",
]);

const EMPLOYEE_ATTENDANCE_FIELDS = JSON.stringify([
  "name", "employee", "employee_name", "attendance_date",
  "status", "company", "department", "leave_type",
  "late_entry", "early_exit",
]);

const INSTRUCTOR_FIELDS = JSON.stringify([
  "name", "instructor_name", "employee", "department", "status", "image",
  "gender", "custom_company",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Employees
// ─────────────────────────────────────────────────────────────────────────────

/** List employees filtered by company (branch) */
export async function getEmployees(params?: {
  company?: string;
  status?: string;
  search?: string;
  limit_page_length?: number;
  limit_start?: number;
}): Promise<FrappeListResponse<Employee>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.status) filters.push(["status", "=", params.status]);
  if (params?.search) filters.push(["employee_name", "like", `%${params.search}%`]);

  const query = new URLSearchParams({
    fields: EMPLOYEE_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "employee_name asc",
    ...(params?.limit_start ? { limit_start: String(params.limit_start) } : {}),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Employee?${query}`);
  return data;
}

/** Get a single employee doc by name */
export async function getEmployeeDoc(name: string): Promise<FrappeSingleResponse<Employee>> {
  const { data } = await apiClient.get(`/resource/Employee/${encodeURIComponent(name)}`);
  return data;
}

/** Update only the custom_basic_salary field on an Employee */
export async function updateEmployeeBasicSalary(
  name: string,
  basic_salary: number
): Promise<FrappeSingleResponse<Employee>> {
  const { data } = await apiClient.put(
    `/resource/Employee/${encodeURIComponent(name)}`,
    { custom_basic_salary: basic_salary }
  );
  return data;
}

/**
 * Create a per-employee salary payable account under
 * "Accounts Payable - {ABBR}" for the given company.
 * Returns the new account name (e.g. "Abu Payable - SU KDV").
 */
export async function createEmployeePayableAccount(
  employeeName: string,
  company: string,
  companyAbbr: string
): Promise<string> {
  const accountName = `${employeeName} Payable`;
  // Nest under "Salary Payable - {ABBR}" group (which lives under Accounts Payable)
  const parentAccount = `Salary Payable - ${companyAbbr}`;
  const { data } = await apiClient.post("/resource/Account", {
    account_name: accountName,
    account_type: "Payable",
    root_type: "Liability",
    parent_account: parentAccount,
    company,
    is_group: 0,
  });
  // Frappe names the account as "{accountName} - {ABBR}"
  return data.data.name as string;
}

/** Save the payable account name onto the Employee doc */
export async function updateEmployeePayableAccount(
  employeeId: string,
  payableAccount: string
): Promise<void> {
  await apiClient.put(
    `/resource/Employee/${encodeURIComponent(employeeId)}`,
    { custom_payable_account: payableAccount }
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// HR Lookups (Departments, Designations)
// ─────────────────────────────────────────────────────────────────────────────────

export async function getDepartments(company?: string): Promise<FrappeListResponse<{ name: string }>> {
  const filters: string[][] = [];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    limit_page_length: "200",
    order_by: "name asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Department?${query}`);
  return data;
}

export async function getDesignations(): Promise<FrappeListResponse<{ name: string }>> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    limit_page_length: "200",
    order_by: "name asc",
  });
  const { data } = await apiClient.get(`/resource/Designation?${query}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Create & Update Employee
// ─────────────────────────────────────────────────────────────────────────────────

export interface EmployeePayload {
  first_name: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  company?: string;
  department?: string;
  designation?: string;
  employment_type?: string;
  status?: string;
  cell_number?: string;
  personal_email?: string;
  custom_basic_salary?: number;
  // Bank Details
  bank_name?: string;
  bank_ac_no?: string;
  ifsc_code?: string;
  bank_branch_location?: string;
}

export async function createEmployee(
  payload: EmployeePayload & { first_name: string; company: string; status: string }
): Promise<FrappeSingleResponse<Employee>> {
  // Strip empty optional fields before sending
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== "" && v != null)
  );
  const { data } = await apiClient.post("/resource/Employee", body);
  return data;
}

export async function updateEmployee(
  id: string,
  payload: Partial<EmployeePayload>
): Promise<FrappeSingleResponse<Employee>> {
  // Strip undefined/empty so we don't accidentally clear fields
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );
  const { data } = await apiClient.put(`/resource/Employee/${encodeURIComponent(id)}`, body);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee Attendance (HR module)
// ─────────────────────────────────────────────────────────────────────────────

/** List employee attendance records for a company/date range */
export async function getEmployeeAttendance(params?: {
  company?: string;
  employees?: string[];
  date?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<EmployeeAttendance>> {
  const filters: (string | number)[][] = [["docstatus", "!=", 2]];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.employees?.length) filters.push(["employee", "in", params.employees as unknown as string]);
  if (params?.date) filters.push(["attendance_date", "=", params.date]);
  if (params?.from_date) filters.push(["attendance_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["attendance_date", "<=", params.to_date]);
  if (params?.status) filters.push(["status", "=", params.status]);

  const query = new URLSearchParams({
    fields: EMPLOYEE_ATTENDANCE_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 0),
    order_by: "attendance_date desc, employee_name asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Attendance?${query}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Instructors (Teachers)
// ─────────────────────────────────────────────────────────────────────────────

/** List all instructors — need to cross-ref with Employee for company filter */
export async function getInstructors(params?: {
  limit_page_length?: number;
}): Promise<FrappeListResponse<Instructor>> {
  const query = new URLSearchParams({
    fields: INSTRUCTOR_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 0),
    order_by: "instructor_name asc",
  });
  const { data } = await apiClient.get(`/resource/Instructor?${query}`);
  return data;
}

/** Get instructors filtered by company (branch) via Employee cross-reference */
export async function getInstructorsByCompany(company: string): Promise<Instructor[]> {
  // Preferred path: server-side route with admin-token reads plus branch scoping.
  try {
    const { data } = await apiClient.get<{ data?: Instructor[] }>(
      `/branch-manager/instructors?branch=${encodeURIComponent(company)}`,
      { baseURL: "/api" }
    );
    return data?.data ?? [];
  } catch {
    // Fall back to legacy direct-doctype strategies below.
  }

  // Strategy 1: filter directly by custom_company field on the Instructor doctype
  try {
    const filters = encodeURIComponent(JSON.stringify([["custom_company", "=", company]]));
    const { data } = await apiClient.get(
      `/resource/Instructor?fields=${encodeURIComponent(INSTRUCTOR_FIELDS)}&filters=${filters}&limit_page_length=500&order_by=instructor_name asc`
    );
    const direct: Instructor[] = data?.data ?? [];
    if (direct.length > 0) return direct;
  } catch {
    // fall through to employee cross-reference
  }

  // Strategy 2: cross-reference via Employee doctype (legacy fallback)
  const empRes = await getEmployees({ company, status: "Active", limit_page_length: 500 });
  const employeeNames = new Set(empRes.data.map((e) => e.name));
  const instrRes = await getInstructors({ limit_page_length: 500 });
  return instrRes.data.filter((i) => employeeNames.has(i.employee));
}

// ── Instructor Log (child table) ─────────────────────────────────────────────

export interface InstructorLogEntry {
  program: string;
  course?: string;
  custom_branch?: string;
  academic_year?: string;
}

export interface InstructorWithLog extends Instructor {
  instructor_log: InstructorLogEntry[];
}

/**
 * Fetch a single instructor's full doc (including instructor_log child table).
 * This is needed because the list API does not return child tables.
 */
export async function getInstructorDoc(name: string): Promise<InstructorWithLog> {
  const { data } = await apiClient.get<{ data: InstructorWithLog }>(
    `/resource/Instructor/${encodeURIComponent(name)}`
  );
  return data.data;
}

/**
 * Fetch all instructors for a given branch with their course assignments.
 * Makes N+1 calls: one list call + one per instructor for the full doc.
 * Results should be cached aggressively (staleTime: 10+ min).
 */
export async function getInstructorsWithCourses(branch: string): Promise<InstructorWithLog[]> {
  try {
    const { data } = await apiClient.get<{ data: InstructorWithLog[] }>(
      `/branch-manager/instructors?branch=${encodeURIComponent(branch)}`,
      { baseURL: "/api" }
    );
    return data?.data ?? [];
  } catch {
    // Fallback to legacy client-side composition path if server route fails.
  }

  const normalize = (value?: string) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const targetBranch = normalize(branch);

  const [allInstructorsRes, branchEmployeesRes] = await Promise.all([
    getInstructors({ limit_page_length: 500 }),
    getEmployees({ company: branch, status: "Active", limit_page_length: 500 }),
  ]);

  const allInstructors = allInstructorsRes.data ?? [];
  const branchEmployeeSet = new Set((branchEmployeesRes.data ?? []).map((e) => e.name));

  // Fetch full docs in parallel (for instructor_log with branch/course assignments)
  const docs = await Promise.all(
    allInstructors.map((i) =>
      getInstructorDoc(i.name).catch(() => ({
        ...i,
        instructor_log: [] as InstructorLogEntry[],
      }))
    )
  );

  return (docs as InstructorWithLog[]).filter((instr) => {
    const logs = instr.instructor_log ?? [];
    if (logs.length > 0) {
      // Primary source of truth for multi-branch teaching eligibility.
      return logs.some((log) => normalize(log.custom_branch) === targetBranch);
    }
    // Legacy fallback: include instructor if linked employee belongs to this branch.
    return branchEmployeeSet.has(instr.employee);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update Employee Attendance
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new Attendance record */
export async function createEmployeeAttendance(payload: {
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
  company: string;
}): Promise<{ data: EmployeeAttendance }> {
  try {
    const { data } = await apiClient.post("/resource/Attendance", {
      ...payload,
      docstatus: 1,
    });
    return data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { exception?: string; message?: string; _error_message?: string } };
    };
    const text = String(
      err?.response?.data?._error_message ||
      err?.response?.data?.message ||
      err?.response?.data?.exception ||
      ""
    );

    // Frappe duplicate-error payload often includes an existing attendance ID like HR-ATT-2026-00187.
    if (text.toLowerCase().includes("duplicateattendanceerror") || text.toLowerCase().includes("already marked")) {
      const match = text.match(/(HR-ATT-[A-Za-z0-9-]+)/i);
      const existingName = match?.[1];
      if (existingName) {
        await updateEmployeeAttendance(existingName, payload);
        return { data: { name: existingName, ...payload } as EmployeeAttendance };
      }
    }
    throw error;
  }
}

/** Update an existing Attendance record: cancel old → create new submitted */
export async function updateEmployeeAttendance(
  existingName: string,
  payload: {
    employee: string;
    employee_name: string;
    attendance_date: string;
    status: string;
    company: string;
  }
): Promise<void> {
  // Read current docstatus to pick a safe update path.
  const { data: existingRes } = await apiClient.get<{ data?: { docstatus?: number } }>(
    `/resource/Attendance/${encodeURIComponent(existingName)}`
  );
  const docstatus = Number(existingRes?.data?.docstatus ?? 0);

  if (docstatus === 0) {
    // Draft can be updated in place.
    await apiClient.put(`/resource/Attendance/${encodeURIComponent(existingName)}`, {
      ...payload,
    });
    return;
  }

  // Submitted record: cancel then create replacement.
  await apiClient.post("/method/frappe.client.cancel", {
    doctype: "Attendance",
    name: existingName,
  });

  await apiClient.post("/resource/Attendance", {
    ...payload,
    docstatus: 1,
  });
}

/** Get Fee Schedules for a company (used later for class-wise filters) */
export interface FeeSchedule {
  name: string;
  program: string;
  academic_year?: string;
  company: string;
}

export async function getFeeSchedules(params?: {
  company?: string;
}): Promise<FrappeListResponse<FeeSchedule>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);

  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "program", "academic_year", "company"]),
    limit_page_length: "0",
    order_by: "program asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Fee Schedule?${query}`);
  return data;
}
