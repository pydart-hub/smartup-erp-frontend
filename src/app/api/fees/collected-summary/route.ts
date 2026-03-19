/**
 * GET /api/fees/collected-summary?company=Smart+Up+Chullickal
 *
 * Returns:
 *   by_class           — class-wise collected totals
 *   total              — overall collected amount
 *   offline_total      — sum of all non-Razorpay payments
 *   razorpay_total     — sum of all Razorpay/online payments
 *   offline_breakdown  — { Cash: n, UPI: n, ... } per offline mode
 *   students_paid      — distinct paying customer count
 *
 * Uses admin token server-side for aggregate queries.
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
    // Auth check
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

    const company =
      request.nextUrl.searchParams.get("company") ||
      sessionData.default_company ||
      "";

    const allowed = sessionData.allowed_companies ?? [];
    if (allowed.length > 0 && company && !allowed.includes(company)) {
      return NextResponse.json(
        { error: "Access denied for this company" },
        { status: 403 },
      );
    }

    // 1. Fetch discontinued customers to exclude
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
    const discStudents: { customer?: string }[] = discRes.ok
      ? ((await discRes.json()).data ?? [])
      : [];
    const discCustomers = discStudents
      .map((s) => s.customer)
      .filter(Boolean) as string[];

    // 2. Fetch all submitted Payment Entries (Receive type)
    const peFilters: (string | number | string[])[][] = [
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ];
    if (company) peFilters.push(["company", "=", company]);

    const peRes = await fetch(
      `${FRAPPE_URL}/api/resource/Payment Entry?${new URLSearchParams({
        filters: JSON.stringify(peFilters),
        fields: JSON.stringify([
          "name", "paid_amount", "mode_of_payment", "reference_no", "party",
        ]),
        limit_page_length: "0",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );

    if (!peRes.ok) {
      return NextResponse.json({ error: "Failed to fetch payment entries" }, { status: 502 });
    }

    const allPE: {
      name: string;
      paid_amount: number;
      mode_of_payment: string | null;
      reference_no: string | null;
      party: string | null;
    }[] = (await peRes.json()).data ?? [];

    // Exclude discontinued customers
    const discSet = new Set(discCustomers);
    const activePE = allPE.filter((pe) => !pe.party || !discSet.has(pe.party));

    // 3. Build offline vs razorpay breakdown
    let razorpayTotal = 0;
    let offlineTotal = 0;
    const offlineBreakdown: Record<string, number> = {};
    const payingParties = new Set<string>();

    for (const pe of activePE) {
      const isOnline = pe.reference_no?.startsWith("pay_") || pe.mode_of_payment === "Razorpay";
      const amount = pe.paid_amount ?? 0;
      if (isOnline) {
        razorpayTotal += amount;
      } else {
        const mode = pe.mode_of_payment || "Cash";
        offlineBreakdown[mode] = (offlineBreakdown[mode] || 0) + amount;
        offlineTotal += amount;
      }
      if (pe.party) payingParties.add(pe.party);
    }

    const total = activePE.reduce((s, pe) => s + (pe.paid_amount ?? 0), 0);

    // 4. Class-wise collected via Sales Invoice aggregation
    //    collected per invoice = grand_total - outstanding_amount
    //    Uses frappe.client.get_list with child table join (same pattern as class-summary)
    const bt = "`";
    const invFilters: (string | number | string[])[][] = [
      ["Sales Invoice", "docstatus", "=", 1],
    ];
    if (company) invFilters.push(["Sales Invoice", "company", "=", company]);
    if (discCustomers.length > 0) {
      invFilters.push(["Sales Invoice", "customer", "not in", discCustomers]);
    }

    const classPayload = {
      doctype: "Sales Invoice",
      fields: [
        `${bt}tabSales Invoice Item${bt}.item_code as item_code`,
        `count(distinct ${bt}tabSales Invoice${bt}.customer) as cnt`,
        `sum(${bt}tabSales Invoice${bt}.grand_total - ${bt}tabSales Invoice${bt}.outstanding_amount) as collected`,
      ],
      filters: invFilters,
      group_by: `${bt}tabSales Invoice Item${bt}.item_code`,
      order_by: `${bt}tabSales Invoice Item${bt}.item_code asc`,
      limit_page_length: 100,
    };

    const classRes = await fetch(
      `${FRAPPE_URL}/api/method/frappe.client.get_list`,
      {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify(classPayload),
        cache: "no-store",
      },
    );

    let byClass: { item_code: string; student_count: number; total_collected: number }[] = [];
    if (classRes.ok) {
      const rows: { item_code: string; cnt: number; collected: number }[] =
        (await classRes.json()).message ?? [];
      byClass = rows
        .filter((r) => r.collected > 0)
        .map((r) => ({
          item_code: r.item_code,
          student_count: r.cnt,
          total_collected: r.collected,
        }));
    }

    return NextResponse.json({
      by_class: byClass,
      total,
      offline_total: offlineTotal,
      razorpay_total: razorpayTotal,
      offline_breakdown: offlineBreakdown,
      students_paid: payingParties.size,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[collected-summary] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
