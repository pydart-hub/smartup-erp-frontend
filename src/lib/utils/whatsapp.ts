/**
 * WhatsApp utility — sends messages via Meta Cloud API (direct).
 * Bypasses any third-party aggregator for reliable, immediate delivery.
 *
 * Required env vars:
 *   WHATSAPP_PHONE_NUMBER_ID  — Business phone number ID from Meta dashboard
 *   WHATSAPP_ACCESS_TOKEN     — Permanent system-user token (never a temp token)
 *   WHATSAPP_BUSINESS_ID      — WhatsApp Business Account ID (for template mgmt)
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WABA_ID = process.env.WHATSAPP_BUSINESS_ID || "";
const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameter inside a component (body / header) */
export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "document" | "image";
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  document?: { link: string; filename?: string };
}

/** A single component passed when sending a template message */
export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "url" | "quick_reply";
  index?: number; // button index (0-based)
  parameters: TemplateParameter[];
}

/** Options for sendTemplate() */
export interface SendTemplateOptions {
  /** Recipient phone in E.164 format, e.g. "919876543210" */
  to: string;
  /** Approved template name */
  templateName: string;
  /** BCP-47 language code, defaults to "en" */
  languageCode?: string;
  /** Runtime parameter components (header, body, buttons) */
  components?: TemplateComponent[];
}

/** Successful send response from Meta */
export interface WhatsAppSendResult {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/** Options for sendDocument() — send a document without template */
export interface SendDocumentOptions {
  to: string;
  documentUrl: string;
  filename: string;
  caption?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertConfigured(): void {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN env vars are required",
    );
  }
}

/** Normalise an Indian mobile to E.164 (91XXXXXXXXXX). */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits; // already international or non-IN
}

// ---------------------------------------------------------------------------
// Core: Send Template Message
// ---------------------------------------------------------------------------

/**
 * Send an approved WhatsApp template message via Meta Cloud API.
 *
 * @example
 *   await sendTemplate({
 *     to: "919876543210",
 *     templateName: "payment_receipt",
 *     components: [
 *       { type: "body", parameters: [
 *         { type: "text", text: "Ravi Kumar" },
 *         { type: "text", text: "₹25,000" },
 *         { type: "text", text: "INV-2026-001" },
 *       ]},
 *     ],
 *   });
 */
export async function sendTemplate(
  opts: SendTemplateOptions,
): Promise<WhatsAppSendResult> {
  assertConfigured();

  const payload = {
    messaging_product: "whatsapp",
    to: normalisePhone(opts.to),
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode || "en" },
      ...(opts.components?.length ? { components: opts.components } : {}),
    },
  };

  const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[whatsapp] Send failed:", JSON.stringify(err));
    const errMsg = (err as { error?: { message?: string } })?.error?.message;
    throw new Error(
      `WhatsApp send failed: ${res.status} — ${errMsg || res.statusText}`,
    );
  }

  const result = (await res.json()) as WhatsAppSendResult;
  console.log(
    `[whatsapp] Sent template "${opts.templateName}" to ${opts.to} — msgId: ${result.messages?.[0]?.id}`,
  );
  return result;
}

// ---------------------------------------------------------------------------
// Core: Send Document (non-template, for receipts/invoices)
// ---------------------------------------------------------------------------

/**
 * Send a standalone document message (e.g. invoice PDF link).
 * NOTE: Can only be sent within 24-hour customer service window.
 */
export async function sendDocument(
  opts: SendDocumentOptions,
): Promise<WhatsAppSendResult> {
  assertConfigured();

  const payload = {
    messaging_product: "whatsapp",
    to: normalisePhone(opts.to),
    type: "document",
    document: {
      link: opts.documentUrl,
      filename: opts.filename,
      ...(opts.caption ? { caption: opts.caption } : {}),
    },
  };

  const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[whatsapp] Document send failed:", JSON.stringify(err));
    const errMsg = (err as { error?: { message?: string } })?.error?.message;
    throw new Error(
      `WhatsApp document send failed: ${res.status} — ${errMsg || res.statusText}`,
    );
  }

  const result = (await res.json()) as WhatsAppSendResult;
  console.log(
    `[whatsapp] Sent document to ${opts.to} — msgId: ${result.messages?.[0]?.id}`,
  );
  return result;
}

// ---------------------------------------------------------------------------
// Utility: Check template status (optional — for admin dashboards)
// ---------------------------------------------------------------------------

export interface TemplateInfo {
  name: string;
  status: string;
  category: string;
  language: string;
  id: string;
}

/**
 * List all message templates for the WhatsApp Business Account.
 * Useful for verifying template approval status.
 */
export async function listTemplates(): Promise<TemplateInfo[]> {
  if (!WABA_ID || !ACCESS_TOKEN) {
    throw new Error("WHATSAPP_BUSINESS_ID and WHATSAPP_ACCESS_TOKEN required");
  }

  const res = await fetch(
    `${BASE_URL}/${WABA_ID}/message_templates?limit=100`,
    {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to list templates: ${res.status}`);
  }

  const json = (await res.json()) as { data: TemplateInfo[] };
  return json.data;
}
