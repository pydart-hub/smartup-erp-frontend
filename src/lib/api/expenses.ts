/**
 * expenses.ts — Client-side API functions for expense dashboard.
 */

import type { ExpenseClassKey } from "@/lib/utils/expense-classification";

export type ExpenseParentFilter = "BRANCH" | "HO";
export type ExpenseNatureFilter = "FIXED" | "VARIABLE";

// ── Types ──

export interface ExpenseBranchSummary {
  company: string;
  total: number;
  entryCount: number;
  topCategories: { name: string; amount: number }[];
}

export interface ExpenseSummaryResponse {
  branches: ExpenseBranchSummary[];
  grandTotal: number;
  totalEntries: number;
  classTotals: { key: ExpenseClassKey; label: string; total: number }[];
}

export interface ExpenseCategory {
  account: string;
  accountName: string;
  parentGroup: string | null;
  expenseClass: ExpenseClassKey;
  expenseClassLabel: string;
  total: number;
  entryCount: number;
}

export interface ExpenseGroup {
  name: string;
  total: number;
  entryCount: number;
}

export interface ExpenseBranchDetailResponse {
  categories: ExpenseCategory[];
  groups: ExpenseGroup[];
  classTotals: {
    key: ExpenseClassKey;
    label: string;
    total: number;
    entryCount: number;
  }[];
  total: number;
  entryCount: number;
}

export interface ExpenseTransaction {
  name: string;
  posting_date: string;
  account: string;
  expenseClass: ExpenseClassKey;
  expenseClassLabel: string;
  debit: number;
  voucher_type: string;
  voucher_no: string;
  against: string;
  remarks: string | null;
}

export interface ExpenseTransactionsResponse {
  transactions: ExpenseTransaction[];
  total_count: number;
}

// ── Fetch functions ──

export async function getExpenseSummary(): Promise<ExpenseSummaryResponse> {
  const res = await fetch("/api/director/expenses?mode=summary", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`expense summary failed: ${res.status}`);
  return res.json();
}

export async function getBranchExpenseDetail(
  branch: string,
  opts?: {
    from_date?: string;
    to_date?: string;
    class_filter?: ExpenseClassKey;
    class_parent?: ExpenseParentFilter;
    class_nature?: ExpenseNatureFilter;
  },
): Promise<ExpenseBranchDetailResponse> {
  const params = new URLSearchParams({ mode: "branch-detail", branch });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.class_filter) params.set("class_filter", opts.class_filter);
  if (opts?.class_parent) params.set("class_parent", opts.class_parent);
  if (opts?.class_nature) params.set("class_nature", opts.class_nature);
  const res = await fetch(`/api/director/expenses?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`expense branch-detail failed: ${res.status}`);
  return res.json();
}

export async function getBranchExpenseTransactions(
  branch: string,
  opts?: {
    from_date?: string;
    to_date?: string;
    class_filter?: ExpenseClassKey;
    class_parent?: ExpenseParentFilter;
    class_nature?: ExpenseNatureFilter;
    limit?: number;
    offset?: number;
  },
): Promise<ExpenseTransactionsResponse> {
  const params = new URLSearchParams({ mode: "transactions", branch });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.class_filter) params.set("class_filter", opts.class_filter);
  if (opts?.class_parent) params.set("class_parent", opts.class_parent);
  if (opts?.class_nature) params.set("class_nature", opts.class_nature);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/director/expenses?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`expense transactions failed: ${res.status}`);
  return res.json();
}

// ── Class overview (cross-branch, filtered by classification type) ──

export interface ClassOverviewResponse {
  total: number;
  entryCount: number;
  classTotals: { key: ExpenseClassKey; label: string; total: number }[];
  branchBreakdown: {
    company: string;
    total: number;
    pct: number;
    byClass: { key: ExpenseClassKey; label: string; total: number; pct: number }[];
  }[];
  topCategories: { accountName: string; total: number; expenseClass: ExpenseClassKey; label: string }[];
}

export async function getClassOverview(
  classParent?: ExpenseParentFilter | "ALL",
  opts?: { from_date?: string; to_date?: string },
): Promise<ClassOverviewResponse> {
  const params = new URLSearchParams({ mode: "class-overview" });
  if (classParent && classParent !== "ALL") params.set("class_parent", classParent);
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  const res = await fetch(`/api/director/expenses?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`class-overview failed: ${res.status}`);
  return res.json();
}
