import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyToken } from "@/lib/utils/invoiceToken";
import { getRazorpayKeys, getSalesOrderCompany } from "@/lib/utils/razorpay";
import { resolveAccountPaidTo } from "@/lib/utils/accountMapping";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/pay/verify
 *
 * Token-authenticated payment verification.
 * Verifies Razorpay signature, creates Payment Entry in Frappe.
 *
 * Body: {
 *   token, razorpay_order_id, razorpay_payment_id, razorpay_signature,
 *   invoice_id, amount, student_name, customer
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoice_id,
      amount,
      student_name,
    } = body;

    // ── Token auth ──
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details" },
        { status: 400 },
      );
    }

    // ── Resolve branch Razorpay keys from Sales Order company ──
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const company = await getSalesOrderCompany(payload.so, FRAPPE_URL!, adminAuth);
    const { keySecret } = getRazorpayKeys(company || "");

    // ── Verify Razorpay signature ──
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("[pay/verify] Signature mismatch");
      return NextResponse.json(
        { error: "Payment verification failed — signature mismatch" },
        { status: 400 },
      );
    }

    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
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
      // Non-blocking
    }

    // ── Create Payment Entry via get_payment_entry ──
    const isSalesInvoice = invoice_id?.startsWith("ACC-SINV") || invoice_id?.startsWith("SINV");
    const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

    let paymentEntryName: string | null = null;
    try {
      // Step 1: Use Frappe's whitelisted method
      const getPeRes = await fetch(
        `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            dt: referenceDoctype,
            dn: invoice_id,
            party_amount: amount,
            bank_amount: amount,
          }),
        },
      );

      if (!getPeRes.ok) {
        const errText = await getPeRes.text();
        console.error("[pay/verify] get_payment_entry failed:", getPeRes.status, errText);
        throw new Error(`get_payment_entry failed: ${getPeRes.status}`);
      }

      const mappedPE = (await getPeRes.json()).message;

      // Step 2: Add Razorpay fields
      mappedPE.mode_of_payment = "Razorpay";
      mappedPE.reference_no = razorpay_payment_id;
      mappedPE.reference_date = new Date().toISOString().split("T")[0];
      mappedPE.remarks = `Online payment via Razorpay (WhatsApp link). Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}. Student: ${student_name || ""}. SO: ${payload.so}`;

      // ── Resolve correct "Account Paid To" from Mode of Payment mapping ──
      if (company) {
        const resolved = await resolveAccountPaidTo("Razorpay", company, FRAPPE_URL!, adminAuth);
        if (resolved) {
          mappedPE.paid_to = resolved.account;
          mappedPE.paid_to_account_type = resolved.accountType;
        } else {
          console.warn(`[pay/verify] No account mapping for Razorpay, company=${company}`);
        }
      }

      // Override allocated amount
      if (mappedPE.references && Array.isArray(mappedPE.references)) {
        for (const ref of mappedPE.references as Array<{ reference_name: string; allocated_amount: number }>) {
          if (ref.reference_name === invoice_id) {
            ref.allocated_amount = amount;
          }
        }
      }

      mappedPE.paid_amount = amount;
      mappedPE.received_amount = amount;

      // Step 3: Insert
      const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
        method: "POST",
        headers,
        body: JSON.stringify(mappedPE),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error("[pay/verify] PE insert failed:", insertRes.status, errText);
        throw new Error(`PE insert failed: ${insertRes.status}`);
      }

      const insertData = await insertRes.json();
      paymentEntryName = insertData.data?.name;
      console.log("[pay/verify] Payment Entry created:", paymentEntryName);

      // Step 4: Submit
      if (paymentEntryName) {
        const submitRes = await fetch(
          `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ docstatus: 1 }),
          },
        );
        if (submitRes.ok) {
          console.log("[pay/verify] Payment Entry submitted:", paymentEntryName);
        } else {
          console.warn("[pay/verify] PE submit failed:", submitRes.status);
        }
      }
    } catch (peError) {
      console.error("[pay/verify] Payment Entry flow failed:", peError);

      // Fallback: comment on the invoice
      try {
        const comment = `💳 Online Payment (WhatsApp Link)\nAmount: ₹${amount?.toLocaleString("en-IN")}\nRazorpay Payment: ${razorpay_payment_id}\nOrder: ${razorpay_order_id}\nStudent: ${student_name || "N/A"}\nSO: ${payload.so}\n\n⚠️ Auto Payment Entry failed. Please reconcile manually.`;
        await fetch(`${FRAPPE_URL}/api/resource/Comment`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            comment_type: "Comment",
            reference_doctype: referenceDoctype,
            reference_name: invoice_id,
            content: comment,
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      message: paymentEntryName
        ? "Payment verified and recorded successfully"
        : "Payment verified. Admin will reconcile the payment entry.",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      invoice_id,
      payment_entry: paymentEntryName,
    });
  } catch (error: unknown) {
    console.error("[pay/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Payment verification failed" },
      { status: 500 },
    );
  }
}
