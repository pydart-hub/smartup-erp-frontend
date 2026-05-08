/**
 * POST /api/admission/apply-sibling-discount
 *
 * Applies a retroactive sibling discount to the EXISTING sibling's
 * last unpaid invoice when a new sibling is admitted.
 *
 * Discount = 10% for Advanced plan, 5% for other plans
 * (based on existing sibling's Sales Order custom_plan).
 *
 * Mechanism: Cancels the last unpaid invoice and recreates it at
 * the reduced rate (original amount − discount), then submits.
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
      ["name", "grand_total", "custom_plan"],
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

    // 4. Calculate discount — 10% for Advanced plan, 5% otherwise
    const plan = (salesOrders[0].custom_plan as string) || "";
    const discountRate = plan === "Advanced" ? 0.10 : 0.05;
    const discountAmount = Math.round(totalFee * discountRate);

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
      "due_date desc, posting_date desc",
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

    // 6. Pick the LAST unpaid invoice (first in desc-sorted list)
    const targetInvoice = unpaidInvoices[0];
    const invoiceName = targetInvoice.name as string;
    const invoiceGrandTotal = targetInvoice.grand_total as number;
    const invoiceOutstanding = targetInvoice.outstanding_amount as number;

    // Safety: only cancel if invoice is fully unpaid (no partial payments made)
    if (invoiceOutstanding < invoiceGrandTotal) {
      return NextResponse.json(
        { error: `Last invoice ${invoiceName} has a partial payment (outstanding: ₹${invoiceOutstanding} of ₹${invoiceGrandTotal}). Cannot safely cancel. Apply discount manually.` },
        { status: 409 },
      );
    }

    // Safety cap: discount cannot exceed the invoice amount
    const effectiveDiscount = Math.min(discountAmount, invoiceGrandTotal);

    // 7. Fetch full invoice to get item details for recreation
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

    // 8. Cancel the last invoice (docstatus 1 → 2)
    const cancelResult = await frappePut("Sales Invoice", invoiceName, { docstatus: 2 });
    if (!cancelResult.ok) {
      return NextResponse.json(
        { error: `Failed to cancel invoice ${invoiceName}: ${cancelResult.error}` },
        { status: 500 },
      );
    }

    // 9. Recreate the invoice at the reduced rate
    const newRate = invoiceGrandTotal - effectiveDiscount;
    const newInvoicePayload: Record<string, unknown> = {
      doctype: "Sales Invoice",
      customer: customerName,
      company: fullInvoice.company as string,
      posting_date: fullInvoice.posting_date as string,
      due_date: fullInvoice.due_date as string,
      is_return: 0,
      items: [{
        item_code: firstItem.item_code,
        item_name: firstItem.item_name,
        description: `${firstItem.description ?? firstItem.item_name} | Sibling discount: -₹${effectiveDiscount.toLocaleString("en-IN")}`,
        qty: 1,
        rate: newRate,
        amount: newRate,
        uom: firstItem.uom || firstItem.stock_uom || "Nos",
        income_account: firstItem.income_account,
        cost_center: firstItem.cost_center,
        ...(firstItem.sales_order ? { sales_order: firstItem.sales_order } : {}),
        ...(firstItem.so_detail ? { so_detail: firstItem.so_detail } : {}),
      }],
    };
    if (fullInvoice.custom_academic_year) {
      newInvoicePayload.custom_academic_year = fullInvoice.custom_academic_year;
    }

    const createResult = await frappePost("Sales Invoice", newInvoicePayload);
    if (!createResult.ok) {
      console.error("[apply-sibling-discount] Invoice recreation failed after cancel:", createResult.error);
      return NextResponse.json(
        { error: `Invoice recreation failed after cancelling ${invoiceName}: ${createResult.error}` },
        { status: 500 },
      );
    }

    const newInvoiceName = createResult.data!.name as string;

    // 10. Submit the new invoice (docstatus 0 → 1)
    const submitResult = await frappePut("Sales Invoice", newInvoiceName, { docstatus: 1 });
    if (!submitResult.ok) {
      console.error("[apply-sibling-discount] New invoice submission failed:", submitResult.error);
      return NextResponse.json(
        { error: `New invoice ${newInvoiceName} created but submission failed: ${submitResult.error}` },
        { status: 500 },
      );
    }

    // 11. Mark existing sibling's discount as applied (non-blocking)
    try {
      await frappePut("Student", existingSiblingId, {
        custom_sibling_discount_applied: 1,
      });
    } catch (flagErr) {
      console.warn("[apply-sibling-discount] Could not set discount-applied flag:", flagErr);
    }

    console.log(
      `[apply-sibling-discount] Cancelled ${invoiceName} and recreated as ${newInvoiceName} at ₹${newRate} (discount: ₹${effectiveDiscount}, student: ${existingSiblingId})`,
    );

    return NextResponse.json({
      success: true,
      oldInvoice: invoiceName,
      newInvoice: newInvoiceName,
      discountAmount: effectiveDiscount,
      totalFee,
      originalInvoiceAmount: invoiceGrandTotal,
      newInvoiceAmount: newRate,
    });
  } catch (err) {
    console.error("[apply-sibling-discount] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
