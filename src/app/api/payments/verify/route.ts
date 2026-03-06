import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

/**
 * POST /api/payments/verify
 *
 * Verifies Razorpay payment signature and records the payment
 * as a comment on the Sales Invoice in Frappe so the admin knows.
 *
 * Body:
 *   razorpay_order_id
 *   razorpay_payment_id
 *   razorpay_signature
 *   invoice_id          — Sales Invoice / Fees name
 *   amount              — paid amount in INR
 *   student_name        — for reference
 *   customer            — customer name
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let email: string;
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
      email = sessionData.email;
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "No email in session" }, { status: 400 });
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoice_id,
      amount,
      student_name,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details" },
        { status: 400 }
      );
    }

    // ── Verify signature ──
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("[payments/verify] Signature mismatch");
      return NextResponse.json(
        { error: "Payment verification failed — signature mismatch" },
        { status: 400 }
      );
    }

    // ── Record payment in Frappe ──
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    const actualInvoiceId = invoice_id;

    // Determine reference doctype — invoices are always generated from the backend
    const isSalesInvoice = actualInvoiceId?.startsWith("ACC-SINV") || actualInvoiceId?.startsWith("SINV");
    const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

    // ── Create Payment Entry against the invoice ──
    // Use Frappe's get_payment_entry method which auto-resolves all accounts
    let paymentEntryName: string | null = null;
    try {
      // Step 1: Use Frappe's whitelisted method to get a properly mapped Payment Entry
      const getPeRes = await fetch(
        `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            dt: referenceDoctype,
            dn: actualInvoiceId,
            party_amount: amount,
            bank_amount: amount,
          }),
        }
      );

      if (!getPeRes.ok) {
        const errText = await getPeRes.text();
        console.error("[payments/verify] get_payment_entry failed:", getPeRes.status, errText);
        throw new Error(`get_payment_entry failed: ${getPeRes.status} — ${errText.substring(0, 500)}`);
      }

      const getPeData = await getPeRes.json();
      const mappedPE = getPeData.message;

      // Step 2: Add Razorpay-specific fields to the mapped doc
      mappedPE.reference_no = razorpay_payment_id;
      mappedPE.reference_date = new Date().toISOString().split("T")[0];
      mappedPE.remarks = `Online payment via Razorpay. Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}. Student: ${student_name || ""}. Parent email: ${email}`;

      // Override allocated amount in references to match actual payment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mappedPE.references && Array.isArray(mappedPE.references)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const ref of mappedPE.references as any[]) {
          if (ref.reference_name === actualInvoiceId) {
            ref.allocated_amount = amount;
          }
        }
      }

      // Ensure paid amounts match
      mappedPE.paid_amount = amount;
      mappedPE.received_amount = amount;

      // Step 3: Insert the Payment Entry
      const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
        method: "POST",
        headers,
        body: JSON.stringify(mappedPE),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error("[payments/verify] PE insert failed:", insertRes.status, errText);
        throw new Error(`PE insert failed: ${insertRes.status} — ${errText.substring(0, 500)}`);
      }

      const insertData = await insertRes.json();
      paymentEntryName = insertData.data?.name;
      console.log("[payments/verify] Payment Entry created:", paymentEntryName);

      // Step 4: Submit the Payment Entry (docstatus 0 → 1)
      if (paymentEntryName) {
        const submitRes = await fetch(
          `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ docstatus: 1 }),
          }
        );
        if (!submitRes.ok) {
          const errText = await submitRes.text();
          console.warn("[payments/verify] PE submit failed:", submitRes.status, errText);
        } else {
          console.log("[payments/verify] Payment Entry submitted:", paymentEntryName);
        }
      }
    } catch (peError) {
      console.error("[payments/verify] Payment Entry flow failed:", peError);

      // Fallback: add a comment on the invoice so admin can reconcile
      await addPaymentComment(
        headers,
        referenceDoctype,
        actualInvoiceId,
        razorpay_payment_id,
        razorpay_order_id,
        amount,
        email,
        student_name
      );
    }

    // Step 5: Send receipt email to parent (non-blocking)
    // Do NOT pass `email` (session user) — let send-receipt resolve the guardian email
    // from the invoice. Otherwise when BM pays on behalf, receipt goes to BM not parent.
    if (paymentEntryName && actualInvoiceId) {
      try {
        const origin = request.nextUrl.origin;
        const receiptRes = await fetch(`${origin}/api/payments/send-receipt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ invoice_id: actualInvoiceId }),
        });
        if (!receiptRes.ok) {
          const errBody = await receiptRes.text();
          console.warn("[payments/verify] Receipt email returned error:", receiptRes.status, errBody);
        }
      } catch (emailErr) {
        console.warn("[payments/verify] Receipt email failed (non-blocking):", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: paymentEntryName
        ? "Payment verified and recorded successfully"
        : "Payment verified. Admin will reconcile the payment entry.",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      invoice_id: actualInvoiceId,
      payment_entry: paymentEntryName,
    });
  } catch (error: unknown) {
    console.error("[payments/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}

/** Fallback: add a comment on the invoice documenting the Razorpay payment */
async function addPaymentComment(
  headers: Record<string, string>,
  doctype: string,
  docname: string,
  paymentId: string,
  orderId: string,
  amount: number,
  parentEmail: string,
  studentName?: string
) {
  try {
    const comment = `💳 Online Payment Received via Razorpay\n\n` +
      `Amount: ₹${amount.toLocaleString("en-IN")}\n` +
      `Razorpay Payment ID: ${paymentId}\n` +
      `Razorpay Order ID: ${orderId}\n` +
      `Student: ${studentName || "N/A"}\n` +
      `Parent Email: ${parentEmail}\n` +
      `Date: ${new Date().toLocaleString("en-IN")}\n\n` +
      `⚠️ Please reconcile this payment manually if Payment Entry was not auto-created.`;

    await fetch(`${FRAPPE_URL}/api/resource/Comment`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        comment_type: "Comment",
        reference_doctype: doctype,
        reference_name: docname,
        content: comment,
      }),
    });
    console.log("[payments/verify] Fallback comment added on", doctype, docname);
  } catch (err) {
    console.error("[payments/verify] Failed to add comment:", err);
  }
}
