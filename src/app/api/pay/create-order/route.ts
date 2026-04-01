import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/invoiceToken";
import { createRazorpayInstance, getRazorpayKeys, getSalesOrderCompany } from "@/lib/utils/razorpay";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/pay/create-order
 *
 * Token-authenticated Razorpay order creation.
 * Mirrors /api/payments/create-order but uses the magic-link token
 * instead of a session cookie.
 *
 * Body: { token, amount, invoice_id, student_name, customer }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, amount, invoice_id, student_name, customer } = body;

    // ── Token auth ──
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!invoice_id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // ── Verify invoice belongs to this Sales Order ──
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const invRes = await fetch(
      `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoice_id)}?fields=["student","name"]`,
      { headers: { Authorization: adminAuth } },
    );
    if (!invRes.ok) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // ── Check if student is discontinued ──
    const invData = (await invRes.json()).data;
    const studentId = invData?.student;
    if (studentId) {
      const stuRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}?fields=["enabled","custom_discontinuation_date"]`,
        { headers: { Authorization: adminAuth } },
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

    // ── Resolve branch Razorpay keys from Sales Order company ──
    const company = await getSalesOrderCompany(payload.so, FRAPPE_URL!, adminAuth);
    const razorpay = createRazorpayInstance(company || "");
    const { keyId } = getRazorpayKeys(company || "");

    // Razorpay expects paise
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: invoice_id,
      notes: {
        invoice_id,
        student_name: student_name || "",
        customer: customer || "",
        source: "whatsapp_magic_link",
        sales_order: payload.so,
        company: company || "",
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error: unknown) {
    console.error("[pay/create-order] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
