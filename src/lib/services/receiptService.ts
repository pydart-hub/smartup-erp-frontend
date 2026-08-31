import { sendEmail, fetchInvoicePDF } from "@/lib/utils/email";
import { sendTemplate, normalisePhone } from "@/lib/utils/whatsapp";
import { generatePdfUrl } from "@/app/api/payments/invoice-pdf/[id]/route";
import { buildPaymentDoneWithPdf, buildPaymentReceipt } from "@/lib/utils/whatsappTemplates";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

export interface InvoiceItem {
  item_name?: string;
  description?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  sales_order?: string;
}

export interface InvoiceDoc {
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
  academic_year?: string;
  academic_term?: string;
}

export interface PaymentEntryRef {
  name: string;
  paid_amount?: number;
  reference_no?: string;
  reference_date?: string;
  mode_of_payment?: string;
  posting_date?: string;
}

export interface ReceiptContext {
  invoice: InvoiceDoc;
  guardianEmail: string;
  guardianName: string;
  guardianPhone?: string;
  studentName: string;
  paymentEntry: PaymentEntryRef | null;
  totalCourseFee: number;
  totalPaidSoFar: number;
  totalOutstanding: number;
  instalmentIndex: number;
  totalInstalments: number;
}

export interface DispatchReceiptOptions {
  invoiceId: string;
  overrideEmail?: string;
  overridePhone?: string;
  paymentEntryName?: string;
  amountPaid?: number;
  modeOfPayment?: string;
}

export interface DispatchReceiptResult {
  success: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  recipientEmail?: string;
  recipientPhone?: string;
  emailError?: string;
  whatsappError?: string;
  error?: string;
}

async function safeFetchDoc(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: adminHeaders, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).data ?? null;
  } catch (err) {
    console.warn("[receiptService] fetch error:", err);
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

/**
 * Robust Guardian & Student contact resolution with multi-tier fallbacks:
 * 1. Student.guardians -> Guardian DocType (email_address, mobile_number, guardian_name)
 * 2. Student DocType directly (student_email_id, student_mobile_number, custom_parent_name, custom_parent_phone)
 */
async function resolveContactFromStudent(
  studentId: string,
): Promise<{ email?: string; name?: string; phone?: string }> {
  const student = await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
  );
  if (!student) return {};

  let email: string | undefined;
  let name: string | undefined;
  let phone: string | undefined;

  // 1. Check linked Guardian doctype
  const guardians = student.guardians as { guardian?: string; guardian_name?: string }[] | undefined;
  const guardianLink = guardians?.[0]?.guardian;
  if (guardianLink) {
    const guardian = await safeFetchDoc(
      `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianLink)}`,
    );
    if (guardian) {
      email = (guardian.email_address as string) || undefined;
      name = (guardian.guardian_name as string) || guardianLink;
      phone = (guardian.mobile_number as string) || undefined;
    }
  }

  // 2. Fallbacks from Student doc fields
  if (!email && student.student_email_id) {
    email = student.student_email_id as string;
  }
  if (!phone) {
    phone = (student.custom_parent_phone as string) ||
      (student.student_mobile_number as string) ||
      undefined;
  }
  if (!name || name === "Parent") {
    name = (student.custom_parent_name as string) ||
      (student.student_name as string) ||
      "Parent";
  }

  return { email, name, phone };
}

export async function resolveReceiptContext(
  invoiceId: string,
  overrideEmail?: string,
  overridePhone?: string,
  explicitPaymentEntryName?: string,
): Promise<ReceiptContext | null> {
  // 1. Fetch invoice
  const inv = (await safeFetchDoc(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`,
  )) as InvoiceDoc | null;
  if (!inv) {
    console.error(`[receiptService] Could not fetch invoice ${invoiceId}`);
    return null;
  }
  inv.name = invoiceId;

  let guardianEmail = overrideEmail || "";
  let guardianName = "Parent";
  let guardianPhone = overridePhone || undefined;
  let studentName = (inv.student_name as string) || (inv.customer_name as string) || "";

  // Resolve contact details if any are missing
  if (!guardianEmail || !guardianPhone || guardianName === "Parent") {
    let resolvedEmail = "";
    let resolvedName = "";
    let resolvedPhone: string | undefined;

    // Path A: Invoice.student -> Student / Guardian
    if (inv.student) {
      const g = await resolveContactFromStudent(inv.student);
      if (g.email) resolvedEmail = g.email;
      if (g.name) resolvedName = g.name;
      if (g.phone) resolvedPhone = g.phone;
    }

    // Path B: Invoice -> SO -> Student / Guardian
    if (!resolvedEmail || !resolvedPhone) {
      const soName = inv.items?.[0]?.sales_order;
      if (soName) {
        const so = await safeFetchDoc(
          `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(soName)}`,
        );
        if (so?.student) {
          const g = await resolveContactFromStudent(so.student as string);
          if (!resolvedEmail && g.email) resolvedEmail = g.email;
          if (!resolvedName && g.name) resolvedName = g.name;
          if (!resolvedPhone && g.phone) resolvedPhone = g.phone;
          if (!studentName) studentName = (so.student_name as string) || "";
        }
      }
    }

    // Path C: Invoice -> Customer -> find Student -> Guardian
    if ((!resolvedEmail || !resolvedPhone) && inv.customer) {
      const params = new URLSearchParams({
        filters: JSON.stringify([["customer", "=", inv.customer]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "1",
      });
      const students = await safeFetchList(
        `${FRAPPE_URL}/api/resource/Student?${params}`,
      );
      if (students[0]?.name) {
        const g = await resolveContactFromStudent(students[0].name as string);
        if (!resolvedEmail && g.email) resolvedEmail = g.email;
        if (!resolvedName && g.name) resolvedName = g.name;
        if (!resolvedPhone && g.phone) resolvedPhone = g.phone;
      }
    }

    if (!guardianEmail) guardianEmail = resolvedEmail;
    if (guardianName === "Parent" && resolvedName) guardianName = resolvedName;
    if (!guardianPhone) guardianPhone = resolvedPhone;
  }

  // 3. Fetch latest Payment Entry for this invoice
  let paymentEntry: PaymentEntryRef | null = null;
  if (explicitPaymentEntryName) {
    const peDoc = await safeFetchDoc(
      `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(explicitPaymentEntryName)}`,
    );
    if (peDoc) {
      paymentEntry = peDoc as unknown as PaymentEntryRef;
    }
  }

  if (!paymentEntry) {
    try {
      const peParams = new URLSearchParams({
        filters: JSON.stringify([
          ["Payment Entry Reference", "reference_name", "=", invoiceId],
        ]),
        fields: JSON.stringify([
          "name",
          "paid_amount",
          "reference_no",
          "reference_date",
          "mode_of_payment",
          "posting_date",
        ]),
        order_by: "`tabPayment Entry`.creation desc",
        limit_page_length: "1",
      });
      const entries = await safeFetchList(
        `${FRAPPE_URL}/api/resource/Payment Entry?${peParams}`,
      );
      if (entries[0]) paymentEntry = entries[0] as unknown as PaymentEntryRef;
    } catch {
      console.warn("[receiptService] Could not fetch Payment Entry");
    }
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
          "name",
          "grand_total",
          "outstanding_amount",
          "posting_date",
        ]),
        order_by: "posting_date asc, name asc",
        limit_page_length: "100",
      });
      const allInvoices = await safeFetchList(
        `${FRAPPE_URL}/api/resource/Sales Invoice?${siParams}`,
      );
      if (allInvoices.length > 0) {
        totalCourseFee = allInvoices.reduce(
          (sum, si) => sum + ((si.grand_total as number) || 0),
          0,
        );
        totalOutstanding = allInvoices.reduce(
          (sum, si) => sum + ((si.outstanding_amount as number) || 0),
          0,
        );
        totalPaidSoFar = totalCourseFee - totalOutstanding;
        totalInstalments = allInvoices.length;
        const idx = allInvoices.findIndex((si) => si.name === invoiceId);
        instalmentIndex = idx >= 0 ? idx + 1 : 1;
      }
    } catch {
      console.warn("[receiptService] Could not fetch sibling invoices");
    }
  }

  return {
    invoice: inv,
    guardianEmail,
    guardianName,
    guardianPhone,
    studentName,
    paymentEntry,
    totalCourseFee,
    totalPaidSoFar,
    totalOutstanding,
    instalmentIndex,
    totalInstalments,
  };
}

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildReceiptHtml(ctx: ReceiptContext): string {
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

/**
 * Dispatches both Email and WhatsApp payment receipts in parallel.
 * Safe & non-blocking: guarantees execution does not throw unhandled exceptions.
 */
export async function dispatchPaymentReceipt(
  opts: DispatchReceiptOptions,
): Promise<DispatchReceiptResult> {
  const { invoiceId, overrideEmail, overridePhone, paymentEntryName, amountPaid: explicitAmount, modeOfPayment } = opts;

  console.log(`[receiptService] Dispatching payment receipt for invoice ${invoiceId}`);

  const ctx = await resolveReceiptContext(invoiceId, overrideEmail, overridePhone, paymentEntryName);
  if (!ctx) {
    console.error(`[receiptService] Unable to resolve context for invoice ${invoiceId}`);
    return {
      success: false,
      emailSent: false,
      whatsappSent: false,
      error: `Could not resolve context or guardian details for invoice ${invoiceId}`,
    };
  }

  // If explicit payment mode or amount were passed, augment context
  if (explicitAmount && ctx.paymentEntry) {
    ctx.paymentEntry.paid_amount = explicitAmount;
  }
  if (modeOfPayment && ctx.paymentEntry) {
    ctx.paymentEntry.mode_of_payment = modeOfPayment;
  }

  let emailSent = false;
  let whatsappSent = false;
  let emailError: string | undefined;
  let whatsappError: string | undefined;

  // 1. Send Email (if guardian email is available)
  const emailPromise = (async () => {
    if (!ctx.guardianEmail) {
      emailError = "No guardian email available";
      return;
    }

    try {
      const pdfBuffer = await fetchInvoicePDF(invoiceId);
      const attachments = pdfBuffer
        ? [{ filename: `${invoiceId}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
        : undefined;

      const instLabel =
        ctx.totalInstalments > 1
          ? `Inst ${ctx.instalmentIndex}/${ctx.totalInstalments}`
          : "";
      const subject = instLabel
        ? `Payment Receipt — ${instLabel} — ${ctx.studentName} | ${invoiceId}`
        : `Payment Receipt — ${ctx.studentName} | ${invoiceId}`;

      await sendEmail({
        to: ctx.guardianEmail,
        subject,
        html: buildReceiptHtml(ctx),
        attachments,
      });
      emailSent = true;
      console.log(`[receiptService] Email successfully sent to ${ctx.guardianEmail}`);
    } catch (err: unknown) {
      emailError = err instanceof Error ? err.message : String(err);
      console.warn(`[receiptService] Email dispatch failed for ${ctx.guardianEmail}:`, emailError);
    }
  })();

  // 2. Send WhatsApp (if guardian phone is available)
  const whatsappPromise = (async () => {
    if (!ctx.guardianPhone) {
      whatsappError = "No guardian phone available";
      return;
    }

    try {
      const paidAmt =
        explicitAmount ??
        ctx.paymentEntry?.paid_amount ??
        ((ctx.invoice.grand_total || 0) - (ctx.invoice.outstanding_amount || 0));

      const txRef =
        ctx.paymentEntry?.reference_no || ctx.paymentEntry?.name || ctx.invoice.name;
      const txDate =
        ctx.paymentEntry?.posting_date ||
        ctx.invoice.posting_date ||
        new Date().toISOString().slice(0, 10);

      const pdfLink = generatePdfUrl(invoiceId);

      // Attempt smartup_payment_done_v2 (PDF header + 5 body params)
      try {
        const templateOpts = buildPaymentDoneWithPdf(ctx.guardianPhone, {
          guardianName: ctx.guardianName,
          amountPaid: paidAmt,
          invoiceId,
          referenceNo: txRef,
          paymentDate: txDate,
          pdfUrl: pdfLink,
        });
        await sendTemplate(templateOpts);
        whatsappSent = true;
        console.log(`[receiptService] WhatsApp (smartup_payment_done_v2) sent to ${ctx.guardianPhone}`);
      } catch (waErr: unknown) {
        console.warn(`[receiptService] Template smartup_payment_done_v2 failed, trying payment_receipt fallback...`, waErr);
        // Fallback to text template payment_receipt
        const fallbackOpts = buildPaymentReceipt(ctx.guardianPhone, {
          guardianName: ctx.guardianName,
          studentName: ctx.studentName,
          invoiceId,
          amountPaid: paidAmt,
          paymentDate: txDate,
          paymentMode: ctx.paymentEntry?.mode_of_payment || modeOfPayment || "Online",
          referenceId: txRef,
          instalmentSummary: ctx.totalInstalments > 1
            ? `Instalment ${ctx.instalmentIndex}/${ctx.totalInstalments} — Balance: ₹${(ctx.invoice.outstanding_amount || 0).toLocaleString("en-IN")}`
            : "Fully Paid",
        });
        await sendTemplate(fallbackOpts);
        whatsappSent = true;
        console.log(`[receiptService] WhatsApp (payment_receipt) fallback sent to ${ctx.guardianPhone}`);
      }
    } catch (err: unknown) {
      whatsappError = err instanceof Error ? err.message : String(err);
      console.warn(`[receiptService] WhatsApp dispatch failed for ${ctx.guardianPhone}:`, whatsappError);
    }
  })();

  await Promise.allSettled([emailPromise, whatsappPromise]);

  return {
    success: emailSent || whatsappSent,
    emailSent,
    whatsappSent,
    recipientEmail: ctx.guardianEmail || undefined,
    recipientPhone: ctx.guardianPhone ? normalisePhone(ctx.guardianPhone) : undefined,
    ...(emailError && { emailError }),
    ...(whatsappError && { whatsappError }),
  };
}
