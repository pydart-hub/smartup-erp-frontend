import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGet(path: string, params: Record<string, string>) {
  const url = `${FRAPPE_URL}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: ADMIN_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Frappe ${res.status}: ${await res.text()}`);
  return (await res.json()).data ?? [];
}

async function frappePost(path: string, body: unknown) {
  const url = `${FRAPPE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Frappe POST ${res.status}: ${await res.text()}`);
  return (await res.json()).data ?? {};
}

async function frappePut(path: string, body: unknown) {
  const url = `${FRAPPE_URL}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Frappe PUT ${res.status}: ${await res.text()}`);
  return (await res.json()).data ?? {};
}

// ── Fixed predefined budget categories (always shown in this order) ──────────
// Matches the director's expense planning sheet.
export const PREDEFINED_CATEGORIES: string[] = [
  "Head Office Expense",
  "EMI",
  "Maintenance",
  "Tab",
  "Projector",
  "Sticker",
  "Board",
  "A/C",
  "Projector Screen",
  "Sunpack Board",
  "Notice Banner",
  "Marketing",
];

// Projector Screen, Board have no dedicated GL accounts yet — they
// appear with ₹0 actual until accounts are created and mapped in the Director UI.

// ── Auth helper ───────────────────────────────────────────────────────────────
function getSessionRoles(request: NextRequest): string[] | null {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    return data.roles ?? [];
  } catch {
    return null;
  }
}

function isDirectorOrAdmin(roles: string[]): boolean {
  return (
    roles.includes("Director") ||
    roles.includes("Management") ||
    roles.includes("Administrator")
  );
}

// ── GET /api/director/budget ──────────────────────────────────────────────────
// Query params:
//   fiscal_year (optional, defaults to current)
//
// Returns: { fiscal_year, categories: [...], totals: { actual, budget } }
export async function GET(request: NextRequest) {
  const roles = getSessionRoles(request);
  if (!roles) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isDirectorOrAdmin(roles)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const fiscalYear = sp.get("fiscal_year") || "2026-2027";

  // ── 1. Determine fiscal year date range ───────────────────────────────────
  let fromDate: string | null = null;
  let toDate: string | null = null;
  try {
    const fyList: { name: string; year_start_date: string; year_end_date: string }[] =
      await frappeGet("/api/resource/Fiscal Year", {
        filters: JSON.stringify([["Fiscal Year", "name", "=", fiscalYear]]),
        fields: JSON.stringify(["name", "year_start_date", "year_end_date"]),
        limit_page_length: "1",
      });
    if (fyList.length > 0) {
      fromDate = fyList[0].year_start_date;
      toDate = fyList[0].year_end_date;
    }
  } catch {
    // Fall through without date filters
  }

  // ── 2. Fetch dynamic account → category map from Frappe ─────────────────
  // The map is managed by the Director from the UI (SmartUp Budget Account Map).
  // This replaces the old hardcoded ACCOUNT_CATEGORY_MAP constant.
  const accountMapRecords: { account: string; category: string }[] = await frappeGet(
    "/api/resource/SmartUp Budget Account Map",
    { fields: JSON.stringify(["account", "category"]), limit_page_length: "500" },
  ).catch(() => []);

  const dynamicAccountMap = new Map<string, string>(
    accountMapRecords.map((r) => [r.account, r.category]),
  );

  // ── 3. Fetch GL entries for Smart Up (head office) only ──────────────────
  const glFilters: string[][] = [
    ["GL Entry", "company", "=", "Smart Up"],
    ["GL Entry", "is_cancelled", "=", "0"],
  ];
  if (fromDate) glFilters.push(["GL Entry", "posting_date", ">=", fromDate]);
  if (toDate) glFilters.push(["GL Entry", "posting_date", "<=", toDate]);

  const glEntries: { account: string; debit: number; credit: number }[] =
    await frappeGet("/api/resource/GL Entry", {
      filters: JSON.stringify(glFilters),
      fields: JSON.stringify(["account", "debit", "credit"]),
      limit_page_length: "9999",
    });

  // Sum net debit per account, then classify using exact account name map
  const accountNetDebits = new Map<string, number>();
  for (const row of glEntries) {
    const net = (row.debit ?? 0) - (row.credit ?? 0);
    accountNetDebits.set(row.account, (accountNetDebits.get(row.account) ?? 0) + net);
  }

  // Aggregate into categories using the dynamic account → category map
  const categoryActuals = new Map<string, number>();
  for (const [account, net] of accountNetDebits.entries()) {
    if (net <= 0) continue;
    const cat = dynamicAccountMap.get(account);
    if (!cat) continue;
    categoryActuals.set(cat, (categoryActuals.get(cat) ?? 0) + net);
  }

  // ── 4. Fetch saved budgets from Frappe custom doctype ────────────────────
  const budgetRecords: { name: string; category: string; budget_amount: number; fiscal_year: string }[] =
    await frappeGet("/api/resource/SmartUp Expense Budget", {
      filters: JSON.stringify([["SmartUp Expense Budget", "fiscal_year", "=", fiscalYear]]),
      fields: JSON.stringify(["name", "category", "budget_amount", "fiscal_year"]),
      limit_page_length: "100",
    });

  const budgetMap = new Map<string, { name: string; amount: number }>();
  for (const rec of budgetRecords) {
    budgetMap.set(rec.category, { name: rec.name, amount: rec.budget_amount ?? 0 });
  }

  // ── 5. Build unified category list ────────────────────────────────────────
  // Always emit all PREDEFINED_CATEGORIES in order, then append any
  // remaining categories that have actuals but weren't in the predefined list
  // (shown as "Other" totals so nothing is silently lost).

  type CategoryRow = {
    category: string;
    actual: number;
    budget: number | null;
    budget_doc_name: string | null;
    variance: number | null;
    pct: number | null;
    status: "on_track" | "warning" | "over_budget" | "no_budget";
  };

  function buildRow(cat: string): CategoryRow {
    const actual = categoryActuals.get(cat) ?? 0;
    const budgetEntry = budgetMap.get(cat) ?? null;
    const budget = budgetEntry?.amount ?? null;
    let variance: number | null = null;
    let pct: number | null = null;
    let status: "on_track" | "warning" | "over_budget" | "no_budget" = "no_budget";

    if (budget !== null && budget > 0) {
      variance = budget - actual;
      pct = Math.round((actual / budget) * 100 * 10) / 10;
      if (pct >= 100) status = "over_budget";
      else if (pct >= 80) status = "warning";
      else status = "on_track";
    }

    return { category: cat, actual, budget, budget_doc_name: budgetEntry?.name ?? null, variance, pct, status };
  }

  const categories: CategoryRow[] = PREDEFINED_CATEGORIES.map(buildRow);

  // Append any GL-derived categories not in the predefined list
  const extraActuals = new Map<string, number>();
  for (const [cat, amt] of categoryActuals.entries()) {
    if (!PREDEFINED_CATEGORIES.includes(cat)) {
      extraActuals.set(cat, (extraActuals.get(cat) ?? 0) + amt);
    }
  }
  for (const [cat] of extraActuals.entries()) {
    categories.push(buildRow(cat));
  }

  // Append any budgets set for unknown categories
  for (const [cat] of budgetMap.entries()) {
    if (!PREDEFINED_CATEGORIES.includes(cat) && !extraActuals.has(cat)) {
      categories.push(buildRow(cat));
    }
  }

  const totalActual = [...categoryActuals.values()].reduce((s, v) => s + v, 0);
  const totalBudget = budgetRecords.reduce((s, r) => s + (r.budget_amount ?? 0), 0);

  return NextResponse.json({
    fiscal_year: fiscalYear,
    categories,
    totals: { actual: totalActual, budget: totalBudget },
  });
}

// ── POST /api/director/budget ─────────────────────────────────────────────────
// Body: { fiscal_year, category, budget_amount }
// Creates or updates a SmartUp Expense Budget record.
export async function POST(request: NextRequest) {
  const roles = getSessionRoles(request);
  if (!roles) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isDirectorOrAdmin(roles)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  let body: { fiscal_year: string; category: string; budget_amount: number; doc_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fiscal_year, category, budget_amount, doc_name } = body;
  if (!fiscal_year || !category || budget_amount === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof budget_amount !== "number" || budget_amount < 0) {
    return NextResponse.json({ error: "budget_amount must be a non-negative number" }, { status: 400 });
  }

  try {
    if (doc_name) {
      // Update existing record
      const updated = await frappePut(`/api/resource/SmartUp Expense Budget/${encodeURIComponent(doc_name)}`, {
        budget_amount,
      });
      return NextResponse.json({ success: true, doc_name: updated.name ?? doc_name });
    } else {
      // Check if a record already exists (avoid duplicates)
      const existing: { name: string }[] = await frappeGet("/api/resource/SmartUp Expense Budget", {
        filters: JSON.stringify([
          ["SmartUp Expense Budget", "fiscal_year", "=", fiscal_year],
          ["SmartUp Expense Budget", "category", "=", category],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "1",
      });

      if (existing.length > 0) {
        // Update
        const updated = await frappePut(
          `/api/resource/SmartUp Expense Budget/${encodeURIComponent(existing[0].name)}`,
          { budget_amount },
        );
        return NextResponse.json({ success: true, doc_name: updated.name ?? existing[0].name });
      }

      // Create new
      const created = await frappePost("/api/resource/SmartUp Expense Budget", {
        doctype: "SmartUp Expense Budget",
        fiscal_year,
        category,
        budget_amount,
      });
      return NextResponse.json({ success: true, doc_name: created.name });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
