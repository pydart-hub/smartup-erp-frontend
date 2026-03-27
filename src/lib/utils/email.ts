/**
 * Shared email utility — sends emails directly via SMTP using nodemailer.
 * Bypasses Frappe's email queue entirely for reliable, immediate delivery.
 *
 * Supports up to 3 SMTP accounts with automatic failover:
 *   Account 1 fails → tries Account 2 → tries Account 3.
 *
 * Env vars (per account, suffix _1 / _2 / _3):
 *   SMTP_HOST_1, SMTP_PORT_1, SMTP_USER_1, SMTP_PASS_1, SMTP_FROM_1
 *   SMTP_HOST_2, SMTP_PORT_2, SMTP_USER_2, SMTP_PASS_2, SMTP_FROM_2
 *   SMTP_HOST_3, SMTP_PORT_3, SMTP_USER_3, SMTP_PASS_3, SMTP_FROM_3
 *
 * Backward-compatible: falls back to legacy SMTP_HOST/SMTP_USER/… if _1 vars are missing.
 */

import nodemailer from "nodemailer";

/* ------------------------------------------------------------------ */
/*  SMTP account types & loading                                      */
/* ------------------------------------------------------------------ */

interface SmtpAccount {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Read accounts from env once, cache in module scope. */
let _accounts: SmtpAccount[] | null = null;

function loadSmtpAccounts(): SmtpAccount[] {
  if (_accounts) return _accounts;

  const accounts: SmtpAccount[] = [];

  for (const suffix of ["_1", "_2", "_3"]) {
    const user = process.env[`SMTP_USER${suffix}`];
    const pass = process.env[`SMTP_PASS${suffix}`];
    if (!user || !pass) continue;

    accounts.push({
      host: process.env[`SMTP_HOST${suffix}`] || "smtp.gmail.com",
      port: parseInt(process.env[`SMTP_PORT${suffix}`] || "587", 10),
      user,
      pass,
      from: process.env[`SMTP_FROM${suffix}`] || user,
    });
  }

  // Backward compat: accept legacy SMTP_USER / SMTP_PASS if no _1 vars
  if (accounts.length === 0) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (user && pass) {
      accounts.push({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        user,
        pass,
        from: process.env.SMTP_FROM || user,
      });
    }
  }

  if (accounts.length === 0) {
    throw new Error("No SMTP accounts configured. Set SMTP_USER_1/SMTP_PASS_1 (or legacy SMTP_USER/SMTP_PASS).");
  }

  _accounts = accounts;
  console.log(`[email] Loaded ${accounts.length} SMTP account(s): ${accounts.map((a) => a.user).join(", ")}`);
  return _accounts;
}

/* ------------------------------------------------------------------ */
/*  Transporter cache (one per account)                               */
/* ------------------------------------------------------------------ */

const _transporters = new Map<string, nodemailer.Transporter>();

function getTransporter(account: SmtpAccount): nodemailer.Transporter {
  let t = _transporters.get(account.user);
  if (!t) {
    t = nodemailer.createTransport({
      host: account.host,
      port: account.port,
      secure: account.port === 465,
      auth: { user: account.user, pass: account.pass },
    });
    _transporters.set(account.user, t);
  }
  return t;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

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
 * Send an email with automatic failover across configured SMTP accounts.
 * Tries each account sequentially; returns on the first success.
 * Throws only when ALL accounts fail.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
  const accounts = loadSmtpAccounts();
  const errors: Array<{ user: string; error: string }> = [];

  for (const account of accounts) {
    try {
      const transporter = getTransporter(account);
      const info = await transporter.sendMail({
        from: account.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      });

      console.log(`[email] Sent to ${opts.to} via ${account.user} — messageId: ${info.messageId}`);
      return { messageId: info.messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[email] Account ${account.user} failed for ${opts.to}: ${msg}`);
      errors.push({ user: account.user, error: msg });

      // Reset cached transporter so next request gets a fresh connection
      _transporters.delete(account.user);
    }
  }

  // All accounts exhausted
  const detail = errors.map((e) => `${e.user}: ${e.error}`).join(" | ");
  throw new Error(`All ${accounts.length} SMTP account(s) failed to send to ${opts.to}. Details → ${detail}`);
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
