import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

/**
 * GET /api/director/loans/consolidated
 *
 * Returns loan/liability balances across ALL branches in one call.
 * Only branches with at least one non-zero loan account are included.
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
      return NextResponse.json({ error: "Failed to fetch companies" }, { status: 502 });
    }
    const companies: { name: string; company_name: string; abbr: string }[] =
      (await companyRes.json()).data ?? [];

    // Filter out HQ
    const branches = companies.filter((c) => c.name !== "Smart Up");

    // Filter by allowed companies if not admin
    const allowed = sessionData.allowed_companies ?? [];
    const isAdmin = roles.includes("Administrator");
    const accessibleBranches =
      isAdmin || allowed.length === 0
        ? branches
        : branches.filter((b) => allowed.includes(b.name));

    // 2. Fetch loan accounts + balances for each branch in parallel
    const results = await Promise.all(
      accessibleBranches.map(async (branch) => {
        // Get all liability loan accounts for this branch
        const acctRes = await fetch(
          `${FRAPPE_URL}/api/resource/Account?${new URLSearchParams({
            fields: JSON.stringify(["name", "account_name", "account_type", "parent_account"]),
            filters: JSON.stringify([
              ["company", "=", branch.name],
              ["root_type", "=", "Liability"],
              ["is_group", "=", 0],
              ["parent_account", "like", "%Loan%"],
            ]),
            limit_page_length: "50",
          })}`,
          { headers: ADMIN_HEADERS, cache: "no-store" },
        );

        if (!acctRes.ok) {
          return { branch: branch.name, abbr: branch.abbr, accounts: [], total: 0 };
        }

        const accounts: { name: string; account_name: string }[] =
          (await acctRes.json()).data ?? [];

        if (!accounts.length) {
          return { branch: branch.name, abbr: branch.abbr, accounts: [], total: 0 };
        }

        // Compute GL balance per account
        const balances = await Promise.all(
          accounts.map(async (acct) => {
            const glRes = await fetch(
              `${FRAPPE_URL}/api/resource/GL Entry?${new URLSearchParams({
                fields: JSON.stringify(["sum(debit) as total_debit", "sum(credit) as total_credit"]),
                filters: JSON.stringify([
                  ["account", "=", acct.name],
                  ["is_cancelled", "=", 0],
                ]),
                limit_page_length: "1",
              })}`,
              { headers: ADMIN_HEADERS, cache: "no-store" },
            );
            if (!glRes.ok) {
              return { account: acct.name, account_name: acct.account_name, balance: 0 };
            }
            const row = ((await glRes.json()).data ?? [])[0];
            const balance = (row?.total_credit ?? 0) - (row?.total_debit ?? 0);
            return { account: acct.name, account_name: acct.account_name, balance };
          }),
        );

        const nonZero = balances.filter((b) => b.balance !== 0);
        const total = nonZero.reduce((s, b) => s + b.balance, 0);

        return { branch: branch.name, abbr: branch.abbr, accounts: nonZero, total };
      }),
    );

    // 3. Grand total
    const grandTotal = results.reduce((s, r) => s + r.total, 0);

    return NextResponse.json({ branches: results, grand_total: grandTotal });
  } catch (error: unknown) {
    console.error("[director/loans/consolidated] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
