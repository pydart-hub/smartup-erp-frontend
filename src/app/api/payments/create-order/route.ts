import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/payments/create-order
 *
 * Creates a Razorpay order for paying a pending invoice / fee.
 *
 * Body:
 *   amount          — amount in INR (e.g. 5000)
 *   invoice_id      — Sales Invoice / Fees name (for receipt reference)
 *   student_name    — student name (for description)
 *   customer        — customer name (for notes)
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
    const { amount, invoice_id, student_name, customer } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }
    if (!invoice_id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Razorpay expects amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: invoice_id,
      notes: {
        invoice_id,
        student_name: student_name || "",
        customer: customer || "",
        parent_email: email,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    console.error("[payments/create-order] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
