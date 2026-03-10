/**
 * POST /api/payments/send-receipt
 *
 * Sends a rich payment receipt email to the parent/guardian.
 * Uses nodemailer for direct SMTP delivery (bypasses Frappe email queue).
 * Attaches the Sales Invoice PDF from Frappe's print API.
 *
 * Body:
 *   invoice_id  — Sales Invoice name  (e.g. "ACC-SINV-2026-00050")
 *   email?      — optional override (skips guardian lookup)
 *
 * Returns: { success: true, recipient } or error
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { sendEmail, fetchInvoicePDF } from "@/lib/utils/email";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

/* ── Types ──────────────────────────────────────────────────── */
interface InvoiceItem {
  item_name?: string;
  description?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  sales_order?: string;
}

interface InvoiceDoc {
  name: string;
  student?: string;
  student_name?: string;
  student_email?: string;
  customer?: string;
  customer_name?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  total?: number;
  status?: string;
  items?: InvoiceItem[];
  // custom fields that may exist
  academic_year?: string;
  academic_term?: string;
}

interface PaymentEntryRef {
  name: string;
  paid_amount?: number;
  reference_no?: string;
  reference_date?: string;
  mode_of_payment?: string;
  posting_date?: string;
}

interface ReceiptContext {
  invoice: InvoiceDoc;
  guardianEmail: string;
  guardianName: string;
  studentName: string;
  paymentEntry: PaymentEntryRef | null;
  // Overall totals from the Sales Order
  totalCourseFee: number;
  totalPaidSoFar: number;
  totalOutstanding: number;
  // Instalment info
  instalmentIndex: number; // 1-based
  totalInstalments: number;
}

/* ── Helper: safe JSON fetch ────────────────────────────────── */
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

async function safeFetchList(url: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(url, { headers: adminHeaders, cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

/* ── Helper: fetch guardian info from Student ID ────────────── */
async function getGuardianFromStudent(
  studentId: string,
): Promise<{ email: string; name: string } | null> {
  const student = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
  );
  if (!student) return null;

  const guardians = student.guardians as { guardian?: string; guardian_name?: string }[] | undefined;
  const guardianLink = guardians?.[0]?.guardian;
  if (!guardianLink) return null;

  const guardian = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianLink)}`,
  );
  if (!guardian?.email_address) return null;

  return {
    email: guardian.email_address as string,
    name: (guardian.guardian_name as string) || guardianLink,
  };
}

/* ── Resolve all context needed for the receipt ─────────────── */
async function resolveReceiptContext(
  invoiceId: string,
  overrideEmail?: string,
): Promise<ReceiptContext | null> {
  // 1. Fetch invoice
  const inv = (await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`,
  )) as InvoiceDoc | null;
  if (!inv) {
    console.error(`[send-receipt] Could not fetch invoice ${invoiceId}`);
    return null;
  }
  inv.name = invoiceId;

  // 2. Resolve guardian (3-path fallback)
  let guardianEmail = overrideEmail || "";
  let guardianName = "Parent";
  let studentName = (inv.student_name as string) || (inv.customer_name as string) || "";

  if (!guardianEmail) {
    // Path A: Invoice.student → Student → Guardian
    if (inv.student) {
      const g = await getGuardianFromStudent(inv.student);
      if (g) {
        guardianEmail = g.email;
        guardianName = g.name;
      }
    }

    // Path B: Invoice → SO → Student → Guardian
    if (!guardianEmail) {
      const soName = inv.items?.[0]?.sales_order;
      if (soName) {
        const so = await safeFetchDoc(
          `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(soName)}`,
        );
        if (so?.student) {
          const g = await getGuardianFromStudent(so.student as string);
          if (g) {
            guardianEmail = g.email;
            guardianName = g.name;
          }
          if (!studentName) studentName = (so.student_name as string) || "";
        }
      }
    }

    // Path C: Invoice → Customer → find Student → Guardian
    if (!guardianEmail && inv.customer) {
      const params = new URLSearchParams({
        filters: JSON.stringify([["customer", "=", inv.customer]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "1",
      });
      const students = await safeFetchList(
        `${FRAPPE_URL}/api/resource/Student?${params}`,
      );
      if (students[0]?.name) {
        const g = await getGuardianFromStudent(students[0].name as string);
        if (g) {
          guardianEmail = g.email;
          guardianName = g.name;
        }
      }
    }
  }

  if (!guardianEmail) return null;

  // 3. Fetch latest Payment Entry for this invoice
  let paymentEntry: PaymentEntryRef | null = null;
  try {
    const peParams = new URLSearchParams({
      filters: JSON.stringify([
        ["Payment Entry Reference", "reference_name", "=", invoiceId],
      ]),
      fields: JSON.stringify([
        "name", "paid_amount", "reference_no", "reference_date",
        "mode_of_payment", "posting_date",
      ]),
      order_by: "creation desc",
      limit_page_length: "1",
    });
    const entries = await safeFetchList(
      `${FRAPPE_URL}/api/resource/Payment Entry?${peParams}`,
    );
    if (entries[0]) paymentEntry = entries[0] as unknown as PaymentEntryRef;
  } catch {
    console.warn("[send-receipt] Could not fetch Payment Entry");
  }

  // 4. Fetch all invoices in the same Sales Order for totals
  let totalCourseFee = inv.grand_total || 0;
  let totalOutstanding = inv.outstanding_amount || 0;
  let totalPaidSoFar = totalCourseFee - totalOutstanding;
  let instalmentIndex = 1;
  let totalInstalments = 1;

  const soName = inv.items?.[0]?.sales_order;
  if (soName) {
    try {
      const siParams = new URLSearchParams({
        filters: JSON.stringify([
          ["Sales Invoice Item", "sales_order", "=", soName],
        ]),
        fields: JSON.stringify([
          "name", "grand_total", "outstanding_amount", "posting_date",
        ]),
        order_by: "posting_date asc, name asc",
        limit_page_length: "100",
      });
      const allInvoices = await safeFetchList(
        `${FRAPPE_URL}/api/resource/Sales Invoice?${siParams}`,
      );
      if (allInvoices.length > 0) {
        totalCourseFee = allInvoices.reduce(
          (sum, si) => sum + ((si.grand_total as number) || 0), 0,
        );
        totalOutstanding = allInvoices.reduce(
          (sum, si) => sum + ((si.outstanding_amount as number) || 0), 0,
        );
        totalPaidSoFar = totalCourseFee - totalOutstanding;
        totalInstalments = allInvoices.length;
        const idx = allInvoices.findIndex((si) => si.name === invoiceId);
        instalmentIndex = idx >= 0 ? idx + 1 : 1;
      }
    } catch {
      console.warn("[send-receipt] Could not fetch sibling invoices");
    }
  }

  return {
    invoice: inv,
    guardianEmail,
    guardianName,
    studentName,
    paymentEntry,
    totalCourseFee,
    totalPaidSoFar,
    totalOutstanding,
    instalmentIndex,
    totalInstalments,
  };
}

/* ── Format currency ────────────────────────────────────────── */
function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Build rich HTML email ──────────────────────────────────── */
function buildReceiptHtml(ctx: ReceiptContext): string {
  const inv = ctx.invoice;
  const paidOnInvoice = (inv.grand_total || 0) - (inv.outstanding_amount || 0);
  const balanceOnInvoice = inv.outstanding_amount || 0;

  const paymentRef = ctx.paymentEntry?.reference_no || ctx.paymentEntry?.name || "—";
  const paymentMode = ctx.paymentEntry?.mode_of_payment || "Online";
  const paymentDate =
    ctx.paymentEntry?.posting_date || inv.posting_date || new Date().toISOString().slice(0, 10);

  const instalmentLabel =
    ctx.totalInstalments > 1
      ? `Instalment ${ctx.instalmentIndex} of ${ctx.totalInstalments}`
      : "Full Payment";

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d6aa0 100%); padding: 28px 32px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">SmartUp Learning Ventures</h1>
    <p style="margin: 4px 0 0; color: #cce0f5; font-size: 13px;">
      Kochi, Kerala &nbsp;|&nbsp; academiqedullp@gmail.com &nbsp;|&nbsp; +91 81290 35498
    </p>
  </div>

  <!-- Payment Receipt Banner -->
  <div style="background-color: #e8f5e9; padding: 16px 32px; border-bottom: 2px solid #4caf50;">
    <table style="width: 100%;">
      <tr>
        <td>
          <span style="font-size: 16px; font-weight: 700; color: #2e7d32;">✓ PAYMENT RECEIPT</span>
        </td>
        <td style="text-align: right; color: #555; font-size: 13px;">
          ${instalmentLabel}
        </td>
      </tr>
    </table>
  </div>

  <div style="padding: 24px 32px;">

    <!-- Greeting -->
    <p style="margin: 0 0 16px; color: #333; font-size: 15px;">
      Dear <strong>${ctx.guardianName}</strong>,
    </p>
    <p style="margin: 0 0 20px; color: #555; font-size: 14px;">
      We have received a payment for <strong>${ctx.studentName}</strong>. Here is the summary:
    </p>

    <!-- Invoice Details -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #777; width: 160px;">Invoice No:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #333;">${inv.name}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #777;">Invoice Date:</td>
        <td style="padding: 6px 0; color: #333;">${inv.posting_date || "—"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #777;">Due Date:</td>
        <td style="padding: 6px 0; color: #333;">${inv.due_date || "—"}</td>
      </tr>
      ${inv.academic_year ? `<tr><td style="padding: 6px 0; color: #777;">Academic Year:</td><td style="padding: 6px 0; color: #333;">${inv.academic_year}</td></tr>` : ""}
    </table>

    <!-- Instalment Breakdown -->
    <div style="background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px; font-size: 14px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">
        Instalment Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #555;">Instalment Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${fmt(inv.grand_total || 0)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555;">Amount Paid</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2e7d32;">${fmt(paidOnInvoice)}</td>
        </tr>
        <tr style="border-top: 1px dashed #ccc;">
          <td style="padding: 10px 0 4px; color: #555; font-weight: 600;">Balance Remaining</td>
          <td style="padding: 10px 0 4px; text-align: right; font-weight: 700; color: ${balanceOnInvoice > 0 ? "#e65100" : "#2e7d32"}; font-size: 16px;">
            ${balanceOnInvoice > 0 ? fmt(balanceOnInvoice) : "Fully Paid ✓"}
          </td>
        </tr>
      </table>
    </div>

    <!-- Overall Fee Summary -->
    ${ctx.totalInstalments > 1 ? `
    <div style="background-color: #f0f4ff; border: 1px solid #c5cae9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px; font-size: 14px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">
        Overall Fee Summary
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #555;">Total Course Fee</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${fmt(ctx.totalCourseFee)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555;">Total Paid So Far</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2e7d32;">${fmt(ctx.totalPaidSoFar)}</td>
        </tr>
        <tr style="border-top: 1px dashed #ccc;">
          <td style="padding: 10px 0 4px; color: #555; font-weight: 600;">Total Outstanding</td>
          <td style="padding: 10px 0 4px; text-align: right; font-weight: 700; color: ${ctx.totalOutstanding > 0 ? "#e65100" : "#2e7d32"}; font-size: 16px;">
            ${ctx.totalOutstanding > 0 ? fmt(ctx.totalOutstanding) : "All Clear ✓"}
          </td>
        </tr>
      </table>
    </div>
    ` : ""}

    <!-- Payment Details -->
    <div style="background-color: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #777;">Payment Reference:</td>
          <td style="padding: 4px 0; color: #333; font-weight: 600;">${paymentRef}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #777;">Mode of Payment:</td>
          <td style="padding: 4px 0; color: #333;">${paymentMode}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #777;">Payment Date:</td>
          <td style="padding: 4px 0; color: #333;">${paymentDate}</td>
        </tr>
      </table>
    </div>

    <!-- PDF note -->
    <p style="margin: 0 0 24px; color: #555; font-size: 13px; text-align: center; font-style: italic;">
      📎 The detailed invoice PDF is attached to this email.
    </p>

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

    <!-- Footer -->
    <p style="margin: 0 0 4px; color: #555; font-size: 13px;">Thank you for your timely payment.</p>
    <p style="margin: 0 0 16px; color: #555; font-size: 13px;">
      For queries, reply to this email or contact us at
      <a href="mailto:academiqedullp@gmail.com" style="color: #2d6aa0;">academiqedullp@gmail.com</a>
      / <strong>+91 81290 35498</strong>
    </p>

    <p style="margin: 0; color: #333; font-size: 14px;">
      Warm regards,<br/>
      <strong>SmartUp Learning Ventures</strong>
    </p>
  </div>

  <!-- Bottom bar -->
  <div style="background-color: #f5f5f5; padding: 12px 32px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; color: #999; font-size: 11px;">
      This is an automated receipt. Please do not reply to report payment issues — contact the branch office directly.
    </p>
  </div>
</div>
  `.trim();
}

/* ── POST handler ───────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
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

    // Resolve all context for the receipt
    const ctx = await resolveReceiptContext(invoice_id, overrideEmail);
    if (!ctx) {
      return NextResponse.json(
        { error: "Could not determine recipient email" },
        { status: 404 },
      );
    }

    console.log(`[send-receipt] Sending receipt for ${invoice_id} to ${ctx.guardianEmail}`);

    // Fetch PDF attachment
    const pdfBuffer = await fetchInvoicePDF(invoice_id);
    const attachments = pdfBuffer
      ? [{ filename: `${invoice_id}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
      : undefined;

    if (!pdfBuffer) {
      console.warn(`[send-receipt] Could not fetch PDF for ${invoice_id}, sending without attachment`);
    }

    // Build subject
    const instLabel =
      ctx.totalInstalments > 1
        ? `Inst ${ctx.instalmentIndex}/${ctx.totalInstalments}`
        : "";
    const subject = instLabel
      ? `Payment Receipt — ${instLabel} — ${ctx.studentName} | ${invoice_id}`
      : `Payment Receipt — ${ctx.studentName} | ${invoice_id}`;

    await sendEmail({
      to: ctx.guardianEmail,
      subject,
      html: buildReceiptHtml(ctx),
      attachments,
    });

    return NextResponse.json({ success: true, recipient: ctx.guardianEmail });
  } catch (error: unknown) {
    console.error("[send-receipt] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to send receipt" },
      { status: 500 },
    );
  }
}
