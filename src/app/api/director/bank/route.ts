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
 * GET /api/director/bank?branch=...&from_date=...&to_date=...&account=...&voucher_type=...&limit=...&offset=...
 *
 * Returns:
 *  - account_balances: { account, balance }[] for Cash/Bank/Razorpay/UPI accounts
 *  - gl_entries: recent GL Entry rows for those accounts
 *  - payment_entries: recent Payment Entry rows
 *  - journal_entries: recent Journal Entry rows
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
    const fromDate = sp.get("from_date") || "";
    const toDate = sp.get("to_date") || "";
    const accountFilter = sp.get("account") || "";
    const voucherTypeFilter = sp.get("voucher_type") || "";
    const limit = parseInt(sp.get("limit") || "50", 10);
    const offset = parseInt(sp.get("offset") || "0", 10);
    const mode = sp.get("mode") || "overview"; // "overview" | "gl" | "payments" | "journals"

    if (!branch) {
      return NextResponse.json(
        { error: "branch is required" },
        { status: 400 },
      );
    }

    // Validate branch access
    const allowed = sessionData.allowed_companies ?? [];
    const isAdmin = roles.includes("Administrator");
    if (!isAdmin && allowed.length > 0 && !allowed.includes(branch)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── 1. Get all bank/cash accounts for this branch ──
    const acctRes = await fetch(
      `${FRAPPE_URL}/api/resource/Account?${new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "account_name",
          "account_type",
          "is_group",
        ]),
        filters: JSON.stringify([
          ["company", "=", branch],
          ["account_type", "in", ["Bank", "Cash"]],
          ["is_group", "=", 0],
        ]),
        limit_page_length: "50",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );
    if (!acctRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 502 },
      );
    }
    const accounts: {
      name: string;
      account_name: string;
      account_type: string;
    }[] = ((await acctRes.json()).data ?? []);
    const accountNames = accounts.map((a) => a.name);

    if (mode === "overview" || mode === "gl") {
      // ── 2. Get balances (sum debit - sum credit) per account ──
      const balances = await Promise.all(
        accountNames.map(async (acctName) => {
          const glFilters: (string | number | string[])[][] = [
            ["account", "=", acctName],
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
          if (!glRes.ok) return { account: acctName, balance: 0 };
          const row = ((await glRes.json()).data ?? [])[0];
          return {
            account: acctName,
            account_name:
              accounts.find((a) => a.name === acctName)?.account_name ??
              acctName,
            account_type:
              accounts.find((a) => a.name === acctName)?.account_type ?? "",
            balance: (row?.total_debit ?? 0) - (row?.total_credit ?? 0),
          };
        }),
      );

      if (mode === "overview") {
        return NextResponse.json({ accounts: balances });
      }

      // mode === "gl" → also fetch GL entries
      const glEntryFilters: (string | number | string[])[][] = [
        ["company", "=", branch],
        ["is_cancelled", "=", 0],
      ];
      if (accountFilter) {
        glEntryFilters.push(["account", "=", accountFilter]);
      } else {
        glEntryFilters.push(["account", "in", accountNames]);
      }
      if (fromDate) glEntryFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) glEntryFilters.push(["posting_date", "<=", toDate]);
      if (voucherTypeFilter)
        glEntryFilters.push(["voucher_type", "=", voucherTypeFilter]);

      const glListRes = await fetch(
        `${FRAPPE_URL}/api/resource/GL Entry?${new URLSearchParams({
          fields: JSON.stringify([
            "name",
            "posting_date",
            "account",
            "debit",
            "credit",
            "voucher_type",
            "voucher_no",
            "against",
            "party_type",
            "party",
          ]),
          filters: JSON.stringify(glEntryFilters),
          order_by: "posting_date desc, creation desc",
          limit_page_length: String(limit),
          limit_start: String(offset),
        })}`,
        { headers: ADMIN_HEADERS, cache: "no-store" },
      );

      const glEntries = glListRes.ok
        ? ((await glListRes.json()).data ?? [])
        : [];

      return NextResponse.json({ accounts: balances, gl_entries: glEntries });
    }

    if (mode === "payments") {
      // ── Payment Entries ──
      const peFilters: (string | number | string[])[][] = [
        ["company", "=", branch],
        ["docstatus", "=", 1],
      ];
      if (fromDate) peFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) peFilters.push(["posting_date", "<=", toDate]);

      const peRes = await fetch(
        `${FRAPPE_URL}/api/resource/Payment Entry?${new URLSearchParams({
          fields: JSON.stringify([
            "name",
            "posting_date",
            "payment_type",
            "party",
            "party_name",
            "paid_amount",
            "paid_from",
            "paid_to",
            "mode_of_payment",
            "reference_no",
          ]),
          filters: JSON.stringify(peFilters),
          order_by: "posting_date desc, creation desc",
          limit_page_length: String(limit),
          limit_start: String(offset),
        })}`,
        { headers: ADMIN_HEADERS, cache: "no-store" },
      );

      const entries = peRes.ok ? ((await peRes.json()).data ?? []) : [];
      return NextResponse.json({ payment_entries: entries });
    }

    if (mode === "journals") {
      // ── Journal Entries ──
      const jeFilters: (string | number | string[])[][] = [
        ["company", "=", branch],
        ["docstatus", "=", 1],
      ];
      if (fromDate) jeFilters.push(["posting_date", ">=", fromDate]);
      if (toDate) jeFilters.push(["posting_date", "<=", toDate]);

      const jeRes = await fetch(
        `${FRAPPE_URL}/api/resource/Journal Entry?${new URLSearchParams({
          fields: JSON.stringify([
            "name",
            "posting_date",
            "voucher_type",
            "title",
            "total_debit",
            "total_credit",
            "user_remark",
          ]),
          filters: JSON.stringify(jeFilters),
          order_by: "posting_date desc, creation desc",
          limit_page_length: String(limit),
          limit_start: String(offset),
        })}`,
        { headers: ADMIN_HEADERS, cache: "no-store" },
      );

      const entries = jeRes.ok ? ((await jeRes.json()).data ?? []) : [];
      return NextResponse.json({ journal_entries: entries });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[director/bank] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
