/**
 * salary.ts
 * API layer for SmartUp HR Salary module.
 *
 * Uses:
 *   - Frappe Employee          (native ERPNext doctype with custom_basic_salary field)
 *   - SmartUp Salary Record   (custom doctype for monthly LOP/salary tracking)
 *
 * These are completely separate from ERPNext Payroll / Salary Slip.
 */

import apiClient from "./client";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";
import type { SmartUpSalaryRecord, SalaryPeriod } from "@/lib/types/salary";

// ── Field lists ──

const SALARY_RECORD_FIELDS = JSON.stringify([
  "name", "staff", "staff_name", "custom_employee", "custom_employee_name", "company",
  "salary_month", "salary_year", "period_label",
  "total_working_days", "lop_days", "basic_salary",
  "lop_deduction", "custom_other_deduction", "custom_other_deduction_remark",
  "custom_available_leave",
  "net_salary", "status",
  "payment_date", "remarks", "creation", "modified",
]);

// ── SmartUp Salary Record ──

export async function getSalaryRecords(params?: {
  company?: string;
  salary_year?: number;
  salary_month?: number;
  employee?: string;
  status?: "Draft" | "Paid";
  limit_page_length?: number;
}): Promise<FrappeListResponse<SmartUpSalaryRecord>> {
  const filters: (string | number)[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.salary_year) filters.push(["salary_year", "=", params.salary_year]);
  if (params?.salary_month) filters.push(["salary_month", "=", params.salary_month]);
  if (params?.employee) filters.push(["staff", "=", params.employee]);
  if (params?.status) filters.push(["status", "=", params.status]);

  const query = new URLSearchParams({
    fields: SALARY_RECORD_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 200),
    order_by: "staff_name asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/SmartUp Salary Record?${query}`);
  return data;
}

export async function getSalaryRecord(name: string): Promise<FrappeSingleResponse<SmartUpSalaryRecord>> {
  const { data } = await apiClient.get(`/resource/SmartUp Salary Record/${encodeURIComponent(name)}`);
  return data;
}

export async function createSalaryRecord(
  record: Omit<SmartUpSalaryRecord, "name" | "staff_name" | "period_label" | "creation" | "modified">
): Promise<FrappeSingleResponse<SmartUpSalaryRecord>> {
  const { data } = await apiClient.post("/resource/SmartUp Salary Record", record);
  return data;
}

export async function updateSalaryRecord(
  name: string,
  updates: Partial<Pick<SmartUpSalaryRecord, "lop_days" | "total_working_days" | "lop_deduction" | "custom_other_deduction" | "custom_other_deduction_remark" | "custom_available_leave" | "net_salary" | "basic_salary" | "status" | "payment_date" | "remarks">>
): Promise<FrappeSingleResponse<SmartUpSalaryRecord>> {
  const { data } = await apiClient.put(
    `/resource/SmartUp Salary Record/${encodeURIComponent(name)}`,
    updates
  );
  return data;
}

export async function deleteSalaryRecord(name: string): Promise<void> {
  await apiClient.delete(`/resource/SmartUp Salary Record/${encodeURIComponent(name)}`);
}

// ── Utility helpers ──

/** Calculate LOP deduction and net salary from inputs */
export function calculateSalary(
  basicSalary: number,
  lopDays: number,
  totalWorkingDays: number
): { lopDeduction: number; netSalary: number } {
  const lopDeduction =
    totalWorkingDays > 0
      ? Math.round((basicSalary * lopDays) / totalWorkingDays)
      : 0;
  const netSalary = Math.max(0, basicSalary - lopDeduction);
  return { lopDeduction, netSalary };
}

/** Return a sorted list of last N months for the period picker */
export function getRecentPeriods(count = 12): SalaryPeriod[] {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const periods: SalaryPeriod[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return periods;
}

/** Format month/year to "April 2026" */
export function formatPeriod(month: number, year: number): string {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
