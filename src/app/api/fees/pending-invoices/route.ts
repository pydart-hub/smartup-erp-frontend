import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/fees/pending-invoices?company=...&item_code=...&limit=500
 *
 * Returns pending Sales Invoices with their item_code from the child table.
 * Uses admin token server-side for child-table join access.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: { default_company?: string; allowed_companies?: string[] };
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const company =
      sp.get("company") || sessionData.default_company || "";
    const item_code = sp.get("item_code") || "";
    const limit = parseInt(sp.get("limit") || "500", 10);

    // Validate company access
    const allowed = sessionData.allowed_companies ?? [];
    if (allowed.length > 0 && company && !allowed.includes(company)) {
      return NextResponse.json(
        { error: "Access denied for this company" },
        { status: 403 }
      );
    }

    const bt = "`";

    const filters: (string | number)[][] = [
      ["Sales Invoice", "docstatus", "=", 1],
      ["Sales Invoice", "outstanding_amount", ">", 0],
    ];
    if (company) filters.push(["Sales Invoice", "company", "=", company]);
    if (item_code)
      filters.push(["Sales Invoice Item", "item_code", "=", item_code]);

    const payload = {
      doctype: "Sales Invoice",
      fields: [
        "name",
        "customer",
        "customer_name",
        "student",
        `${bt}tabSales Invoice Item${bt}.item_code as item_code`,
        "outstanding_amount",
        "grand_total",
        "due_date",
        "company",
        "status",
      ],
      filters,
      order_by: "outstanding_amount desc",
      limit_page_length: limit,
    };

    const body = JSON.stringify(payload);
    const res = await fetch(
      `${FRAPPE_URL}/api/method/frappe.client.get_list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        },
        body,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[pending-invoices] Frappe error:",
        res.status,
        text.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Failed to fetch data from Frappe" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const rows = json.message ?? [];

    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[pending-invoices] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
