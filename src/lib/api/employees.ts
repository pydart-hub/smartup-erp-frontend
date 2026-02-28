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
import type { FrappeListResponse } from "@/lib/types/api";

// ── Types ──

export interface Employee {
  name: string;
  employee_name: string;
  company: string;
  department?: string;
  designation?: string;
  user_id?: string;
  status: string;
  image?: string;
  date_of_joining?: string;
  gender?: string;
  cell_number?: string;
  personal_email?: string;
  employment_type?: string;
  branch?: string;
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
  "name", "employee_name", "company", "department",
  "designation", "user_id", "status", "image", "date_of_joining",
  "gender", "cell_number", "personal_email", "employment_type", "branch",
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

// ─────────────────────────────────────────────────────────────────────────────
// Employee Attendance (HR module)
// ─────────────────────────────────────────────────────────────────────────────

/** List employee attendance records for a company/date range */
export async function getEmployeeAttendance(params?: {
  company?: string;
  date?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<EmployeeAttendance>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
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
  // Step 1: Get employee names for this company
  const empRes = await getEmployees({ company, status: "Active", limit_page_length: 500 });
  const employeeNames = new Set(empRes.data.map((e) => e.name));

  // Step 2: Get all instructors
  const instrRes = await getInstructors({ limit_page_length: 500 });

  // Step 3: Filter instructors whose employee is in this company
  return instrRes.data.filter((i) => employeeNames.has(i.employee));
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update Employee Attendance
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new Attendance record (submitted) */
export async function createEmployeeAttendance(payload: {
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
  company: string;
}): Promise<{ data: EmployeeAttendance }> {
  const { data } = await apiClient.post("/resource/Attendance", payload);
  return data;
}

/** Update an existing draft Attendance record */
export async function updateEmployeeAttendance(
  name: string,
  status: string
): Promise<void> {
  await apiClient.put(`/resource/Attendance/${encodeURIComponent(name)}`, { status });
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
