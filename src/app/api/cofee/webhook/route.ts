import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getInvoiceCompany } from "@/lib/utils/razorpay";
import { resolveAccountPaidTo } from "@/lib/utils/accountMapping";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/cofee/webhook
 * 
 * Reconciles payments collected via CoFee in Frappe backend.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-cofee-signature") || request.headers.get("x-webhook-signature");
    const secret = process.env.COFEE_WEBHOOK_SECRET;

    if (secret && signature) {
      const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      if (expectedSignature !== signature) {
        console.error("[cofee/webhook] Signature mismatch");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }
    
    // CoFee payload
    const payload = JSON.parse(rawBody);
    console.log("[cofee/webhook] Received payload:", JSON.stringify(payload));

    const eventType = payload.event;
    const orderData = payload.data || payload;

    // We only process order paid / completed / success events
    if (eventType && eventType !== "order.paid" && eventType !== "payment.success" && payload.status !== "SUCCESS") {
      return NextResponse.json({ ok: true, message: `Ignored event: ${eventType || payload.status}` });
    }

    const orderId = orderData.order_id || orderData.id;
    const merchantOrderId = orderData.merchant_order_id;
    const amount = parseFloat(orderData.amount || "0");
    const status = orderData.order_status || orderData.status;

    if (!orderId || !merchantOrderId) {
      return NextResponse.json({ error: "Missing order context in webhook" }, { status: 400 });
    }

    // Usually, merchant_order_id is in format: <invoice_id>_<timestamp>
    const invoiceId = merchantOrderId.split("_")[0];

    if (status && status !== "success" && status !== "SUCCESS" && status !== "PAID" && status !== "paid") {
      return NextResponse.json({ ok: true, message: `Order not paid yet. Status: ${status}` });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const company = await getInvoiceCompany(invoiceId, FRAPPE_URL!, adminAuth);

    const result = await reconcileCoFeePayment({
      invoiceId,
      orderId,
      paymentId: orderId,
      amount,
      studentName: orderData.customer_details?.name || undefined,
      parentEmail: orderData.customer_details?.email || undefined,
      company: company || undefined,
      source: "cofee_webhook",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error("[cofee/webhook] Webhook processing failed:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Webhook processing failed" },
      { status: 500 },
    );
  }
}

interface ReconcileInput {
  invoiceId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  studentName?: string;
  parentEmail?: string;
  company?: string;
  source?: string;
}

async function reconcileCoFeePayment(input: ReconcileInput) {
  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
  const headers = {
    Authorization: adminAuth,
    "Content-Type": "application/json",
  };

  const isSalesInvoice = input.invoiceId.startsWith("ACC-SINV") || input.invoiceId.startsWith("SINV");
  const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

  // Check if Payment Entry already exists
  const filters = encodeURIComponent(JSON.stringify([["reference_no", "=", input.paymentId]]));
  const fields = encodeURIComponent(JSON.stringify(["name", "docstatus"]));
  const checkRes = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry?filters=${filters}&fields=${fields}&limit_page_length=1`,
    { headers }
  );
  if (checkRes.ok) {
    const data = (await checkRes.json()).data;
    if (data && data[0]?.docstatus === 1) {
      return { status: "already_recorded", payment_entry: data[0].name };
    }
  }

  // Get Payment Entry template
  const getPeRes = await fetch(
    `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        dt: referenceDoctype,
        dn: input.invoiceId,
        party_amount: input.amount,
        bank_amount: input.amount,
      }),
    }
  );

  if (!getPeRes.ok) {
    const errText = await getPeRes.text();
    throw new Error(`get_payment_entry failed: ${getPeRes.status} - ${errText.slice(0, 500)}`);
  }

  const mappedPE = (await getPeRes.json()).message;
  mappedPE.mode_of_payment = "CoFee";
  mappedPE.reference_no = input.paymentId;
  mappedPE.reference_date = new Date().toISOString().split("T")[0];
  mappedPE.remarks = `Webhook reconciliation via CoFee. Order: ${input.orderId}. Student: ${input.studentName || ""}. Source: ${input.source || "webhook"}`;

  if (input.company) {
    let resolved = await resolveAccountPaidTo("CoFee", input.company, FRAPPE_URL!, adminAuth);
    if (!resolved) {
      // fallback to Razorpay account mapping if CoFee is not defined
      resolved = await resolveAccountPaidTo("Razorpay", input.company, FRAPPE_URL!, adminAuth);
    }
    if (resolved) {
      mappedPE.paid_to = resolved.account;
      mappedPE.paid_to_account_type = resolved.accountType;
    }
  }

  if (mappedPE.references && Array.isArray(mappedPE.references)) {
    for (const ref of mappedPE.references) {
      if (ref.reference_name === input.invoiceId) {
        ref.allocated_amount = input.amount;
      }
    }
  }

  mappedPE.paid_amount = input.amount;
  mappedPE.received_amount = input.amount;

  const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
    method: "POST",
    headers,
    body: JSON.stringify(mappedPE),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`PE insert failed: ${insertRes.status} - ${errText.slice(0, 500)}`);
  }

  const insertData = await insertRes.json();
  const paymentEntryName = insertData.data?.name;
  if (!paymentEntryName) {
    throw new Error("Payment Entry insert succeeded but no name was returned");
  }

  // Submit Payment Entry
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
    throw new Error(`PE submit failed: ${submitRes.status} - ${errText.slice(0, 500)}`);
  }

  return {
    status: "recorded",
    payment_entry: paymentEntryName,
  };
}
