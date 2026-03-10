/**
 * POST /api/payments/send-payment-request
 *
 * Sends a payment request email to the parent/guardian with fee details
 * and a "Pay Now" link to the parent dashboard fees page.
 *
 * Body:
 *   guardian_email  — parent's email address
 *   guardian_name   — parent's display name
 *   student_name    — student name for context
 *   total_amount    — total fee amount in INR
 *   invoices        — [{ invoice_id, amount, due_date, label }]
 *   sales_order?    — Sales Order name (optional)
 *
 * Returns: { success: true, recipient }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { sendEmail } from "@/lib/utils/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://erp.smartup.in";

interface InvoiceDetail {
  invoice_id: string;
  amount: number;
  due_date: string;
  label: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require staff role (BM / Admin / Director)
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      guardian_email,
      guardian_name,
      student_name,
      total_amount,
      invoices,
      sales_order,
    } = body as {
      guardian_email: string;
      guardian_name: string;
      student_name: string;
      total_amount: number;
      invoices: InvoiceDetail[];
      sales_order?: string;
    };

    if (!guardian_email || !student_name || !total_amount) {
      return NextResponse.json(
        { error: "guardian_email, student_name, and total_amount are required" },
        { status: 400 },
      );
    }

    // Build invoice table rows
    const invoiceRows = (invoices || [])
      .map((inv, idx) => {
        const dueFormatted = new Date(inv.due_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #666; font-size: 14px;">${idx + 1}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${inv.label}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-weight: 600; font-size: 14px;">₹${inv.amount.toLocaleString("en-IN")}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #666; font-size: 14px;">${dueFormatted}</td>
          </tr>`;
      })
      .join("");

    const payNowUrl = `${APP_URL}/dashboard/parent/fees`;

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">
            💳 Fee Payment Request
          </h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
            Smart Up Learning Ventures
          </p>
        </div>

        <div style="padding: 28px 24px; background: #ffffff; border: 1px solid #e8e8e8; border-top: none;">
          <p style="font-size: 15px; margin: 0 0 16px;">
            Dear <strong>${guardian_name || "Parent"}</strong>,
          </p>

          <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
            Your child <strong>${student_name}</strong> has been successfully enrolled.
            Please find the fee details below and complete the payment at your earliest convenience.
          </p>

          <!-- Fee Summary Card -->
          <div style="background: #f8f7ff; border: 1px solid #e8e6f7; border-radius: 10px; padding: 20px; margin: 0 0 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="margin: 0; font-size: 13px; color: #666;">Total Fee</p>
                <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #4f46e5;">
                  ₹${total_amount.toLocaleString("en-IN")}
                </p>
              </div>
              ${sales_order ? `<p style="margin: 0; font-size: 12px; color: #888;">Ref: ${sales_order}</p>` : ""}
            </div>
          </div>

          <!-- Instalment Table -->
          ${invoices && invoices.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600;">#</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600;">Instalment</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600;">Amount</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
          </table>
          ` : ""}

          <!-- Pay Now Button -->
          <div style="text-align: center; margin: 28px 0;">
            <a href="${payNowUrl}"
               style="display: inline-block; background: #4f46e5; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
              Pay Now →
            </a>
          </div>

          <p style="font-size: 13px; color: #888; text-align: center; margin: 0 0 8px;">
            Click the button above to log in and pay securely via Razorpay
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="font-size: 13px; color: #888; margin: 0;">
            If you have already paid, please disregard this email. For queries, contact your branch office.
          </p>
        </div>

        <div style="background: #f9f9f9; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e8e8e8; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Smart Up Learning Ventures • Sent on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    `.trim();

    // Send directly via SMTP (nodemailer)
    await sendEmail({
      to: guardian_email,
      subject: `Fee Payment Request — ${student_name}`,
      html: emailBody,
    });

    console.log(`[send-payment-request] Payment request sent to ${guardian_email} for ${student_name}`);

    return NextResponse.json({ success: true, recipient: guardian_email });
  } catch (error: unknown) {
    console.error("[send-payment-request] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to send payment request" },
      { status: 500 },
    );
  }
}
