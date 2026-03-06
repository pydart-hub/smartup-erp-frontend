import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/fees/class-summary?company=Smart+Up+Chullickal
 *
 * Returns class-wise pending fee summary using frappe.client.get_list
 * with aggregation (count + sum + group_by). Uses admin token server-side
 * because branch-manager users lack permission for aggregate queries.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check — must have a valid session
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

    // Company from query param, falling back to session default
    const company =
      request.nextUrl.searchParams.get("company") ||
      sessionData.default_company ||
      "";

    // Validate the company is in the user's allowed list
    const allowed = sessionData.allowed_companies ?? [];
    if (allowed.length > 0 && company && !allowed.includes(company)) {
      return NextResponse.json(
        { error: "Access denied for this company" },
        { status: 403 }
      );
    }

    const bt = "`"; // backtick helper

    const filters: (string | number)[][] = [
      ["Sales Invoice", "docstatus", "=", 1],
      ["Sales Invoice", "outstanding_amount", ">", 0],
    ];
    if (company) {
      filters.push(["Sales Invoice", "company", "=", company]);
    }

    const payload = {
      doctype: "Sales Invoice",
      fields: [
        `${bt}tabSales Invoice Item${bt}.item_code as item_code`,
        `count(${bt}tabSales Invoice${bt}.name) as cnt`,
        `sum(${bt}tabSales Invoice${bt}.outstanding_amount) as total_out`,
      ],
      filters,
      group_by: `${bt}tabSales Invoice Item${bt}.item_code`,
      order_by: `${bt}tabSales Invoice Item${bt}.item_code asc`,
      limit_page_length: 100,
    };

    // Use native fetch (not axios) to avoid "Expect: 100-continue" issue
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
      console.error("[class-summary] Frappe error:", res.status, text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to fetch data from Frappe" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const rows: { item_code: string; cnt: number; total_out: number }[] =
      json.message ?? [];

    const result = rows.map((r) => ({
      item_code: r.item_code,
      student_count: r.cnt,
      total_outstanding: r.total_out,
    }));

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[class-summary] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
