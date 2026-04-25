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
 * GET /api/director/loans?branch=...
 *
 * Returns loan/liability account balances for a single branch.
 * Fetches Account[root_type=Liability, is_group=0] where parent account
 * contains "Loan", then computes GL balance (credit − debit) per account.
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
    const branch = sp.get("branch") || "";

    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    // Validate branch access
    const allowed = sessionData.allowed_companies ?? [];
    const isAdmin = roles.includes("Administrator");
    if (!isAdmin && allowed.length > 0 && !allowed.includes(branch)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 1. Fetch all Liability loan accounts for this branch
    const acctRes = await fetch(
      `${FRAPPE_URL}/api/resource/Account?${new URLSearchParams({
        fields: JSON.stringify(["name", "account_name", "account_type", "parent_account", "root_type"]),
        filters: JSON.stringify([
          ["company", "=", branch],
          ["root_type", "=", "Liability"],
          ["is_group", "=", 0],
          ["parent_account", "like", "%Loan%"],
        ]),
        limit_page_length: "50",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );

    if (!acctRes.ok) {
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 502 });
    }

    const accounts: {
      name: string;
      account_name: string;
      account_type: string;
      parent_account: string;
    }[] = (await acctRes.json()).data ?? [];

    // 2. Compute GL balance per account (credit − debit = liability owed)
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
        // Liability: credit − debit gives the outstanding balance owed
        const balance = (row?.total_credit ?? 0) - (row?.total_debit ?? 0);
        return {
          account: acct.name,
          account_name: acct.account_name,
          balance,
        };
      }),
    );

    // Only return accounts with non-zero balance
    const nonZero = balances.filter((b) => b.balance !== 0);
    const total = nonZero.reduce((s, b) => s + b.balance, 0);

    return NextResponse.json({ accounts: nonZero, total });
  } catch (error: unknown) {
    console.error("[director/loans] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
