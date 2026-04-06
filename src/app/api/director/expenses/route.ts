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
  if (!res.ok) throw new Error(`Frappe ${res.status}`);
  return (await res.json()).data ?? [];
}

/**
 * GET /api/director/expenses?mode=summary|branch-detail|transactions
 *
 * mode=summary          → per-branch expense totals
 * mode=branch-detail    → category breakdown for a branch  (&branch=...)
 * mode=transactions     → JV-level GL entries for a branch (&branch=...&from_date=...&to_date=...&limit=...&offset=...)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: {
      default_company?: string;
      allowed_companies?: string[];
      roles?: string[];
    };
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString(),
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const roles = sessionData.roles ?? [];
    const isDirector =
      roles.includes("Director") ||
      roles.includes("Management") ||
      roles.includes("Administrator");
    if (!isDirector) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const mode = sp.get("mode") || "summary";

    // ─── mode=summary ───
    if (mode === "summary") {
      // Get all expense-type leaf accounts
      // Fetch expense account names (used as a lookup set)
      const expenseAccounts: { name: string; company: string; account_name: string }[] =
        await frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
          ]),
          fields: JSON.stringify(["name", "company", "account_name"]),
          limit_page_length: "500",
        });

      const expenseAccountSet = new Set(expenseAccounts.map((a) => a.name));

      // Fetch ALL GL debits grouped by company+account (small result set ~80 rows).
      // We filter against the expense account set in-memory because passing 300+
      // account names in a Frappe "in" filter exceeds the URL length limit.
      const allGLTotals: {
        company: string;
        account: string;
        total_debit: number;
        entry_count: number;
      }[] = await frappeGet("/api/resource/GL Entry", {
        filters: JSON.stringify([
          ["is_cancelled", "=", 0],
          ["debit", ">", 0],
        ]),
        fields: JSON.stringify([
          "company",
          "account",
          "sum(debit) as total_debit",
          "count(name) as entry_count",
        ]),
        group_by: "company,account",
        limit_page_length: "1000",
        order_by: "sum(debit) desc",
      });

      // Filter to expense accounts only
      const glTotals = allGLTotals.filter((r) => expenseAccountSet.has(r.account));

      // Build per-branch summary
      const branchMap = new Map<
        string,
        { total: number; entryCount: number; categories: Record<string, number> }
      >();

      for (const row of glTotals) {
        if (!branchMap.has(row.company)) {
          branchMap.set(row.company, { total: 0, entryCount: 0, categories: {} });
        }
        const b = branchMap.get(row.company)!;
        b.total += row.total_debit;
        b.entryCount += row.entry_count;

        // Find the friendly account name
        const acct = expenseAccounts.find((a) => a.name === row.account);
        const catName = acct?.account_name ?? row.account;
        b.categories[catName] = (b.categories[catName] ?? 0) + row.total_debit;
      }

      const branches = Array.from(branchMap.entries()).map(
        ([company, data]) => ({
          company,
          total: data.total,
          entryCount: data.entryCount,
          topCategories: Object.entries(data.categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount })),
        }),
      );

      // Sort by total desc
      branches.sort((a, b) => b.total - a.total);

      const grandTotal = branches.reduce((s, b) => s + b.total, 0);
      const totalEntries = branches.reduce((s, b) => s + b.entryCount, 0);

      return NextResponse.json({ branches, grandTotal, totalEntries });
    }

    // ─── branch required for remaining modes ───
    const branch = sp.get("branch") || "";
    if (!branch) {
      return NextResponse.json(
        { error: "branch is required" },
        { status: 400 },
      );
    }

    const allowed = sessionData.allowed_companies ?? [];
    const isAdmin = roles.includes("Administrator");
    if (!isAdmin && allowed.length > 0 && !allowed.includes(branch)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const fromDate = sp.get("from_date") || "";
    const toDate = sp.get("to_date") || "";

    // ─── mode=branch-detail ───
    if (mode === "branch-detail") {
      // All expense leaf accounts for this branch
      const branchAccounts: { name: string; account_name: string }[] =
        await frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name", "account_name"]),
          limit_page_length: "200",
        });

      const acctNames = branchAccounts.map((a) => a.name);
      if (acctNames.length === 0) {
        return NextResponse.json({
          categories: [],
          total: 0,
          entryCount: 0,
        });
      }

      const glFilters: (string | number | string[])[][] = [
        ["is_cancelled", "=", 0],
        ["debit", ">", 0],
        ["company", "=", branch],
        ["account", "in", acctNames],
      ];
      if (fromDate) glFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) glFilters.push(["posting_date", "<=", toDate]);

      const catTotals: { account: string; total_debit: number; entry_count: number }[] =
        await frappeGet("/api/resource/GL Entry", {
          filters: JSON.stringify(glFilters),
          fields: JSON.stringify([
            "account",
            "sum(debit) as total_debit",
            "count(name) as entry_count",
          ]),
          group_by: "account",
          limit_page_length: "200",
          order_by: "sum(debit) desc",
        });

      const categories = catTotals.map((r) => ({
        account: r.account,
        accountName:
          branchAccounts.find((a) => a.name === r.account)?.account_name ??
          r.account,
        total: r.total_debit,
        entryCount: r.entry_count,
      }));

      const total = categories.reduce((s, c) => s + c.total, 0);
      const entryCount = categories.reduce((s, c) => s + c.entryCount, 0);

      return NextResponse.json({ categories, total, entryCount });
    }

    // ─── mode=transactions ───
    if (mode === "transactions") {
      const limit = parseInt(sp.get("limit") || "100", 10);
      const offset = parseInt(sp.get("offset") || "0", 10);

      // Get expense account names for this branch
      const branchAccounts: { name: string }[] = await frappeGet(
        "/api/resource/Account",
        {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name"]),
          limit_page_length: "200",
        },
      );

      const acctNames = branchAccounts.map((a) => a.name);
      if (acctNames.length === 0) {
        return NextResponse.json({ transactions: [], total_count: 0 });
      }

      const txFilters: (string | number | string[])[][] = [
        ["is_cancelled", "=", 0],
        ["debit", ">", 0],
        ["company", "=", branch],
        ["account", "in", acctNames],
      ];
      if (fromDate) txFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) txFilters.push(["posting_date", "<=", toDate]);

      const [transactions, countRes] = await Promise.all([
        frappeGet("/api/resource/GL Entry", {
          filters: JSON.stringify(txFilters),
          fields: JSON.stringify([
            "name",
            "posting_date",
            "account",
            "debit",
            "voucher_type",
            "voucher_no",
            "against",
            "remarks",
          ]),
          order_by: "posting_date desc, creation desc",
          limit_page_length: String(limit),
          limit_start: String(offset),
        }),
        fetch(
          `${FRAPPE_URL}/api/method/frappe.client.get_count?${new URLSearchParams({
            doctype: "GL Entry",
            filters: JSON.stringify(txFilters),
          })}`,
          { headers: ADMIN_HEADERS, cache: "no-store" },
        ).then((r) => r.json()),
      ]);

      return NextResponse.json({
        transactions,
        total_count: countRes.message ?? transactions.length,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[director/expenses] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
