import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRazorpayKeys, getInvoiceCompany } from "@/lib/utils/razorpay";
import { resolveAccountPaidTo } from "@/lib/utils/accountMapping";
import { getCofeeOrderStatus } from "@/lib/utils/cofee";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

interface PaymentEntryLookup {
  name: string;
  docstatus?: number;
}

interface InvoiceState {
  outstanding_amount: number;
  status?: string;
}

/**
 * POST /api/payments/verify
 *
 * Verifies Razorpay payment signature and records the payment in Frappe.
 * Success is returned only after a submitted Payment Entry is confirmed.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let email: string;
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString(),
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
      gateway,
      order_id,
    } = body;

    let payment_id: string;
    let payment_order_id: string;
    let modeOfPayment = "Razorpay";

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const company = await getInvoiceCompany(invoice_id, FRAPPE_URL!, adminAuth);

    if (gateway === "cofee") {
      if (!order_id) {
        return NextResponse.json(
          { error: "Missing CoFee order_id details" },
          { status: 400 },
        );
      }
      const cofeeStatus = await getCofeeOrderStatus(order_id);
      if (cofeeStatus.status !== "SUCCESS" || !cofeeStatus.data) {
        return NextResponse.json(
          { error: "Failed to retrieve CoFee payment status" },
          { status: 400 },
        );
      }
      const orderData = cofeeStatus.data;
      if (orderData.order_status !== "success") {
        let displayError = `Payment not completed. Status: ${orderData.order_status}`;
        if (orderData.order_status === "processing" || orderData.order_status === "pending") {
          displayError = "Your payment is currently processing or pending. Please check back in a few minutes.";
        } else if (orderData.order_status === "failed" || orderData.order_status === "cancelled") {
          displayError = "The payment was cancelled or failed. Please try again.";
        }
        return NextResponse.json(
          { error: displayError },
          { status: 400 },
        );
      }
      payment_id = order_id;
      payment_order_id = order_id;
      modeOfPayment = "CoFee";
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Missing Razorpay payment details" },
          { status: 400 },
        );
      }

      const { keySecret } = getRazorpayKeys(company || "");
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        console.error("[payments/verify] Signature mismatch");
        return NextResponse.json(
          { error: "Payment verification failed - signature mismatch" },
          { status: 400 },
        );
      }
      payment_id = razorpay_payment_id;
      payment_order_id = razorpay_order_id;
      modeOfPayment = "Razorpay";
    }

    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    const actualInvoiceId = invoice_id;

    try {
      const invRes = await fetch(
        `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(actualInvoiceId)}?fields=["student"]`,
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
                { error: "Cannot accept payment - student is discontinued" },
                { status: 403 },
              );
            }
          }
        }
      }
    } catch {
      // Non-blocking: verification still continues.
    }

    const isSalesInvoice =
      actualInvoiceId?.startsWith("ACC-SINV") || actualInvoiceId?.startsWith("SINV");
    const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

    const existingPaymentEntry = await findPaymentEntryByReference(
      headers,
      payment_id,
    );
    if (existingPaymentEntry) {
      const invoiceState = await fetchInvoiceState(headers, actualInvoiceId);
      return NextResponse.json({
        success: true,
        message: "Payment was already recorded successfully",
        payment_id,
        order_id: payment_order_id,
        invoice_id: actualInvoiceId,
        payment_entry: existingPaymentEntry.name,
        invoice_outstanding_amount: invoiceState?.outstanding_amount ?? null,
      });
    }

    let paymentEntryName: string | null = null;

    try {
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
        },
      );

      if (!getPeRes.ok) {
        const errText = await getPeRes.text();
        console.error("[payments/verify] get_payment_entry failed:", getPeRes.status, errText);
        throw new Error(`get_payment_entry failed: ${getPeRes.status} - ${errText.substring(0, 500)}`);
      }

      const mappedPE = (await getPeRes.json()).message;
      mappedPE.mode_of_payment = modeOfPayment;
      mappedPE.reference_no = payment_id;
      mappedPE.reference_date = new Date().toISOString().split("T")[0];
      mappedPE.remarks = `Online payment via ${modeOfPayment}. Order: ${payment_order_id}, Payment: ${payment_id}. Student: ${student_name || ""}. Parent email: ${email}`;

      if (company) {
        let resolved = await resolveAccountPaidTo(modeOfPayment, company, FRAPPE_URL!, adminAuth);
        
        // If "CoFee" doesn't exist or isn't mapped, fallback to "Razorpay" to ensure the entry goes through
        if (!resolved && modeOfPayment === "CoFee") {
          console.warn(`[payments/verify] No account mapping for CoFee, falling back to Razorpay for company=${company}`);
          resolved = await resolveAccountPaidTo("Razorpay", company, FRAPPE_URL!, adminAuth);
          mappedPE.mode_of_payment = "Razorpay";
        }

        if (resolved) {
          mappedPE.paid_to = resolved.account;
          mappedPE.paid_to_account_type = resolved.accountType;
        } else {
          console.warn(`[payments/verify] No account mapping found for company=${company}`);
        }
      }

      if (mappedPE.references && Array.isArray(mappedPE.references)) {
        for (const ref of mappedPE.references as Array<{ reference_name: string; allocated_amount: number }>) {
          if (ref.reference_name === actualInvoiceId) {
            ref.allocated_amount = amount;
          }
        }
      }

      mappedPE.paid_amount = amount;
      mappedPE.received_amount = amount;

      const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
        method: "POST",
        headers,
        body: JSON.stringify(mappedPE),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error("[payments/verify] PE insert failed:", insertRes.status, errText);
        throw new Error(`PE insert failed: ${insertRes.status} - ${errText.substring(0, 500)}`);
      }

      const insertData = await insertRes.json();
      paymentEntryName = insertData.data?.name;
      if (!paymentEntryName) {
        throw new Error("Payment Entry insert succeeded but no name was returned");
      }
      console.log("[payments/verify] Payment Entry created:", paymentEntryName);

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
        throw new Error(`PE submit failed: ${submitRes.status} - ${errText.substring(0, 500)}`);
      }
      console.log("[payments/verify] Payment Entry submitted:", paymentEntryName);

      const paymentEntryAfterSubmit = await fetchPaymentEntry(headers, paymentEntryName);
      if (!paymentEntryAfterSubmit || paymentEntryAfterSubmit.docstatus !== 1) {
        throw new Error("Payment Entry was not submitted successfully");
      }

      const invoiceAfterSubmit = await fetchInvoiceState(headers, actualInvoiceId);
      if (!invoiceAfterSubmit) {
        throw new Error("Payment Entry submitted, but invoice could not be re-verified");
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified and recorded successfully",
        payment_id,
        order_id: payment_order_id,
        invoice_id: actualInvoiceId,
        payment_entry: paymentEntryName,
        invoice_outstanding_amount: invoiceAfterSubmit.outstanding_amount,
      });
    } catch (peError) {
      console.error("[payments/verify] Payment Entry flow failed:", peError);

      await addPaymentComment(
        headers,
        referenceDoctype,
        actualInvoiceId,
        payment_id,
        payment_order_id,
        amount,
        email,
        modeOfPayment,
        student_name,
      );

      return NextResponse.json(
        {
          error: "Payment was received but ERP recording failed. No Payment Entry was confirmed.",
          code: "PAYMENT_NOT_RECORDED",
          payment_id,
          order_id: payment_order_id,
          invoice_id: actualInvoiceId,
          payment_entry: paymentEntryName,
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    console.error("[payments/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Payment verification failed" },
      { status: 500 },
    );
  }
}

async function findPaymentEntryByReference(
  headers: Record<string, string>,
  referenceNo: string,
): Promise<PaymentEntryLookup | null> {
  const filters = encodeURIComponent(JSON.stringify([["reference_no", "=", referenceNo]]));
  const fields = encodeURIComponent(JSON.stringify(["name", "docstatus"]));
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry?filters=${filters}&fields=${fields}&limit_page_length=1`,
    { headers },
  );
  if (!res.ok) return null;
  const data = (await res.json()).data as PaymentEntryLookup[] | undefined;
  const existing = data?.[0];
  return existing?.docstatus === 1 ? existing : null;
}

async function fetchPaymentEntry(
  headers: Record<string, string>,
  name: string,
): Promise<PaymentEntryLookup | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(name)}?fields=["name","docstatus"]`,
    { headers },
  );
  if (!res.ok) return null;
  return (await res.json()).data as PaymentEntryLookup;
}

async function fetchInvoiceState(
  headers: Record<string, string>,
  invoiceId: string,
): Promise<InvoiceState | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}?fields=["outstanding_amount","status"]`,
    { headers },
  );
  if (!res.ok) return null;
  return (await res.json()).data as InvoiceState;
}

async function addPaymentComment(
  headers: Record<string, string>,
  doctype: string,
  docname: string,
  paymentId: string,
  orderId: string,
  amount: number,
  parentEmail: string,
  modeOfPayment: string,
  studentName?: string,
) {
  try {
    const comment =
      `Online Payment Received via ${modeOfPayment}\n\n` +
      `Amount: Rs.${amount.toLocaleString("en-IN")}\n` +
      `${modeOfPayment} Payment ID: ${paymentId}\n` +
      `${modeOfPayment} Order ID: ${orderId}\n` +
      `Student: ${studentName || "N/A"}\n` +
      `Parent Email: ${parentEmail}\n` +
      `Date: ${new Date().toLocaleString("en-IN")}\n\n` +
      `Please reconcile this payment manually because Payment Entry confirmation failed.`;

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
