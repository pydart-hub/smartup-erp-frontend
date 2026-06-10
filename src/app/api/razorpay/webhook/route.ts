import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getInvoiceCompany, getSalesOrderCompany } from "@/lib/utils/razorpay";
import { reconcileRazorpayPayment } from "@/lib/payments/reconcileRazorpayPayment";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getWebhookSecrets(): string[] {
  const secrets = new Set<string>();

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("RAZORPAY_WEBHOOK_SECRET_") && value) {
      secrets.add(value);
    }
  }

  return Array.from(secrets).filter(Boolean);
}

function getBranchCompanyFromEvent(event: any): string | null {
  const notes = event?.payload?.payment?.entity?.notes || {};
  return notes.company || null;
}

function getInvoiceIdFromEvent(event: any): string | null {
  const notes = event?.payload?.payment?.entity?.notes || {};
  return notes.invoice_id || notes.invoiceId || null;
}

function getSalesOrderFromEvent(event: any): string | null {
  const notes = event?.payload?.payment?.entity?.notes || {};
  return notes.sales_order || notes.salesOrder || null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !rawBody) {
      return NextResponse.json({ error: "Missing Razorpay signature or body" }, { status: 400 });
    }

    const candidateSecrets = getWebhookSecrets();
    const isValid = candidateSecrets.some((secret) => {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event;
    const payment = event?.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ ok: true, message: "No payment payload found" });
    }

    if (eventType === "payment.failed") {
      console.warn("[razorpay/webhook] Payment failed:", payment.id, payment.error_description || "");
      return NextResponse.json({ ok: true, message: "Payment failure recorded" });
    }

    if (eventType !== "payment.captured") {
      return NextResponse.json({ ok: true, message: "Ignored webhook event" });
    }

    const invoiceId = getInvoiceIdFromEvent(event);
    const salesOrder = getSalesOrderFromEvent(event);
    const company = getBranchCompanyFromEvent(event) ||
      (invoiceId ? await getInvoiceCompany(invoiceId, FRAPPE_URL!, `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`) : null) ||
      (salesOrder ? await getSalesOrderCompany(salesOrder, FRAPPE_URL!, `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`) : null);

    const result = await reconcileRazorpayPayment({
      invoiceId: invoiceId || undefined,
      orderId: payment.order_id || "",
      paymentId: payment.id || "",
      amount: (payment.amount || 0) / 100,
      studentName: payment.notes?.student_name || undefined,
      parentEmail: payment.notes?.parent_email || undefined,
      company: company || undefined,
      salesOrder: salesOrder || undefined,
      source: "razorpay_webhook",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error("[razorpay/webhook] Webhook processing failed:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Webhook processing failed" },
      { status: 500 },
    );
  }
}
