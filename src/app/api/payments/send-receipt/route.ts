import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { dispatchPaymentReceipt } from "@/lib/services/receiptService";

/**
 * POST /api/payments/send-receipt
 *
 * Sends a rich payment receipt email (with PDF attachment) and WhatsApp message
 * to the parent/guardian.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { invoice_id, email: overrideEmail, phone: overridePhone } = body as {
      invoice_id: string;
      email?: string;
      phone?: string;
    };

    if (!invoice_id) {
      return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
    }

    const result = await dispatchPaymentReceipt({
      invoiceId: invoice_id,
      overrideEmail,
      overridePhone,
    });

    if (!result.success && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: result.success,
      emailSent: result.emailSent,
      whatsappSent: result.whatsappSent,
      recipient: result.recipientEmail,
      recipientPhone: result.recipientPhone,
      ...(result.emailError && { emailError: result.emailError }),
      ...(result.whatsappError && { whatsappError: result.whatsappError }),
    });
  } catch (error: unknown) {
    console.error("[send-receipt] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to send receipt" },
      { status: 500 },
    );
  }
}

