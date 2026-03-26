/**
 * GET /api/payments/invoice-pdf/[id]?token=<hmac>&exp=<timestamp>
 *
 * Public PDF proxy: serves a Sales Invoice PDF from Frappe, authenticated
 * via a short-lived HMAC-signed URL. This allows Meta's WhatsApp servers
 * to fetch the PDF for document-header template messages.
 *
 * Token = HMAC-SHA256( invoiceId + ":" + exp,  INVOICE_TOKEN_SECRET )
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const TOKEN_SECRET = process.env.INVOICE_TOKEN_SECRET || "";

/** Verify the HMAC token for a given invoice ID. */
function verifyPdfToken(
  invoiceId: string,
  token: string,
  exp: string,
): boolean {
  if (!TOKEN_SECRET || !token || !exp) return false;

  const expNum = parseInt(exp, 10);
  if (isNaN(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${invoiceId}:${exp}`)
    .digest("hex");

  // timingSafeEqual requires same-length buffers
  if (token.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf-8"),
    Buffer.from(token, "utf-8"),
  );
}

/** Generate a signed PDF URL for an invoice (1-hour expiry). */
export function generatePdfUrl(invoiceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartuplearning.net";
  const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const token = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${invoiceId}:${exp}`)
    .digest("hex");

  return `${baseUrl}/api/payments/invoice-pdf/${encodeURIComponent(invoiceId)}?token=${token}&exp=${exp}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params;
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token") || "";
  const exp = searchParams.get("exp") || "";

  // Validate HMAC token
  if (!verifyPdfToken(invoiceId, token, exp)) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 403 },
    );
  }

  // Fetch PDF from Frappe
  if (!FRAPPE_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  try {
    const url = `${FRAPPE_URL}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(invoiceId)}&format=SmartUp+Invoice&no_letterhead=1`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[invoice-pdf] Frappe PDF fetch failed: ${res.status}`);
      return NextResponse.json(
        { error: "PDF not found" },
        { status: 404 },
      );
    }

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoiceId}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[invoice-pdf] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 },
    );
  }
}
