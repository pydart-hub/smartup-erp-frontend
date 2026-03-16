/**
 * POST /api/payments/record-cash
 *
 * Records a cash / offline payment against a Sales Invoice.
 * Uses Frappe's get_payment_entry whitelisted method (same approach as Razorpay verify)
 * so all GL accounts are auto-resolved.
 *
 * Body:
 *   invoice_id       — Sales Invoice name  (e.g. "ACC-SINV-2026-00050")
 *   amount           — payment amount in INR
 *   mode_of_payment  — "Cash" | "Bank Transfer" | "UPI" | "Cheque"
 *   posting_date     — payment date (YYYY-MM-DD)
 *   reference_no     — optional receipt / UTR number
 *
 * Returns: { payment_entry: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Auth: require staff role (BM / Admin / Director)
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const email = authResult.email;

    const body = await request.json();
    const { invoice_id, amount, mode_of_payment, posting_date, reference_no } = body as {
      invoice_id: string;
      amount: number;
      mode_of_payment: string;
      posting_date: string;
      reference_no?: string;
    };

    if (!invoice_id || !amount || !mode_of_payment || !posting_date) {
      return NextResponse.json(
        { error: "invoice_id, amount, mode_of_payment, and posting_date are required" },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `token ${API_KEY}:${API_SECRET}`,
    };

    // ── Check if student is discontinued ──
    try {
      const invRes = await fetch(
        `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoice_id)}?fields=["student"]`,
        { headers },
      );
      if (invRes.ok) {
        const invData = (await invRes.json()).data;
        const studentId = invData?.student;
        if (studentId) {
          const stuRes = await fetch(
            `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}?fields=["enabled","custom_discontinuation_date"]`,
            { headers },
          );
          if (stuRes.ok) {
            const stu = (await stuRes.json()).data;
            if (stu?.enabled === 0 && stu?.custom_discontinuation_date) {
              return NextResponse.json(
                { error: "Cannot accept payment — student is discontinued" },
                { status: 403 },
              );
            }
          }
        }
      }
    } catch {
      // Non-blocking — proceed if lookup fails
    }

    // 1. Use Frappe's get_payment_entry to get a fully mapped PE
    const getPeRes = await fetch(
      `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          dt: "Sales Invoice",
          dn: invoice_id,
          party_amount: amount,
          bank_amount: amount,
        }),
      },
    );

    if (!getPeRes.ok) {
      const errText = await getPeRes.text();
      console.error("[record-cash] get_payment_entry failed:", getPeRes.status, errText);
      return NextResponse.json(
        { error: `Failed to prepare payment entry: ${getPeRes.statusText}` },
        { status: 502 },
      );
    }

    const mappedPE = (await getPeRes.json()).message;

    // 2. Patch PE with cash-specific fields
    mappedPE.mode_of_payment = mode_of_payment;
    mappedPE.posting_date = posting_date;
    mappedPE.reference_no = reference_no || `CASH-${Date.now()}`;
    mappedPE.reference_date = posting_date;
    mappedPE.paid_amount = amount;
    mappedPE.received_amount = amount;
    mappedPE.remarks = `${mode_of_payment} payment recorded by ${email} on ${posting_date}.${reference_no ? ` Ref: ${reference_no}` : ""}`;

    // Override allocated amount in references
    if (mappedPE.references && Array.isArray(mappedPE.references)) {
      for (const ref of mappedPE.references as { reference_name: string; allocated_amount: number }[]) {
        if (ref.reference_name === invoice_id) {
          ref.allocated_amount = amount;
        }
      }
    }

    // 3. Insert the Payment Entry
    const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
      method: "POST",
      headers,
      body: JSON.stringify(mappedPE),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("[record-cash] PE insert failed:", insertRes.status, errText);
      return NextResponse.json(
        { error: `Failed to create payment entry: ${insertRes.statusText}` },
        { status: 502 },
      );
    }

    const insertData = await insertRes.json();
    const paymentEntryName = insertData.data?.name;

    // 4. Submit the Payment Entry
    if (paymentEntryName) {
      const submitRes = await fetch(
        `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ docstatus: 1 }),
        },
      );

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.error("[record-cash] PE submit failed:", submitRes.status, errText);
        // PE was created but not submitted — still return it
        return NextResponse.json({
          payment_entry: paymentEntryName,
          warning: "Payment Entry created but could not be submitted. Please submit manually in Frappe.",
        });
      }
    }

    // Receipt email is now triggered by the frontend after receiving this response.

    return NextResponse.json({ payment_entry: paymentEntryName });
  } catch (error: unknown) {
    console.error("[record-cash] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to record payment" },
      { status: 500 },
    );
  }
}
