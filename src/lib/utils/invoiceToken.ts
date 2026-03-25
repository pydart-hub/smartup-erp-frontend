/**
 * Token-based direct access for parents via WhatsApp links.
 *
 * Generates HMAC-SHA256 signed tokens that encode a Sales Order reference,
 * allowing parents to view invoices and pay without logging in.
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC signature)
 * Payload: { so: "SAL-ORD-2026-00042", exp: 1756684800 }
 */

import crypto from "crypto";

const TOKEN_SECRET = process.env.INVOICE_TOKEN_SECRET || "";
const DEFAULT_EXPIRY_DAYS = 90;

export interface TokenPayload {
  /** Sales Order name (e.g. "SAL-ORD-2026-00042") */
  so: string;
  /** Expiry timestamp (Unix seconds) */
  exp: number;
}

function base64urlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  return buf.toString("base64url");
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

/**
 * Generate a signed token for a Sales Order.
 */
export function generateToken(salesOrderName: string, expiryDays = DEFAULT_EXPIRY_DAYS): string {
  if (!TOKEN_SECRET) {
    throw new Error("INVOICE_TOKEN_SECRET is not configured");
  }

  const payload: TokenPayload = {
    so: salesOrderName,
    exp: Math.floor(Date.now() / 1000) + expiryDays * 86400,
  };

  const payloadStr = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadStr)
    .digest();

  return `${payloadStr}.${base64urlEncode(signature)}`;
}

/**
 * Verify and decode a token. Returns the payload or null if invalid/expired.
 */
export function verifyToken(token: string): TokenPayload | null {
  if (!TOKEN_SECRET || !token) return null;

  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;

  const payloadStr = token.slice(0, dotIdx);
  const signatureStr = token.slice(dotIdx + 1);

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadStr)
    .digest();

  const actualSig = Buffer.from(signatureStr, "base64url");

  if (!crypto.timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  // Decode payload
  try {
    const payload: TokenPayload = JSON.parse(base64urlDecode(payloadStr));

    // Check expiry
    if (!payload.so || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
