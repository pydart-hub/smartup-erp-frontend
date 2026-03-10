/**
 * Shared email utility — sends emails directly via SMTP using nodemailer.
 * Bypasses Frappe's email queue entirely for reliable, immediate delivery.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";

// Reusable transporter (connection pooling across requests)
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP_USER and SMTP_PASS env vars are required for email sending");
    }
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Send an email immediately via SMTP.
 * Returns the messageId on success, throws on failure.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });

  console.log(`[email] Sent to ${opts.to} — messageId: ${info.messageId}`);
  return { messageId: info.messageId };
}

/**
 * Fetch a Sales Invoice PDF from Frappe's print API.
 * Returns the PDF buffer, or null if fetch fails.
 */
export async function fetchInvoicePDF(invoiceId: string): Promise<Buffer | null> {
  const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
  const API_KEY = process.env.FRAPPE_API_KEY;
  const API_SECRET = process.env.FRAPPE_API_SECRET;

  if (!FRAPPE_URL || !API_KEY || !API_SECRET) return null;

  try {
    const url = `${FRAPPE_URL}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(invoiceId)}&format=SmartUp+Invoice&no_letterhead=1`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[email] PDF fetch failed for ${invoiceId}: ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn("[email] PDF fetch error:", err);
    return null;
  }
}
