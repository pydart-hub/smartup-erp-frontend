/**
 * expenses.ts — Client-side API functions for expense dashboard.
 */

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
}

export interface ExpenseCategory {
  account: string;
  accountName: string;
  total: number;
  entryCount: number;
}

export interface ExpenseBranchDetailResponse {
  categories: ExpenseCategory[];
  total: number;
  entryCount: number;
}

export interface ExpenseTransaction {
  name: string;
  posting_date: string;
  account: string;
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
  opts?: { from_date?: string; to_date?: string },
): Promise<ExpenseBranchDetailResponse> {
  const params = new URLSearchParams({ mode: "branch-detail", branch });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
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
    limit?: number;
    offset?: number;
  },
): Promise<ExpenseTransactionsResponse> {
  const params = new URLSearchParams({ mode: "transactions", branch });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/director/expenses?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`expense transactions failed: ${res.status}`);
  return res.json();
}
