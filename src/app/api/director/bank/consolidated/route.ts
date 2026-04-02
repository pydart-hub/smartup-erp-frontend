import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export interface ConsolidatedBranchRow {
  branch: string;
  abbr: string;
  cash: number;
  bank: number;
  bank_entity_name: string;
  razorpay: number;
  upi: number;
  total: number;
  accounts: {
    account: string;
    account_name: string;
    account_type: string;
    balance: number;
  }[];
}

/**
 * GET /api/director/bank/consolidated?from_date=...&to_date=...
 *
 * Returns consolidated bank balances across ALL branches in one call.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: {
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
    const fromDate = sp.get("from_date") || "";
    const toDate = sp.get("to_date") || "";

    // 1. Get all companies (branches)
    const companyRes = await fetch(
      `${FRAPPE_URL}/api/resource/Company?${new URLSearchParams({
        fields: JSON.stringify(["name", "company_name", "abbr"]),
        limit_page_length: "100",
        order_by: "name asc",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );
    if (!companyRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch companies" },
        { status: 502 },
      );
    }
    const companies: { name: string; company_name: string; abbr: string }[] =
      (await companyRes.json()).data ?? [];

    // Filter out HQ
    const branches = companies.filter((c) => c.name !== "Smart Up");

    // Filter by allowed companies if not admin
    const allowed = sessionData.allowed_companies ?? [];
    const isAdmin = roles.includes("Administrator");
    const accessibleBranches = isAdmin || allowed.length === 0
      ? branches
      : branches.filter((b) => allowed.includes(b.name));

    // 2. Fetch accounts + balances for each branch in parallel
    const results: ConsolidatedBranchRow[] = await Promise.all(
      accessibleBranches.map(async (branch) => {
        // Get bank/cash accounts
        const acctRes = await fetch(
          `${FRAPPE_URL}/api/resource/Account?${new URLSearchParams({
            fields: JSON.stringify([
              "name",
              "account_name",
              "account_type",
              "is_group",
            ]),
            filters: JSON.stringify([
              ["company", "=", branch.name],
              ["account_type", "in", ["Bank", "Cash"]],
              ["is_group", "=", 0],
            ]),
            limit_page_length: "50",
          })}`,
          { headers: ADMIN_HEADERS, cache: "no-store" },
        );

        if (!acctRes.ok) {
          return {
            branch: branch.name,
            abbr: branch.abbr,
            cash: 0,
            bank: 0,
            bank_entity_name: "",
            razorpay: 0,
            upi: 0,
            total: 0,
            accounts: [],
          };
        }

        const accounts: {
          name: string;
          account_name: string;
          account_type: string;
        }[] = (await acctRes.json()).data ?? [];

        // Get balances per account
        const balances = await Promise.all(
          accounts.map(async (acct) => {
            const glFilters: (string | number | string[])[][] = [
              ["account", "=", acct.name],
              ["is_cancelled", "=", 0],
            ];
            if (fromDate) glFilters.push(["posting_date", ">=", fromDate]);
            if (toDate) glFilters.push(["posting_date", "<=", toDate]);

            const glRes = await fetch(
              `${FRAPPE_URL}/api/resource/GL Entry?${new URLSearchParams({
                fields: JSON.stringify([
                  "sum(debit) as total_debit",
                  "sum(credit) as total_credit",
                ]),
                filters: JSON.stringify(glFilters),
                limit_page_length: "1",
              })}`,
              { headers: ADMIN_HEADERS, cache: "no-store" },
            );
            if (!glRes.ok)
              return {
                account: acct.name,
                account_name: acct.account_name,
                account_type: acct.account_type,
                balance: 0,
              };
            const row = ((await glRes.json()).data ?? [])[0];
            return {
              account: acct.name,
              account_name: acct.account_name,
              account_type: acct.account_type,
              balance: (row?.total_debit ?? 0) - (row?.total_credit ?? 0),
            };
          }),
        );

        // Categorise
        let cash = 0;
        let bank = 0;
        let razorpay = 0;
        let upi = 0;
        let bankEntityName = "";

        for (const b of balances) {
          const n = b.account_name.toLowerCase();
          if (n.includes("razorpay")) razorpay += b.balance;
          else if (n.includes("upi")) upi += b.balance;
          else if (b.account_type === "Cash") cash += b.balance;
          else {
            bank += b.balance;
            if (!bankEntityName) bankEntityName = b.account_name;
          }
        }

        return {
          branch: branch.name,
          abbr: branch.abbr,
          cash,
          bank,
          bank_entity_name: bankEntityName,
          razorpay,
          upi,
          total: cash + bank + razorpay + upi,
          accounts: balances,
        };
      }),
    );

    // 3. Compute grand totals
    const grandTotal = results.reduce(
      (acc, r) => {
        acc.cash += r.cash;
        acc.bank += r.bank;
        acc.razorpay += r.razorpay;
        acc.upi += r.upi;
        acc.total += r.total;
        return acc;
      },
      { cash: 0, bank: 0, razorpay: 0, upi: 0, total: 0 },
    );

    return NextResponse.json({
      branches: results,
      grand_total: grandTotal,
    });
  } catch (error: unknown) {
    console.error(
      "[director/bank/consolidated] Error:",
      (error as Error).message,
    );
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
