/**
 * GET /api/fees/invoice-payments?invoice_id=ACC-SINV-2026-00050
 *
 * Returns all Payment Entry records that reference a given Sales Invoice.
 * Used for showing per-instalment payment history (partial payments).
 *
 * Query params:
 *   invoice_id — Sales Invoice name (required)
 *
 * Returns: { data: [{ name, paid_amount, mode_of_payment, posting_date, reference_no, remarks }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const invoiceId = request.nextUrl.searchParams.get("invoice_id");
    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoice_id is required" },
        { status: 400 },
      );
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `token ${API_KEY}:${API_SECRET}`,
    };

    // Query Payment Entry where references child table has this invoice
    const bt = "`";
    const payload = {
      doctype: "Payment Entry",
      fields: [
        "name",
        "paid_amount",
        "mode_of_payment",
        "posting_date",
        "reference_no",
        "remarks",
        `${bt}tabPayment Entry Reference${bt}.allocated_amount as allocated_amount`,
      ],
      filters: [
        ["Payment Entry Reference", "reference_name", "=", invoiceId],
        ["Payment Entry", "docstatus", "=", 1],
      ],
      order_by: "posting_date asc",
      limit_page_length: 50,
    };

    const res = await fetch(
      `${FRAPPE_URL}/api/method/frappe.client.get_list`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[invoice-payments] Frappe error:", res.status, text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to fetch payment entries" },
        { status: res.status },
      );
    }

    const json = await res.json();
    const rows = (json.message ?? []).map(
      (r: {
        name: string;
        paid_amount: number;
        allocated_amount: number;
        mode_of_payment: string;
        posting_date: string;
        reference_no: string;
        remarks: string;
      }) => ({
        name: r.name,
        amount: r.allocated_amount || r.paid_amount,
        mode_of_payment: r.mode_of_payment,
        posting_date: r.posting_date,
        reference_no: r.reference_no,
        remarks: r.remarks,
      }),
    );

    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[invoice-payments] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
