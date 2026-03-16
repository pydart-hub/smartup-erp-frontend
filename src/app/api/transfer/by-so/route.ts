/**
 * GET /api/transfer/by-so?so=SAL-ORD-2026-00095
 *
 * Find a completed Student Branch Transfer record that created the given
 * Sales Order. Used by the SO detail page to surface transfer context.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

const frappeHeaders = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const soName = request.nextUrl.searchParams.get("so");
    if (!soName) {
      return NextResponse.json(
        { error: "so parameter is required" },
        { status: 400 },
      );
    }

    const fields = JSON.stringify([
      "name",
      "from_branch",
      "to_branch",
      "completion_date",
      "new_total_amount",
      "amount_already_paid",
      "adjusted_amount",
      "student_name",
      "status",
    ]);

    const filters = JSON.stringify([
      ["new_sales_order", "=", soName],
      ["status", "=", "Completed"],
    ]);

    const params = new URLSearchParams({
      fields,
      filters,
      limit_page_length: "1",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Student Branch Transfer?${params}`,
      { headers: frappeHeaders },
    );

    if (!res.ok) {
      // Non-critical — if lookup fails, just return null (no transfer banner)
      return NextResponse.json({ transfer: null });
    }

    const data = await res.json();
    const transfer = data.data?.[0] ?? null;
    return NextResponse.json({ transfer });
  } catch (err) {
    console.error("[transfer/by-so] Error:", err);
    // Return null gracefully — the page should still work without this data
    return NextResponse.json({ transfer: null });
  }
}
