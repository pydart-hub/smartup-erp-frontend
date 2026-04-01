import { NextRequest, NextResponse } from "next/server";
import { createRazorpayInstance, getRazorpayKeys, getInvoiceCompany } from "@/lib/utils/razorpay";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

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

    // ── Check if student is discontinued ──
    try {
      const invRes = await fetch(
        `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoice_id)}?fields=["student"]`,
        { headers: { Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` } },
      );
      if (invRes.ok) {
        const invData = (await invRes.json()).data;
        const studentId = invData?.student;
        if (studentId) {
          const stuRes = await fetch(
            `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}?fields=["enabled","custom_discontinuation_date"]`,
            { headers: { Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` } },
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

    // ── Resolve branch Razorpay keys from invoice company ──
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const company = await getInvoiceCompany(invoice_id, FRAPPE_URL!, adminAuth);
    const razorpay = createRazorpayInstance(company || "");
    const { keyId } = getRazorpayKeys(company || "");

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
    console.error("[payments/create-order] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
