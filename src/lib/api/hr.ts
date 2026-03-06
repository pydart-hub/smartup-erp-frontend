/**
 * hr.ts
 * API layer for HR Manager–specific Frappe doctypes.
 *
 * - Leave Application   (/api/resource/Leave Application)
 * - Leave Type          (/api/resource/Leave Type)
 * - Salary Slip         (/api/resource/Salary Slip)
 * - Payroll Entry       (/api/resource/Payroll Entry)
 * - Expense Claim       (/api/resource/Expense Claim)
 * - Department          (/api/resource/Department)
 * - Designation         (/api/resource/Designation)
 *
 * Re-exports employee/attendance helpers from employees.ts for convenience.
 */

import apiClient from "./client";
import type { FrappeListResponse } from "@/lib/types/api";

// ── Re-exports ──
export {
  getEmployees,
  getEmployeeAttendance,
  createEmployeeAttendance,
  updateEmployeeAttendance,
  type Employee,
  type EmployeeAttendance,
} from "./employees";

// ── Leave Application ──

export interface LeaveApplication {
  name: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string; // "Open" | "Approved" | "Rejected" | "Cancelled"
  posting_date: string;
  description?: string;
  leave_approver?: string;
  leave_approver_name?: string;
  company?: string;
  department?: string;
}

const LEAVE_APP_FIELDS = JSON.stringify([
  "name", "employee", "employee_name", "leave_type",
  "from_date", "to_date", "total_leave_days", "status",
  "posting_date", "description", "leave_approver",
  "leave_approver_name", "company", "department",
]);

export async function getLeaveApplications(params?: {
  company?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  employee?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<LeaveApplication>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.status) filters.push(["status", "=", params.status]);
  if (params?.from_date) filters.push(["from_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["to_date", "<=", params.to_date]);
  if (params?.employee) filters.push(["employee", "=", params.employee]);

  const query = new URLSearchParams({
    fields: LEAVE_APP_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Leave Application?${query}`);
  return data;
}

export async function approveLeaveApplication(name: string): Promise<void> {
  await apiClient.put(`/resource/Leave Application/${encodeURIComponent(name)}`, {
    status: "Approved",
  });
}

export async function rejectLeaveApplication(name: string): Promise<void> {
  await apiClient.put(`/resource/Leave Application/${encodeURIComponent(name)}`, {
    status: "Rejected",
  });
}

// ── Leave Type ──

export interface LeaveType {
  name: string;
  leave_type_name: string;
  max_leaves_allowed: number;
  is_carry_forward: number;
  is_lwp: number;
}

export async function getLeaveTypes(): Promise<FrappeListResponse<LeaveType>> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "leave_type_name", "max_leaves_allowed", "is_carry_forward", "is_lwp"]),
    limit_page_length: "0",
    order_by: "name asc",
  });
  const { data } = await apiClient.get(`/resource/Leave Type?${query}`);
  return data;
}

// ── Salary Slip ──

export interface SalarySlip {
  name: string;
  employee: string;
  employee_name: string;
  company: string;
  department?: string;
  designation?: string;
  posting_date: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  status: string; // "Draft" | "Submitted" | "Cancelled"
  docstatus: number;
}

const SALARY_SLIP_FIELDS = JSON.stringify([
  "name", "employee", "employee_name", "company", "department",
  "designation", "posting_date", "start_date", "end_date",
  "gross_pay", "total_deduction", "net_pay", "status", "docstatus",
]);

export async function getSalarySlips(params?: {
  company?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  employee?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<SalarySlip>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.from_date) filters.push(["start_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["end_date", "<=", params.to_date]);
  if (params?.status === "Draft") filters.push(["docstatus", "=", "0"]);
  else if (params?.status === "Submitted") filters.push(["docstatus", "=", "1"]);
  else if (params?.status === "Cancelled") filters.push(["docstatus", "=", "2"]);
  if (params?.employee) filters.push(["employee", "=", params.employee]);

  const query = new URLSearchParams({
    fields: SALARY_SLIP_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Salary Slip?${query}`);
  return data;
}

// ── Payroll Entry ──

export interface PayrollEntry {
  name: string;
  company: string;
  posting_date: string;
  payroll_frequency: string;
  start_date: string;
  end_date: string;
  department?: string;
  branch?: string;
  docstatus: number;
  status?: string;
}

const PAYROLL_ENTRY_FIELDS = JSON.stringify([
  "name", "company", "posting_date", "payroll_frequency",
  "start_date", "end_date", "department", "branch", "docstatus",
]);

export async function getPayrollEntries(params?: {
  company?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<PayrollEntry>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);

  const query = new URLSearchParams({
    fields: PAYROLL_ENTRY_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 50),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Payroll Entry?${query}`);
  return data;
}

// ── Expense Claim ──

export interface ExpenseClaim {
  name: string;
  employee: string;
  employee_name: string;
  company: string;
  department?: string;
  posting_date: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  total_amount_reimbursed: number;
  status: string; // "Draft" | "Unpaid" | "Paid" | "Rejected" | "Cancelled"
  approval_status: string; // "Draft" | "Approved" | "Rejected"
  expense_type?: string;
}

const EXPENSE_CLAIM_FIELDS = JSON.stringify([
  "name", "employee", "employee_name", "company", "department",
  "posting_date", "total_claimed_amount", "total_sanctioned_amount",
  "total_amount_reimbursed", "status", "approval_status", "expense_type",
]);

export async function getExpenseClaims(params?: {
  company?: string;
  status?: string;
  approval_status?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<ExpenseClaim>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.status) filters.push(["status", "=", params.status]);
  if (params?.approval_status) filters.push(["approval_status", "=", params.approval_status]);

  const query = new URLSearchParams({
    fields: EXPENSE_CLAIM_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Expense Claim?${query}`);
  return data;
}

export async function approveExpenseClaim(name: string): Promise<void> {
  await apiClient.put(`/resource/Expense Claim/${encodeURIComponent(name)}`, {
    approval_status: "Approved",
  });
}

export async function rejectExpenseClaim(name: string): Promise<void> {
  await apiClient.put(`/resource/Expense Claim/${encodeURIComponent(name)}`, {
    approval_status: "Rejected",
  });
}

// ── Department ──

export interface Department {
  name: string;
  department_name: string;
  company: string;
  is_group: number;
  parent_department?: string;
}

export async function getDepartments(params?: {
  company?: string;
}): Promise<FrappeListResponse<Department>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);

  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "department_name", "company", "is_group", "parent_department"]),
    limit_page_length: "0",
    order_by: "name asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Department?${query}`);
  return data;
}

// ── HR Stats (aggregation helpers) ──

/** Get total employee count (optionally by company) */
export async function getEmployeeCount(company?: string): Promise<number> {
  const filters: string[][] = [["status", "=", "Active"]];
  if (company) filters.push(["company", "=", company]);

  const query = new URLSearchParams({
    filters: JSON.stringify(filters),
    limit_page_length: "0",
    fields: JSON.stringify(["name"]),
  });
  const { data } = await apiClient.get(`/resource/Employee?${query}`);
  return data.data?.length ?? 0;
}

/** Get open leave application count */
export async function getOpenLeaveCount(company?: string): Promise<number> {
  const filters: string[][] = [["status", "=", "Open"]];
  if (company) filters.push(["company", "=", company]);

  const query = new URLSearchParams({
    filters: JSON.stringify(filters),
    limit_page_length: "0",
    fields: JSON.stringify(["name"]),
  });
  const { data } = await apiClient.get(`/resource/Leave Application?${query}`);
  return data.data?.length ?? 0;
}

/** Get pending expense claims count */
export async function getPendingExpenseCount(company?: string): Promise<number> {
  const filters: string[][] = [["approval_status", "=", "Draft"]];
  if (company) filters.push(["company", "=", company]);

  const query = new URLSearchParams({
    filters: JSON.stringify(filters),
    limit_page_length: "0",
    fields: JSON.stringify(["name"]),
  });
  const { data } = await apiClient.get(`/resource/Expense Claim?${query}`);
  return data.data?.length ?? 0;
}
