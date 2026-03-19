/**
 * GET /api/fees/collected-by-mode?mode=UPI&company=...
 *
 * Returns individual Payment Entry rows filtered by payment mode.
 * "Online" mode → reference_no starts with "pay_" (Razorpay).
 * Other modes → mode_of_payment matches and reference_no does NOT start with "pay_".
 * Excludes discontinued students.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: { default_company?: string; allowed_companies?: string[] };
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString(),
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const mode = request.nextUrl.searchParams.get("mode");
    if (!mode) {
      return NextResponse.json({ error: "mode is required" }, { status: 400 });
    }

    const company =
      request.nextUrl.searchParams.get("company") ||
      sessionData.default_company ||
      "";

    const allowed = sessionData.allowed_companies ?? [];
    if (allowed.length > 0 && company && !allowed.includes(company)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch discontinued customers to exclude
    const discFilters: (string | number | string[])[][] = [
      ["enabled", "=", 0],
      ["custom_discontinuation_date", "is", "set"],
    ];
    if (company) discFilters.push(["custom_branch", "=", company]);

    const discRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student?${new URLSearchParams({
        filters: JSON.stringify(discFilters),
        fields: JSON.stringify(["customer"]),
        limit_page_length: "500",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );
    const discCustomers = new Set(
      (discRes.ok ? ((await discRes.json()).data ?? []) : [])
        .map((s: { customer?: string }) => s.customer)
        .filter(Boolean),
    );

    // Fetch all Payment Entries
    const peFilters: (string | number | string[])[][] = [
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ];
    if (company) peFilters.push(["company", "=", company]);

    const peRes = await fetch(
      `${FRAPPE_URL}/api/resource/Payment Entry?${new URLSearchParams({
        filters: JSON.stringify(peFilters),
        fields: JSON.stringify([
          "name", "party", "party_name", "paid_amount",
          "mode_of_payment", "posting_date", "reference_no",
        ]),
        order_by: "posting_date desc",
        limit_page_length: "0",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );

    if (!peRes.ok) {
      return NextResponse.json({ error: "Failed to fetch payment entries" }, { status: 502 });
    }

    const allPE: {
      name: string;
      party: string | null;
      party_name: string | null;
      paid_amount: number;
      mode_of_payment: string | null;
      posting_date: string;
      reference_no: string | null;
    }[] = (await peRes.json()).data ?? [];

    // Filter by mode + exclude discontinued
    const entries = allPE.filter((pe) => {
      if (pe.party && discCustomers.has(pe.party)) return false;
      const isOnline = pe.reference_no?.startsWith("pay_") || pe.mode_of_payment === "Razorpay";
      if (mode === "Online") return isOnline;
      return !isOnline && (pe.mode_of_payment || "Cash") === mode;
    });

    const total = entries.reduce((s, pe) => s + (pe.paid_amount ?? 0), 0);

    return NextResponse.json({
      mode,
      total,
      count: entries.length,
      entries: entries.map((pe) => ({
        name: pe.name,
        party_name: pe.party_name || pe.party || "",
        paid_amount: pe.paid_amount,
        posting_date: pe.posting_date,
        reference_no: pe.reference_no || "",
        mode_of_payment: pe.mode_of_payment || "Cash",
      })),
    });
  } catch (error: unknown) {
    console.error("[collected-by-mode] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
