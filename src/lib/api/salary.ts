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
  updates: Partial<Pick<SmartUpSalaryRecord, "lop_days" | "total_working_days" | "lop_deduction" | "custom_other_deduction" | "custom_other_deduction_remark" | "net_salary" | "basic_salary" | "status" | "payment_date" | "remarks">>
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

// ── Journal Entry ──

export interface JournalEntryLine {
  account: string;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
  party_type?: string;
  party?: string;
}

/**
 * Create a Draft Journal Entry in Frappe.
 * Standard salary posting:
 *   Dr  Salary - {ABBR}            (expense)
 *   Cr  {Employee Name} Payable - {ABBR}  (liability)
 */
export async function createJournalEntry(params: {
  company: string;
  posting_date: string;
  user_remark: string;
  accounts: JournalEntryLine[];
}): Promise<FrappeSingleResponse<{ name: string; docstatus: number }>> {
  const { data } = await apiClient.post("/resource/Journal Entry", {
    voucher_type: "Journal Entry",
    company: params.company,
    posting_date: params.posting_date,
    user_remark: params.user_remark,
    accounts: params.accounts,
  });
  return data;
}

/** Submit a Frappe document (set docstatus = 1).
 * Fetches the full doc first to include the modified timestamp and all fields,
 * avoiding TimestampMismatchError and ValidationErrors from partial doc objects.
 */
export async function submitDocument(doctype: string, name: string): Promise<void> {
  // Fetch the full document to get all fields including current modified timestamp
  const { data: fetchRes } = await apiClient.get(`/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  const fullDoc = (fetchRes as { data: Record<string, unknown> }).data;
  // Submit using the full document
  await apiClient.post("/method/frappe.client.submit", { doc: fullDoc });
}

// ── GL Entry — Employee Payable Account Status ──

export interface EmployeeGLStatus {
  account: string;
  totalCredit: number;  // salary accruals (Dr Salary Expense / Cr Payable)
  totalDebit: number;   // bank payments (Dr Payable / Cr Bank)
  balance: number;      // totalCredit - totalDebit = amount still owed to employee
  lastVoucherDate?: string;
  lastVoucherNo?: string;
}

/**
 * Query GL Entry for a list of employee payable accounts.
 * Returns per-account balance = totalCredit - totalDebit.
 *
 * balance > 0  → Accrued (salary JE posted, not yet paid out)
 * balance = 0 + totalCredit > 0  → Paid (fully settled)
 * totalCredit = 0  → Pending (no salary JE yet)
 */
export async function getEmployeeGLStatus(
  payableAccounts: string[]
): Promise<Record<string, EmployeeGLStatus>> {
  if (!payableAccounts.length) return {};

  const { data: res } = await apiClient.post("/method/frappe.client.get_list", {
    doctype: "GL Entry",
    fields: ["account", "debit", "credit", "voucher_no", "posting_date"],
    filters: [
      ["account", "in", payableAccounts],
      ["is_cancelled", "=", 0],
    ],
    limit_page_length: 2000,
    order_by: "posting_date desc",
  });

  const entries: { account: string; debit: number; credit: number; voucher_no: string; posting_date: string }[] =
    ((res as { message?: unknown }).message as { account: string; debit: number; credit: number; voucher_no: string; posting_date: string }[] | null) ?? [];

  const result: Record<string, EmployeeGLStatus> = {};

  for (const acct of payableAccounts) {
    result[acct] = { account: acct, totalCredit: 0, totalDebit: 0, balance: 0 };
  }

  for (const e of entries) {
    const s = result[e.account];
    if (!s) continue;
    s.totalCredit += e.credit ?? 0;
    s.totalDebit += e.debit ?? 0;
    // Track most recent voucher (entries ordered desc, so first seen = latest)
    if (!s.lastVoucherDate) {
      s.lastVoucherDate = e.posting_date;
      s.lastVoucherNo = e.voucher_no;
    }
  }

  for (const s of Object.values(result)) {
    s.balance = Math.max(0, s.totalCredit - s.totalDebit);
  }

  return result;
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
