export type BudgetStatus = "on_track" | "warning" | "over_budget" | "no_budget";

export interface BudgetCategory {
  category: string;
  actual: number;
  budget: number | null;
  budget_doc_name: string | null;
  variance: number | null;
  pct: number | null;
  status: BudgetStatus;
}

export interface BudgetResponse {
  fiscal_year: string;
  categories: BudgetCategory[];
  totals: { actual: number; budget: number };
}

export async function getBudgetData(fiscalYear: string): Promise<BudgetResponse> {
  const res = await fetch(`/api/director/budget?fiscal_year=${encodeURIComponent(fiscalYear)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function saveBudgetEntry(opts: {
  fiscal_year: string;
  category: string;
  budget_amount: number;
  doc_name?: string | null;
}): Promise<{ success: boolean; doc_name: string }> {
  const res = await fetch("/api/director/budget", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fiscal_year: opts.fiscal_year,
      category: opts.category,
      budget_amount: opts.budget_amount,
      ...(opts.doc_name ? { doc_name: opts.doc_name } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Account Mappings ──────────────────────────────────────────────────────────
export interface AccountMapping {
  name: string;
  account: string;
  category: string;
}

export interface AccountMappingsResponse {
  mappings: AccountMapping[];
  categories: readonly string[];
  all_accounts: string[];
}

export async function getAccountMappings(): Promise<AccountMappingsResponse> {
  const res = await fetch("/api/director/budget/accounts", { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function addAccountMapping(account: string, category: string): Promise<{ success: boolean; name: string }> {
  const res = await fetch("/api/director/budget/accounts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function deleteAccountMapping(name: string): Promise<void> {
  const res = await fetch("/api/director/budget/accounts", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
}
