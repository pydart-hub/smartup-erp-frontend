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
    const {
      invoice_id,
      payment_entry_id,
      send_email = true,
      send_whatsapp = true,
      email: overrideEmail,
      phone: overridePhone,
    } = body as {
      invoice_id?: string;
      payment_entry_id?: string;
      send_email?: boolean;
      send_whatsapp?: boolean;
      email?: string;
      phone?: string;
    };

    if (!invoice_id && !payment_entry_id) {
      return NextResponse.json(
        { error: "Either invoice_id or payment_entry_id is required" },
        { status: 400 },
      );
    }

    if (!send_email && !send_whatsapp) {
      return NextResponse.json(
        { error: "At least one channel (Email or WhatsApp) must be selected" },
        { status: 400 },
      );
    }

    const result = await dispatchPaymentReceipt({
      invoiceId: invoice_id,
      paymentEntryId: payment_entry_id,
      sendEmail: send_email,
      sendWhatsapp: send_whatsapp,
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

