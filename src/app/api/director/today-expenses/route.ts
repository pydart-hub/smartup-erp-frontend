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

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: { roles?: string[] };
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
      roles.includes("Administrator") ||
      roles.includes("Accounts Manager");
    if (!isDirector) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const fromDate = searchParams.get("from_date") || dateParam || new Date().toISOString().slice(0, 10);
    const toDate = searchParams.get("to_date") || dateParam || new Date().toISOString().slice(0, 10);

    // Fetch expense accounts to filter in-memory
    const expenseAccounts: { name: string; company: string; account_name: string; parent_account: string | null }[] = await frappeGet("/api/resource/Account", {
      filters: JSON.stringify([
        ["root_type", "=", "Expense"],
        ["is_group", "=", 0],
      ]),
      fields: JSON.stringify(["name", "company", "account_name", "parent_account"]),
      limit_page_length: "500",
    });

    const expenseAccountMap = new Map(expenseAccounts.map((a) => [a.name, a.account_name]));

    // Fetch GL Entries
    const txFilters: (string | number | string[])[][] = [
      ["is_cancelled", "=", 0],
      ["debit", ">", 0],
      ["posting_date", ">=", fromDate],
      ["posting_date", "<=", toDate],
    ];

    const rawTransactions: {
      name: string;
      posting_date: string;
      account: string;
      debit: number;
      voucher_type: string;
      voucher_no: string;
      against: string;
      remarks: string | null;
      company: string;
    }[] = await frappeGet("/api/resource/GL Entry", {
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
        "company",
      ]),
      order_by: "creation desc",
      limit_page_length: "1000",
    });

    // Filter to only expense entries and format
    const transactions = rawTransactions
      .filter((tx) => expenseAccountMap.has(tx.account))
      .map((tx) => ({
        ...tx,
        account_name: expenseAccountMap.get(tx.account) || tx.account,
      }));

    return NextResponse.json({ data: transactions });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[today-expenses] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
