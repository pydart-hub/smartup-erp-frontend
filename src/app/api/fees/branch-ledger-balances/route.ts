import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export interface LedgerAccountBalance {
  name: string;
  account_name: string;
  account_type: string;
  parent_account?: string;
  balance: number;
  dr_cr: "Dr" | "Cr";
  formatted: string;
}

export interface BranchLedgerBalancesResponse {
  company: string;
  cash_leaf: LedgerAccountBalance | null;
  cash_parent: { name: string; account_name: string; balance: number; dr_cr: "Dr" | "Cr" } | null;
  upi: LedgerAccountBalance | null;
  bank_transfer: LedgerAccountBalance | null;
}

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
        Buffer.from(sessionCookie.value, "base64").toString()
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const requestedCompany = sp.get("company");
    const company = requestedCompany || sessionData.default_company || "";

    if (!company) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }

    const allowed = sessionData.allowed_companies ?? [];
    const roles = sessionData.roles ?? [];
    const isDirectorOrAdmin =
      roles.includes("Director") ||
      roles.includes("Management") ||
      roles.includes("Administrator");

    // Strictly enforce branch restriction for non-directors
    if (!isDirectorOrAdmin && allowed.length > 0 && !allowed.includes(company)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 1. Fetch relevant Cash and Bank accounts for this company
    const acctRes = await fetch(
      `${FRAPPE_URL}/api/resource/Account?${new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "account_name",
          "account_type",
          "is_group",
          "parent_account",
        ]),
        filters: JSON.stringify([
          ["company", "=", company],
          ["account_type", "in", ["Cash", "Bank"]],
        ]),
        limit_page_length: "50",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" }
    );

    if (!acctRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch accounts from Frappe" },
        { status: 502 }
      );
    }

    const accountsData = await acctRes.json();
    const accounts: {
      name: string;
      account_name: string;
      account_type: string;
      is_group: number;
      parent_account: string;
    }[] = accountsData.data ?? [];

    // Helper to calculate live GL balance for any account
    async function getGLBalance(accountName: string): Promise<number> {
      try {
        const glRes = await fetch(
          `${FRAPPE_URL}/api/resource/GL Entry?${new URLSearchParams({
            fields: JSON.stringify([
              "sum(debit) as total_debit",
              "sum(credit) as total_credit",
            ]),
            filters: JSON.stringify([
              ["account", "=", accountName],
              ["is_cancelled", "=", 0],
            ]),
            limit_page_length: "1",
          })}`,
          { headers: ADMIN_HEADERS, cache: "no-store" }
        );
        if (!glRes.ok) return 0;
        const resJson = await glRes.json();
        const row = (resJson.data ?? [])[0];
        const debit = Number(row?.total_debit ?? 0);
        const credit = Number(row?.total_credit ?? 0);
        return debit - credit;
      } catch {
        return 0;
      }
    }

    // Separate accounts into categories
    // A) Cash leaf: is_group === 0, account_type === 'Cash'
    const cashLeafAcct = accounts.find(
      (a) => a.is_group === 0 && a.account_type === "Cash"
    );

    // B) Cash In Hand group: parent or group account with 'Cash In Hand' in name
    const cashGroupAcct = accounts.find(
      (a) =>
        a.is_group === 1 &&
        (a.account_name.toLowerCase().includes("cash in hand") ||
          a.name === cashLeafAcct?.parent_account)
    );

    // C) UPI Account: is_group === 0, name or account_name contains 'UPI'
    const upiAcct = accounts.find(
      (a) =>
        a.is_group === 0 &&
        (a.account_name.toLowerCase().includes("upi") ||
          a.name.toLowerCase().includes("upi"))
    );

    // D) Bank Transfer / Entity Account: is_group === 0, account_type === 'Bank', not UPI, not Razorpay, not CoFee
    const bankTransferAcct = accounts.find((a) => {
      if (a.is_group !== 0 || a.account_type !== "Bank") return false;
      const lower = a.account_name.toLowerCase();
      return (
        !lower.includes("upi") &&
        !lower.includes("razorpay") &&
        !lower.includes("cofee")
      );
    });

    // 2. Fetch live balances in parallel
    const [cashLeafBal, upiBal, bankTransferBal] = await Promise.all([
      cashLeafAcct ? getGLBalance(cashLeafAcct.name) : Promise.resolve(0),
      upiAcct ? getGLBalance(upiAcct.name) : Promise.resolve(0),
      bankTransferAcct ? getGLBalance(bankTransferAcct.name) : Promise.resolve(0),
    ]);

    // Format helper
    const buildResultItem = (
      acct: (typeof accounts)[0] | undefined,
      bal: number
    ): LedgerAccountBalance | null => {
      if (!acct) return null;
      const isDr = bal >= 0;
      const absBal = Math.abs(bal);
      return {
        name: acct.name,
        account_name: acct.account_name,
        account_type: acct.account_type,
        parent_account: acct.parent_account,
        balance: absBal,
        dr_cr: isDr ? "Dr" : "Cr",
        formatted: `₹ ${absBal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${isDr ? "Dr" : "Cr"}`,
      };
    };

    const cashLeaf = buildResultItem(cashLeafAcct, cashLeafBal);
    const upi = buildResultItem(upiAcct, upiBal);
    const bankTransfer = buildResultItem(bankTransferAcct, bankTransferBal);

    const cashParent = cashGroupAcct
      ? {
          name: cashGroupAcct.name,
          account_name: cashGroupAcct.account_name,
          balance: cashLeaf ? cashLeaf.balance : 0,
          dr_cr: cashLeaf ? cashLeaf.dr_cr : ("Dr" as const),
        }
      : null;

    const responseData: BranchLedgerBalancesResponse = {
      company,
      cash_leaf: cashLeaf,
      cash_parent: cashParent,
      upi,
      bank_transfer: bankTransfer,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[branch-ledger-balances] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
