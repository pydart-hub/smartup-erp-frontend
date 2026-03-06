/**
 * POST /api/payments/send-receipt
 *
 * Sends a payment receipt email to the parent/guardian.
 * Uses Frappe's Communication API with print_format to auto-attach the invoice PDF.
 *
 * Body:
 *   invoice_id  — Sales Invoice name  (e.g. "ACC-SINV-2026-00050")
 *   email?      — optional override (skips guardian lookup)
 *
 * Returns: { success: true, recipient } or error
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

// ── Helper: safe JSON fetch returning null on failure ───────────
async function safeFetchDoc(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: adminHeaders, cache: "no-store" });
    if (!res.ok) {
      console.warn(`[send-receipt] Frappe ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()).data ?? null;
  } catch (err) {
    console.warn("[send-receipt] fetch error:", err);
    return null;
  }
}

// ── Helper: fetch guardian email from a Student ID ──────────────
async function getGuardianEmailFromStudent(studentId: string): Promise<string | null> {
  const student = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
  );
  if (!student) return null;

  const guardians = student.guardians as { guardian?: string }[] | undefined;
  const guardianLink = guardians?.[0]?.guardian;
  if (!guardianLink) {
    console.warn(`[send-receipt] Student ${studentId} has no guardians linked`);
    return null;
  }

  const guardian = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianLink)}`,
  );
  return (guardian?.email_address as string) || null;
}

/**
 * Resolve guardian email with multiple fallback paths:
 *   Path A: Invoice.student → Student → Guardian → email
 *   Path B: Invoice.items[0].sales_order → SO.student → Student → Guardian → email
 *   Path C: Invoice.customer → find Student by customer → Student → Guardian → email
 */
async function resolveGuardianEmail(invoiceId: string): Promise<string | null> {
  // 1. Fetch the full invoice doc (no ?fields filter — always returns child tables)
  const inv = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`,
  );
  if (!inv) {
    console.error(`[send-receipt] Could not fetch invoice ${invoiceId}`);
    return null;
  }

  // Path A: direct student field on invoice
  if (inv.student) {
    console.log(`[send-receipt] Path A: Invoice has student="${inv.student}"`);
    const email = await getGuardianEmailFromStudent(inv.student as string);
    if (email) return email;
    console.warn(`[send-receipt] Path A failed for student ${inv.student}`);
  }

  // Path B: invoice → SO → student
  const items = inv.items as { sales_order?: string }[] | undefined;
  const soName = items?.[0]?.sales_order;
  if (soName) {
    console.log(`[send-receipt] Path B: Trying via SO "${soName}"`);
    const so = await safeFetchDoc(
      `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(soName)}`,
    );
    if (so?.student) {
      const email = await getGuardianEmailFromStudent(so.student as string);
      if (email) return email;
      console.warn(`[send-receipt] Path B failed for student ${so.student}`);
    }
  }

  // Path C: invoice → customer → find Student by customer
  if (inv.customer) {
    console.log(`[send-receipt] Path C: Trying via customer "${inv.customer}"`);
    try {
      const params = new URLSearchParams({
        filters: JSON.stringify([["customer", "=", inv.customer]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "1",
      });
      const stuRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student?${params}`,
        { headers: adminHeaders, cache: "no-store" },
      );
      if (stuRes.ok) {
        const students = (await stuRes.json()).data;
        if (students?.[0]?.name) {
          const email = await getGuardianEmailFromStudent(students[0].name);
          if (email) return email;
          console.warn(`[send-receipt] Path C failed for student ${students[0].name}`);
        }
      }
    } catch (err) {
      console.warn("[send-receipt] Path C error:", err);
    }
  }

  console.error(`[send-receipt] All resolution paths exhausted for invoice ${invoiceId}`);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require any authenticated session
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { invoice_id, email: overrideEmail } = body as {
      invoice_id: string;
      email?: string;
    };

    if (!invoice_id) {
      return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
    }

    // Resolve recipient email
    const recipientEmail = overrideEmail || (await resolveGuardianEmail(invoice_id));

    if (!recipientEmail) {
      console.warn("[send-receipt] Could not resolve guardian email for", invoice_id);
      return NextResponse.json(
        { error: "Could not determine recipient email" },
        { status: 404 },
      );
    }

    // Send email via Frappe Communication API (auto-attaches invoice PDF)
    console.log(`[send-receipt] Sending receipt for ${invoice_id} to ${recipientEmail}`);
    const emailRes = await fetch(
      `${FRAPPE_URL}/api/method/frappe.core.doctype.communication.email.make`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          recipients: recipientEmail,
          subject: `Payment Receipt — ${invoice_id}`,
          content: `
            <p>Dear Parent,</p>
            <p>This is to confirm that we have received your payment for invoice <strong>${invoice_id}</strong>.</p>
            <p>Please find the payment receipt attached to this email.</p>
            <p>Thank you for your timely payment.</p>
            <br/>
            <p>Regards,<br/>Smart Up Learning Ventures</p>
          `.trim(),
          doctype: "Sales Invoice",
          name: invoice_id,
          send_email: 1,
          print_format: "Standard",
          send_me_a_copy: 0,
          sender: "Academiqedullp <academiqedullp@gmail.com>",
        }),
      },
    );

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[send-receipt] Email send failed:", emailRes.status, errText);
      return NextResponse.json(
        { error: `Email delivery failed: ${emailRes.statusText}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, recipient: recipientEmail });
  } catch (error: unknown) {
    console.error("[send-receipt] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to send receipt" },
      { status: 500 },
    );
  }
}
