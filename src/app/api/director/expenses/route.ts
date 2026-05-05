import { NextRequest, NextResponse } from "next/server";
import {
  EXPENSE_CLASS_LABELS,
  EXPENSE_CLASS_ORDER,
  classifyExpense,
  isExpenseClassKey,
  type ExpenseClassKey,
} from "@/lib/utils/expense-classification";

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

type ExpenseParentFilter = "BRANCH" | "HO";
type ExpenseNatureFilter = "FIXED" | "VARIABLE";

function parseParentFilter(value: string | null): ExpenseParentFilter | null {
  if (value === "BRANCH" || value === "HO") return value;
  return null;
}

function parseNatureFilter(value: string | null): ExpenseNatureFilter | null {
  if (value === "FIXED" || value === "VARIABLE") return value;
  return null;
}

function classMetaFromKey(key: ExpenseClassKey): {
  parent: ExpenseParentFilter | null;
  nature: ExpenseNatureFilter | null;
} {
  if (key === "BRANCH_FIXED") return { parent: "BRANCH", nature: "FIXED" };
  if (key === "BRANCH_VARIABLE") return { parent: "BRANCH", nature: "VARIABLE" };
  if (key === "HO_FIXED") return { parent: "HO", nature: "FIXED" };
  if (key === "HO_VARIABLE") return { parent: "HO", nature: "VARIABLE" };
  return { parent: null, nature: null };
}

function matchesClassFilters(
  expenseClass: ExpenseClassKey,
  opts: {
    classFilter: ExpenseClassKey | null;
    parentFilter: ExpenseParentFilter | null;
    natureFilter: ExpenseNatureFilter | null;
  },
): boolean {
  if (opts.classFilter && expenseClass !== opts.classFilter) return false;
  const meta = classMetaFromKey(expenseClass);
  if (opts.parentFilter && meta.parent !== opts.parentFilter) return false;
  if (opts.natureFilter && meta.nature !== opts.natureFilter) return false;
  return true;
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
      const [expenseAccounts, groupAccounts]: [
        { name: string; company: string; account_name: string; parent_account: string | null }[],
        { name: string; account_name: string }[],
      ] = await Promise.all([
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
          ]),
          fields: JSON.stringify(["name", "company", "account_name", "parent_account"]),
          limit_page_length: "500",
        }),
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 1],
          ]),
          fields: JSON.stringify(["name", "account_name"]),
          limit_page_length: "200",
        }),
      ]);

      const expenseAccountSet = new Set(expenseAccounts.map((a) => a.name));

      // Build group name lookup: account full name → friendly account_name
      const groupNameMap = new Map<string, string>();
      for (const g of groupAccounts) {
        groupNameMap.set(g.name, g.account_name);
      }

      // Fetch ALL GL debits grouped by company+account (small result set ~80 rows).
      // We filter against the expense account set in-memory because passing 300+
      // account names in a Frappe "in" filter exceeds the URL length limit.
      // Use sum(debit) - sum(credit) to match Frappe P&L net calculation.
      const allGLTotals: {
        company: string;
        account: string;
        total_debit: number;
        total_credit: number;
        entry_count: number;
      }[] = await frappeGet("/api/resource/GL Entry", {
        filters: JSON.stringify([
          ["is_cancelled", "=", 0],
        ]),
        fields: JSON.stringify([
          "company",
          "account",
          "sum(debit) as total_debit",
          "sum(credit) as total_credit",
          "count(name) as entry_count",
        ]),
        group_by: "company,account",
        limit_page_length: "1000",
        order_by: "sum(debit) desc",
      });

      // Filter to expense accounts only
      const glTotals = allGLTotals.filter((r) => expenseAccountSet.has(r.account));

      // Build per-branch summary + global class totals
      const branchMap = new Map<
        string,
        { total: number; entryCount: number; categories: Record<string, number> }
      >();
      const classMap = new Map<ExpenseClassKey, number>();

      for (const row of glTotals) {
        // Net = debit - credit (matches Frappe P&L methodology)
        const net = (row.total_debit ?? 0) - (row.total_credit ?? 0);
        if (net <= 0) continue;
        if (!branchMap.has(row.company)) {
          branchMap.set(row.company, { total: 0, entryCount: 0, categories: {} });
        }
        const b = branchMap.get(row.company)!;
        b.total += net;
        b.entryCount += row.entry_count;

        // Find the friendly account name
        const acct = expenseAccounts.find((a) => a.name === row.account);
        const catName = acct?.account_name ?? row.account;
        b.categories[catName] = (b.categories[catName] ?? 0) + net;

        // Classify for global class totals
        const parentAcctName = acct?.parent_account ?? null;
        const parentGroupName = parentAcctName ? (groupNameMap.get(parentAcctName) ?? parentAcctName) : null;
        const classification = classifyExpense({
          parentGroupName,
          accountName: acct?.account_name ?? row.account,
        });
        classMap.set(classification.key, (classMap.get(classification.key) ?? 0) + net);
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

      const classTotals = EXPENSE_CLASS_ORDER
        .filter((k) => k !== "UNMAPPED")
        .map((k) => ({
          key: k,
          label: EXPENSE_CLASS_LABELS[k],
          total: classMap.get(k) ?? 0,
        }));

      return NextResponse.json({ branches, grandTotal, totalEntries, classTotals });
    }

    // ─── mode=class-overview ───
    // Cross-branch aggregation filtered by classification type (no branch required)
    // ?mode=class-overview&class_parent=BRANCH|HO  (omit for ALL)
    if (mode === "class-overview") {
      const coParentFilter = parseParentFilter(sp.get("class_parent"));
      const coFromDate = sp.get("from_date") || "";
      const coToDate = sp.get("to_date") || "";

      const [allLeafAccts, allGroupAccts]: [
        { name: string; company: string; account_name: string; parent_account: string | null }[],
        { name: string; account_name: string }[],
      ] = await Promise.all([
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([["root_type", "=", "Expense"], ["is_group", "=", 0]]),
          fields: JSON.stringify(["name", "company", "account_name", "parent_account"]),
          limit_page_length: "2000",
        }),
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([["root_type", "=", "Expense"], ["is_group", "=", 1]]),
          fields: JSON.stringify(["name", "account_name"]),
          limit_page_length: "500",
        }),
      ]);

      const coGroupNameMap = new Map(allGroupAccts.map((g) => [g.name, g.account_name]));

      const acctClassMap = new Map<string, { company: string; accountName: string; expenseClass: ExpenseClassKey }>();
      for (const a of allLeafAccts) {
        const parentGroupName = a.parent_account ? (coGroupNameMap.get(a.parent_account) ?? a.parent_account) : null;
        const cls = classifyExpense({ parentGroupName, accountName: a.account_name });
        acctClassMap.set(a.name, { company: a.company, accountName: a.account_name, expenseClass: cls.key });
      }

      const matchingAcctSet = new Set(
        Array.from(acctClassMap.entries())
          .filter(([, meta]) => matchesClassFilters(meta.expenseClass, { classFilter: null, parentFilter: coParentFilter, natureFilter: null }))
          .map(([name]) => name),
      );

      if (matchingAcctSet.size === 0) {
        return NextResponse.json({ total: 0, entryCount: 0, classTotals: [], branchBreakdown: [], topCategories: [] });
      }

      // Fetch all GL entries without account filter to avoid URL length limits,
      // then filter in-memory (same approach as summary mode).
      const coGlBaseFilters: (string | number | string[])[][] = [["is_cancelled", "=", 0]];
      if (coFromDate) coGlBaseFilters.push(["posting_date", ">=", coFromDate]);
      if (coToDate) coGlBaseFilters.push(["posting_date", "<=", coToDate]);

      const allCoGlRows: { company: string; account: string; total_debit: number; total_credit: number; entry_count: number }[] =
        await frappeGet("/api/resource/GL Entry", {
          filters: JSON.stringify(coGlBaseFilters),
          fields: JSON.stringify(["company", "account", "sum(debit) as total_debit", "sum(credit) as total_credit", "count(name) as entry_count"]),
          group_by: "company,account",
          limit_page_length: "2000",
          order_by: "sum(debit) desc",
        });

      const coGlRows = allCoGlRows.filter((r) => matchingAcctSet.has(r.account));

      const coClassMap = new Map<ExpenseClassKey, number>();
      const coBranchMap = new Map<string, number>();
      const coBranchClassMap = new Map<string, Map<ExpenseClassKey, number>>();
      const coCatMap = new Map<string, { total: number; expenseClass: ExpenseClassKey }>();

      for (const row of coGlRows) {
        const net = (row.total_debit ?? 0) - (row.total_credit ?? 0);
        if (net <= 0) continue;
        const meta = acctClassMap.get(row.account);
        if (!meta) continue;
        coClassMap.set(meta.expenseClass, (coClassMap.get(meta.expenseClass) ?? 0) + net);
        coBranchMap.set(row.company, (coBranchMap.get(row.company) ?? 0) + net);
        // per-branch per-class
        if (!coBranchClassMap.has(row.company)) coBranchClassMap.set(row.company, new Map());
        const bcm = coBranchClassMap.get(row.company)!;
        bcm.set(meta.expenseClass, (bcm.get(meta.expenseClass) ?? 0) + net);
        const existing = coCatMap.get(meta.accountName) ?? { total: 0, expenseClass: meta.expenseClass };
        existing.total += net;
        coCatMap.set(meta.accountName, existing);
      }

      const coGrandTotal = Array.from(coBranchMap.values()).reduce((s, v) => s + v, 0);
      const coEntryCount = coGlRows.reduce((s, r) => {
        const net = (r.total_debit ?? 0) - (r.total_credit ?? 0);
        return net > 0 ? s + r.entry_count : s;
      }, 0);

      const coClassTotals = EXPENSE_CLASS_ORDER
        .filter((k) => k !== "UNMAPPED")
        .map((k) => ({ key: k, label: EXPENSE_CLASS_LABELS[k], total: coClassMap.get(k) ?? 0 }))
        .filter((c) => c.total > 0);

      const coBranchBreakdown = Array.from(coBranchMap.entries())
        .map(([company, brTotal]) => {
          const bcm = coBranchClassMap.get(company) ?? new Map<ExpenseClassKey, number>();
          const byClass = EXPENSE_CLASS_ORDER
            .filter((k) => k !== "UNMAPPED" && (bcm.get(k) ?? 0) > 0)
            .map((k) => ({ key: k, label: EXPENSE_CLASS_LABELS[k], total: bcm.get(k) ?? 0, pct: brTotal > 0 ? ((bcm.get(k) ?? 0) / brTotal) * 100 : 0 }));
          return { company, total: brTotal, pct: coGrandTotal > 0 ? (brTotal / coGrandTotal) * 100 : 0, byClass };
        })
        .sort((a, b) => b.total - a.total);

      const coTopCategories = Array.from(coCatMap.entries())
        .map(([accountName, data]) => ({ accountName, total: data.total, expenseClass: data.expenseClass, label: EXPENSE_CLASS_LABELS[data.expenseClass] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      return NextResponse.json({ total: coGrandTotal, entryCount: coEntryCount, classTotals: coClassTotals, branchBreakdown: coBranchBreakdown, topCategories: coTopCategories });
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
    const rawClassFilter = sp.get("class_filter");
    const classFilter = isExpenseClassKey(rawClassFilter) ? rawClassFilter : null;
    const parentFilter = parseParentFilter(sp.get("class_parent"));
    const natureFilter = parseNatureFilter(sp.get("class_nature"));

    // ─── mode=branch-detail ───
    if (mode === "branch-detail") {
      // All expense accounts for this branch (both leaf and group)
      const [branchAccounts, groupAccounts]: [
        { name: string; account_name: string; parent_account: string | null }[],
        { name: string; account_name: string; parent_account: string | null }[],
      ] = await Promise.all([
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name", "account_name", "parent_account"]),
          limit_page_length: "200",
        }),
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 1],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name", "account_name", "parent_account"]),
          limit_page_length: "50",
        }),
      ]);

      // Build a lookup: group account name → friendly name
      const groupNameMap = new Map<string, string>();
      for (const g of groupAccounts) {
        groupNameMap.set(g.name, g.account_name);
      }

      const acctNames = branchAccounts.map((a) => a.name);
      if (acctNames.length === 0) {
        return NextResponse.json({
          categories: [],
          groups: [],
          classTotals: [],
          total: 0,
          entryCount: 0,
        });
      }

      const glFilters: (string | number | string[])[][] = [
        ["is_cancelled", "=", 0],
        ["company", "=", branch],
        ["account", "in", acctNames],
      ];
      if (fromDate) glFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) glFilters.push(["posting_date", "<=", toDate]);

      // Fetch both debit and credit sums — net = debit - credit (matches Frappe P&L)
      const catTotals: { account: string; total_debit: number; total_credit: number; entry_count: number }[] =
        await frappeGet("/api/resource/GL Entry", {
          filters: JSON.stringify(glFilters),
          fields: JSON.stringify([
            "account",
            "sum(debit) as total_debit",
            "sum(credit) as total_credit",
            "count(name) as entry_count",
          ]),
          group_by: "account",
          limit_page_length: "200",
          order_by: "sum(debit) desc",
        });

      const categories = catTotals
        .map((r) => {
          const net = (r.total_debit ?? 0) - (r.total_credit ?? 0);
          const acct = branchAccounts.find((a) => a.name === r.account);
          const parentAcct = acct?.parent_account ?? null;
          const parentGroupName = parentAcct ? (groupNameMap.get(parentAcct) ?? parentAcct) : null;
          const classification = classifyExpense({
            parentGroupName,
            accountName: acct?.account_name ?? r.account,
          });
          return {
            account: r.account,
            accountName: acct?.account_name ?? r.account,
            parentGroup: parentGroupName,
            expenseClass: classification.key,
            expenseClassLabel: classification.label,
            total: net,
            entryCount: r.entry_count,
          };
        })
        .filter((c) => c.total > 0)
        .filter((c) =>
          matchesClassFilters(c.expenseClass, {
            classFilter,
            parentFilter,
            natureFilter,
          }),
        );

      // Build group summaries from categories
      const groupTotals = new Map<string, { total: number; entryCount: number }>();
      for (const cat of categories) {
        const gName = cat.parentGroup ?? "Other";
        const existing = groupTotals.get(gName) ?? { total: 0, entryCount: 0 };
        existing.total += cat.total;
        existing.entryCount += cat.entryCount;
        groupTotals.set(gName, existing);
      }
      const groups = Array.from(groupTotals.entries())
        .map(([name, data]) => ({ name, total: data.total, entryCount: data.entryCount }))
        .sort((a, b) => b.total - a.total);

      const classTotalsMap = new Map<ExpenseClassKey, { total: number; entryCount: number }>();
      for (const cat of categories) {
        const existing = classTotalsMap.get(cat.expenseClass) ?? { total: 0, entryCount: 0 };
        existing.total += cat.total;
        existing.entryCount += cat.entryCount;
        classTotalsMap.set(cat.expenseClass, existing);
      }
      const classTotals = EXPENSE_CLASS_ORDER
        .map((key) => {
          const data = classTotalsMap.get(key);
          if (!data) return null;
          return {
            key,
            label: EXPENSE_CLASS_LABELS[key],
            total: data.total,
            entryCount: data.entryCount,
          };
        })
        .filter((item): item is { key: ExpenseClassKey; label: string; total: number; entryCount: number } => item !== null);

      const total = categories.reduce((s, c) => s + c.total, 0);
      const entryCount = categories.reduce((s, c) => s + c.entryCount, 0);

      return NextResponse.json({ categories, groups, classTotals, total, entryCount });
    }

    // ─── mode=transactions ───
    if (mode === "transactions") {
      const limit = parseInt(sp.get("limit") || "100", 10);
      const offset = parseInt(sp.get("offset") || "0", 10);

      // Get expense account metadata for this branch (leaf + group)
      const [branchAccounts, groupAccounts]: [
        { name: string; account_name: string; parent_account: string | null }[],
        { name: string; account_name: string }[],
      ] = await Promise.all([
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name", "account_name", "parent_account"]),
          limit_page_length: "200",
        }),
        frappeGet("/api/resource/Account", {
          filters: JSON.stringify([
            ["root_type", "=", "Expense"],
            ["is_group", "=", 1],
            ["company", "=", branch],
          ]),
          fields: JSON.stringify(["name", "account_name"]),
          limit_page_length: "50",
        }),
      ]);

      const groupNameMap = new Map(groupAccounts.map((g) => [g.name, g.account_name]));

      const accountMetaMap = new Map(
        branchAccounts.map((a) => {
          const parentGroupName = a.parent_account
            ? (groupNameMap.get(a.parent_account) ?? a.parent_account)
            : null;
          const classification = classifyExpense({
            parentGroupName,
            accountName: a.account_name,
          });
          return [
            a.name,
            {
              expenseClass: classification.key,
              expenseClassLabel: classification.label,
            },
          ] as const;
        }),
      );

      const acctNames = branchAccounts
        .filter((a) => {
          const meta = accountMetaMap.get(a.name);
          if (!meta) return false;
          return matchesClassFilters(meta.expenseClass, {
            classFilter,
            parentFilter,
            natureFilter,
          });
        })
        .map((a) => a.name);

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

      const [rawTransactions, countRes] = await Promise.all([
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

      const transactions = rawTransactions.map((tx: {
        name: string;
        posting_date: string;
        account: string;
        debit: number;
        voucher_type: string;
        voucher_no: string;
        against: string;
        remarks: string | null;
      }) => {
        const meta = accountMetaMap.get(tx.account);
        return {
          ...tx,
          expenseClass: meta?.expenseClass ?? "UNMAPPED",
          expenseClassLabel: meta?.expenseClassLabel ?? EXPENSE_CLASS_LABELS.UNMAPPED,
        };
      });

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
