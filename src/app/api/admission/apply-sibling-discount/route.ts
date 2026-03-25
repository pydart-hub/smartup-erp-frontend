/**
 * POST /api/admission/apply-sibling-discount
 *
 * Applies a retroactive 5% sibling discount to the EXISTING sibling's
 * first upcoming unpaid invoice when a new sibling is admitted.
 *
 * Discount = 5% of the existing sibling's Sales Order grand_total
 * (total original fee = paid + unpaid).
 *
 * Mechanism: Creates a Credit Note (is_return=1) against the first
 * unpaid invoice, which auto-reduces its outstanding_amount.
 *
 * Body: { existingSiblingId: string }
 *
 * Idempotent: checks custom_sibling_discount_applied before applying.
 */

import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

// ── Frappe helpers ──────────────────────────────────────────────

async function frappeGetList(
  doctype: string,
  filters: (string | number | string[])[][],
  fields: string[],
  limit = 100,
  orderBy?: string,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  if (orderBy) params.set("order_by", orderBy);
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

async function frappeGetDoc(
  doctype: string,
  name: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()).data ?? null;
}

async function frappePost(
  doctype: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`,
    { method: "POST", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  if (res.ok) {
    const json = await res.json();
    return { ok: true, data: json.data };
  }
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: errText };
}

async function frappePut(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "PUT", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  if (res.ok) {
    const json = await res.json();
    return { ok: true, data: json.data };
  }
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: errText };
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { existingSiblingId } = body as { existingSiblingId?: string };

    if (!existingSiblingId?.trim()) {
      return NextResponse.json(
        { error: "existingSiblingId is required" },
        { status: 400 },
      );
    }

    // 1. Fetch existing sibling's Student record
    const student = await frappeGetDoc("Student", existingSiblingId);
    if (!student) {
      return NextResponse.json(
        { error: `Student ${existingSiblingId} not found` },
        { status: 404 },
      );
    }

    // 2. Idempotency check — skip if discount already applied
    if (student.custom_sibling_discount_applied === 1) {
      return NextResponse.json({
        skipped: true,
        message: "Sibling discount already applied to this student",
      });
    }

    const customerName = student.customer as string;
    if (!customerName) {
      return NextResponse.json(
        { error: "Student has no linked Customer — cannot find invoices" },
        { status: 400 },
      );
    }

    // 3. Get the latest submitted Sales Order to find total original fee
    const salesOrders = await frappeGetList(
      "Sales Order",
      [
        ["customer", "=", customerName],
        ["docstatus", "=", 1],
      ],
      ["name", "grand_total"],
      1,
      "creation desc",
    );

    if (salesOrders.length === 0) {
      return NextResponse.json(
        { error: "No submitted Sales Order found for this student" },
        { status: 404 },
      );
    }

    const totalFee = salesOrders[0].grand_total as number;
    if (!totalFee || totalFee <= 0) {
      return NextResponse.json(
        { error: `Sales Order grand_total is ${totalFee} — cannot calculate discount` },
        { status: 400 },
      );
    }

    // 4. Calculate 5% discount
    const discountAmount = Math.round(totalFee * 0.05);

    // 5. Get unpaid invoices (outstanding > 0), ordered by due_date ascending
    const unpaidInvoices = await frappeGetList(
      "Sales Invoice",
      [
        ["customer", "=", customerName],
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
        ["is_return", "=", 0],
      ],
      ["name", "grand_total", "outstanding_amount", "due_date", "posting_date", "company"],
      100,
      "due_date asc, posting_date asc",
    );

    if (unpaidInvoices.length === 0) {
      // All invoices paid — mark discount applied but note no credit note needed
      await frappePut("Student", existingSiblingId, {
        custom_sibling_discount_applied: 1,
      });
      return NextResponse.json({
        skipped: true,
        message: "All invoices already paid — no unpaid invoice to apply discount to. Marked as applied.",
        totalFee,
        discountAmount,
      });
    }

    // 6. Pick the first unpaid invoice
    const targetInvoice = unpaidInvoices[0];
    const invoiceName = targetInvoice.name as string;
    const invoiceOutstanding = targetInvoice.outstanding_amount as number;

    // Safety cap: discount cannot exceed the invoice's outstanding amount
    const effectiveDiscount = Math.min(discountAmount, invoiceOutstanding);

    // 7. Fetch the full invoice to get item details for the credit note
    const fullInvoice = await frappeGetDoc("Sales Invoice", invoiceName);
    if (!fullInvoice) {
      return NextResponse.json(
        { error: `Could not fetch invoice ${invoiceName}` },
        { status: 500 },
      );
    }

    const items = (fullInvoice.items as Record<string, unknown>[]) ?? [];
    const firstItem = items[0] ?? {};
    if (!firstItem.item_code) {
      return NextResponse.json(
        { error: `Invoice ${invoiceName} has no items` },
        { status: 500 },
      );
    }

    // 8. Create Credit Note — mirror the original invoice item exactly
    //    so Frappe's return validation passes ("Returned Item must exist in original invoice").
    const today = new Date().toISOString().split("T")[0];
    const cnItem: Record<string, unknown> = {
      item_code: firstItem.item_code,
      item_name: firstItem.item_name,
      description: `Sibling discount — 5% of total fee ₹${totalFee.toLocaleString("en-IN")}`,
      qty: -1,
      rate: effectiveDiscount,
      amount: -effectiveDiscount,
      uom: firstItem.uom || firstItem.stock_uom || "Nos",
      income_account: firstItem.income_account,
      cost_center: firstItem.cost_center,
      // Link back to the original invoice item so Frappe's return matching works
      si_detail: firstItem.name,
    };
    // Only link SO fields if they exist on the original item
    if (firstItem.sales_order) cnItem.sales_order = firstItem.sales_order;
    if (firstItem.so_detail) cnItem.so_detail = firstItem.so_detail;

    const creditNotePayload: Record<string, unknown> = {
      doctype: "Sales Invoice",
      customer: customerName,
      company: fullInvoice.company as string,
      posting_date: today,
      due_date: today,
      is_return: 1,
      return_against: invoiceName,
      update_outstanding_for_self: 0,
      update_billed_amount_in_sales_order: 0,
      items: [cnItem],
    };
    // Copy mandatory custom fields from the original invoice
    if (fullInvoice.custom_academic_year) {
      creditNotePayload.custom_academic_year = fullInvoice.custom_academic_year;
    }

    const createResult = await frappePost("Sales Invoice", creditNotePayload);
    if (!createResult.ok) {
      console.error("[apply-sibling-discount] Credit Note creation failed:", createResult.error);
      return NextResponse.json(
        { error: `Credit Note creation failed: ${createResult.error}` },
        { status: 500 },
      );
    }

    const cnName = createResult.data!.name as string;

    // 9. Submit the Credit Note (docstatus 0 → 1)
    const submitResult = await frappePut("Sales Invoice", cnName, { docstatus: 1 });
    if (!submitResult.ok) {
      console.error("[apply-sibling-discount] Credit Note submission failed:", submitResult.error);
      return NextResponse.json(
        { error: `Credit Note created (${cnName}) but submission failed: ${submitResult.error}` },
        { status: 500 },
      );
    }

    // 10. Mark existing sibling's discount as applied (non-blocking)
    try {
      await frappePut("Student", existingSiblingId, {
        custom_sibling_discount_applied: 1,
      });
    } catch (flagErr) {
      console.warn("[apply-sibling-discount] Could not set discount-applied flag:", flagErr);
    }

    console.log(
      `[apply-sibling-discount] Created Credit Note ${cnName} for ₹${effectiveDiscount} against ${invoiceName} (student: ${existingSiblingId}, total fee: ${totalFee})`,
    );

    return NextResponse.json({
      success: true,
      creditNote: cnName,
      discountAmount: effectiveDiscount,
      totalFee,
      invoiceAffected: invoiceName,
      previousOutstanding: invoiceOutstanding,
      newOutstanding: invoiceOutstanding - effectiveDiscount,
    });
  } catch (err) {
    console.error("[apply-sibling-discount] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
