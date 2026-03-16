/**
 * GET /api/fees/report-summary
 *
 * Returns fee stats (total, collected, pending, outstanding) excluding
 * discontinued students' invoices.
 *
 * Query params:
 *   company  — optional branch filter
 *
 * Returns: {
 *   total_fees, total_collected, total_pending,
 *   collection_rate, total_outstanding
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

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
    const discCustomers = discStudents.map((s) => s.customer).filter(Boolean) as string[];

    // 2. Build invoice filters
    const invFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
    if (company) invFilters.push(["company", "=", company]);
    if (discCustomers.length > 0)
      invFilters.push(["customer", "not in", discCustomers]);

    const invRes = await fetch(
      `${FRAPPE_URL}/api/resource/Sales%20Invoice?${new URLSearchParams({
        filters: JSON.stringify(invFilters),
        fields: JSON.stringify([
          "sum(grand_total) as invoiced",
          "sum(outstanding_amount) as outstanding",
        ]),
        limit_page_length: "1",
      })}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );

    if (!invRes.ok) {
      return NextResponse.json({ error: "Frappe query failed" }, { status: invRes.status });
    }

    const row = ((await invRes.json()).data ?? [])[0] ?? {};
    const totalFees: number = row.invoiced ?? 0;
    const totalPending: number = row.outstanding ?? 0;
    const totalCollected = totalFees - totalPending;

    return NextResponse.json({
      total_fees: totalFees,
      total_collected: totalCollected,
      total_pending: totalPending,
      total_outstanding: totalPending,
      collection_rate: totalFees > 0 ? (totalCollected / totalFees) * 100 : 0,
    });
  } catch (err) {
    console.error("[report-summary] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
