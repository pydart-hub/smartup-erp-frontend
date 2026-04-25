// ── SmartUp HR Salary Module Types ──
// Uses Frappe Employee doctype for people, custom SmartUp Salary Record for LOP/salary tracking.

export interface SmartUpSalaryRecord {
  name: string;
  staff: string; // legacy — kept for backward compat
  staff_name: string; // legacy
  custom_employee?: string; // Link → Employee (new)
  custom_employee_name?: string; // fetched from Employee (new)
  company: string;
  salary_month: number; // 1-12
  salary_year: number;
  period_label: string; // e.g. "April 2026"
  total_working_days: number; // default 26
  lop_days: number; // Loss of Pay days
  basic_salary: number;
  lop_deduction: number; // basic × lop_days / total_working_days
  custom_other_deduction?: number; // additional deduction (advance recovery, fine, etc.)
  custom_other_deduction_remark?: string; // reason for other deduction
  net_salary: number; // basic - lop_deduction - custom_other_deduction
  status: "Draft" | "Paid";
  payment_date?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
}

export interface BranchSalarySummary {
  branch: string;
  staff_count: number;
  total_basic: number;
  total_lop_days: number;
  total_lop_deduction: number;
  total_net: number;
  period: string; // "2026-04"
  paid_count: number;
  draft_count: number;
}

export interface SalaryPeriod {
  year: number;
  month: number;
  label: string; // "April 2026"
}
