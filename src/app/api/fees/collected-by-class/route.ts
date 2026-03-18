/**
 * GET /api/fees/collected-by-class?item_code=10th+CBSE+Tuition+Fee&company=...
 *
 * Returns student-wise collected amounts for a specific class (item_code).
 * Uses Sales Invoice aggregation: collected = grand_total - outstanding_amount.
 * Also fetches the latest Payment Entry per customer for mode/date/ref info.
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

    const itemCode = request.nextUrl.searchParams.get("item_code");
    if (!itemCode) {
      return NextResponse.json({ error: "item_code is required" }, { status: 400 });
    }

    const company =
      request.nextUrl.searchParams.get("company") ||
      sessionData.default_company ||
      "";

    const allowed = sessionData.allowed_companies ?? [];
    if (allowed.length > 0 && company && !allowed.includes(company)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch discontinued customers
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

    // Fetch all submitted invoices for this item_code
    const bt = "`";
    const invFilters: (string | number | string[])[][] = [
      ["Sales Invoice", "docstatus", "=", 1],
      ["Sales Invoice Item", "item_code", "=", itemCode],
    ];
    if (company) invFilters.push(["Sales Invoice", "company", "=", company]);

    const invPayload = {
      doctype: "Sales Invoice",
      fields: [
        `${bt}tabSales Invoice${bt}.customer as customer`,
        `${bt}tabSales Invoice${bt}.customer_name as customer_name`,
        `sum(${bt}tabSales Invoice${bt}.grand_total) as invoiced`,
        `sum(${bt}tabSales Invoice${bt}.outstanding_amount) as outstanding`,
      ],
      filters: invFilters,
      group_by: `${bt}tabSales Invoice${bt}.customer`,
      order_by: `${bt}tabSales Invoice${bt}.customer_name asc`,
      limit_page_length: 500,
    };

    const invRes = await fetch(
      `${FRAPPE_URL}/api/method/frappe.client.get_list`,
      {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify(invPayload),
        cache: "no-store",
      },
    );

    if (!invRes.ok) {
      const errText = await invRes.text();
      console.error("[collected-by-class] Frappe error:", invRes.status, errText.slice(0, 300));
      return NextResponse.json({ error: "Failed to fetch invoice data" }, { status: 502 });
    }

    const rows: {
      customer: string;
      customer_name: string;
      invoiced: number;
      outstanding: number;
    }[] = (await invRes.json()).message ?? [];

    // Filter out discontinued + only those who've paid something
    const activeRows = rows.filter(
      (r) => !discCustomers.has(r.customer) && r.invoiced - r.outstanding > 0,
    );

    const customers = activeRows.map((r) => r.customer);
    const totalCollected = activeRows.reduce(
      (s, r) => s + (r.invoiced - r.outstanding),
      0,
    );

    // Fetch latest PE per customer for mode/date/ref
    let peMap: Map<string, { mode: string; date: string; ref: string }> = new Map();
    if (customers.length > 0) {
      const peRes = await fetch(
        `${FRAPPE_URL}/api/resource/Payment Entry?${new URLSearchParams({
          filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["payment_type", "=", "Receive"],
            ["party", "in", customers],
            ...(company ? [["company", "=", company]] : []),
          ]),
          fields: JSON.stringify([
            "party", "mode_of_payment", "posting_date", "reference_no",
          ]),
          order_by: "posting_date desc",
          limit_page_length: "0",
        })}`,
        { headers: ADMIN_HEADERS, cache: "no-store" },
      );

      if (peRes.ok) {
        const peData: {
          party: string;
          mode_of_payment: string | null;
          posting_date: string;
          reference_no: string | null;
        }[] = (await peRes.json()).data ?? [];
        // Keep only first (latest) per customer
        for (const pe of peData) {
          if (!peMap.has(pe.party)) {
            const isOnline = pe.reference_no?.startsWith("pay_");
            peMap.set(pe.party, {
              mode: isOnline ? "Online" : (pe.mode_of_payment || "Cash"),
              date: pe.posting_date,
              ref: pe.reference_no || "",
            });
          }
        }
      }
    }

    const students = activeRows.map((r) => {
      const pe = peMap.get(r.customer);
      return {
        customer: r.customer,
        customer_name: r.customer_name || r.customer,
        total_paid: r.invoiced - r.outstanding,
        total_invoiced: r.invoiced,
        last_mode: pe?.mode || "—",
        last_date: pe?.date || "—",
        last_reference: pe?.ref || "—",
      };
    });

    return NextResponse.json({
      item_code: itemCode,
      total_collected: totalCollected,
      student_count: students.length,
      students,
    });
  } catch (error: unknown) {
    console.error("[collected-by-class] Error:", (error as Error).message);
    return NextResponse.json(
      { error: (error as Error).message || "Internal error" },
      { status: 500 },
    );
  }
}
