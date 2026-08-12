import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyToken } from "@/lib/utils/invoiceToken";
import { getRazorpayKeys, getSalesOrderCompany } from "@/lib/utils/razorpay";
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
 * POST /api/pay/verify
 *
 * Token-authenticated payment verification for WhatsApp magic links.
 * Success is returned only after a submitted Payment Entry is confirmed.
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
      gateway,
      order_id,
    } = body;

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    let payment_id: string;
    let payment_order_id: string;
    let modeOfPayment = "Razorpay";

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const company = await getSalesOrderCompany(payload.so, FRAPPE_URL!, adminAuth);

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
        console.error("[pay/verify] Signature mismatch");
        return NextResponse.json(
          { error: "Payment verification failed - signature mismatch" },
          { status: 400 },
        );
      }

      payment_id = razorpay_payment_id;
      payment_order_id = razorpay_order_id;
    }

    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

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
      invoice_id?.startsWith("ACC-SINV") || invoice_id?.startsWith("SINV");
    const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

    const existingPaymentEntry = await findPaymentEntryByReference(
      headers,
      payment_id,
    );
    if (existingPaymentEntry) {
      const invoiceState = await fetchInvoiceState(headers, invoice_id);
      return NextResponse.json({
        success: true,
        message: "Payment was already recorded successfully",
        payment_id,
        order_id: payment_order_id,
        invoice_id,
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
            dn: invoice_id,
            party_amount: amount,
            bank_amount: amount,
          }),
        },
      );

      if (!getPeRes.ok) {
        const errText = await getPeRes.text();
        console.error("[pay/verify] get_payment_entry failed:", getPeRes.status, errText);
        throw new Error(`get_payment_entry failed: ${getPeRes.status} - ${errText.substring(0, 500)}`);
      }

      const mappedPE = (await getPeRes.json()).message;
      mappedPE.mode_of_payment = modeOfPayment;
      mappedPE.reference_no = payment_id;
      mappedPE.reference_date = new Date().toISOString().split("T")[0];
      mappedPE.remarks = `Online payment via ${modeOfPayment} (WhatsApp link). Order: ${payment_order_id}, Payment: ${payment_id}. Student: ${student_name || ""}. SO: ${payload.so}`;

      if (company) {
        const resolved = await resolveAccountPaidTo(modeOfPayment, company, FRAPPE_URL!, adminAuth);
        if (resolved) {
          mappedPE.paid_to = resolved.account;
          mappedPE.paid_to_account_type = resolved.accountType;
        } else {
          throw new Error(`No account mapping found for ${modeOfPayment} and company ${company}`);
        }
      }

      if (mappedPE.references && Array.isArray(mappedPE.references)) {
        for (const ref of mappedPE.references as Array<{ reference_name: string; allocated_amount: number }>) {
          if (ref.reference_name === invoice_id) {
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
        console.error("[pay/verify] PE insert failed:", insertRes.status, errText);
        throw new Error(`PE insert failed: ${insertRes.status} - ${errText.substring(0, 500)}`);
      }

      const insertData = await insertRes.json();
      paymentEntryName = insertData.data?.name;
      if (!paymentEntryName) {
        throw new Error("Payment Entry insert succeeded but no name was returned");
      }
      console.log("[pay/verify] Payment Entry created:", paymentEntryName);

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
      console.log("[pay/verify] Payment Entry submitted:", paymentEntryName);

      const paymentEntryAfterSubmit = await fetchPaymentEntry(headers, paymentEntryName);
      if (!paymentEntryAfterSubmit || paymentEntryAfterSubmit.docstatus !== 1) {
        throw new Error("Payment Entry was not submitted successfully");
      }

      const invoiceAfterSubmit = await fetchInvoiceState(headers, invoice_id);
      if (!invoiceAfterSubmit) {
        throw new Error("Payment Entry submitted, but invoice could not be re-verified");
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified and recorded successfully",
        payment_id,
        order_id: payment_order_id,
        invoice_id,
        payment_entry: paymentEntryName,
        invoice_outstanding_amount: invoiceAfterSubmit.outstanding_amount,
      });
    } catch (peError) {
      console.error("[pay/verify] Payment Entry flow failed:", peError);

      try {
        const comment =
          `Online Payment (WhatsApp Link via ${modeOfPayment})\n` +
          `Amount: Rs.${amount?.toLocaleString("en-IN")}\n` +
          `${modeOfPayment} Payment: ${payment_id}\n` +
          `Order: ${payment_order_id}\n` +
          `Student: ${student_name || "N/A"}\n` +
          `SO: ${payload.so}\n\n` +
          `Auto Payment Entry failed. Please reconcile manually.`;
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
        // Non-blocking.
      }

      return NextResponse.json(
        {
          error: "Payment was received but ERP recording failed. No Payment Entry was confirmed.",
          code: "PAYMENT_NOT_RECORDED",
          payment_id,
          order_id: payment_order_id,
          invoice_id,
          payment_entry: paymentEntryName,
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    console.error("[pay/verify] Unexpected error:", error);
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
