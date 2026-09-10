import { sendEmail, fetchInvoicePDF, fetchPaymentEntryPDF } from "@/lib/utils/email";
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
  invoice?: InvoiceDoc | null;
  paymentEntry: PaymentEntryRef | null;
  guardianEmail: string;
  guardianName: string;
  guardianPhone?: string;
  studentName: string;
  totalCourseFee: number;
  totalPaidSoFar: number;
  totalOutstanding: number;
  instalmentIndex: number;
  totalInstalments: number;
}

export interface DispatchReceiptOptions {
  invoiceId?: string;
  paymentEntryId?: string;
  sendEmail?: boolean;
  sendWhatsapp?: boolean;
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
  invoiceId?: string,
  overrideEmail?: string,
  overridePhone?: string,
  explicitPaymentEntryName?: string,
): Promise<ReceiptContext | null> {
  let inv: InvoiceDoc | null = null;
  let peDoc: Record<string, unknown> | null = null;

  if (explicitPaymentEntryName) {
    peDoc = await safeFetchDoc(
      `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(explicitPaymentEntryName)}`,
    );
  }

  if (!invoiceId && peDoc) {
    const references = (peDoc.references as Array<{ reference_doctype?: string; reference_name?: string }>) || [];
    const invRef = references.find((r) => r.reference_doctype === "Sales Invoice" && r.reference_name);
    if (invRef?.reference_name) {
      invoiceId = invRef.reference_name;
    }
  }

  if (invoiceId) {
    inv = (await safeFetchDoc(
      `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`,
    )) as InvoiceDoc | null;
    if (inv) {
      inv.name = invoiceId;
    }
  }

  if (!inv && !peDoc) {
    console.error(`[receiptService] Neither invoice ${invoiceId} nor payment entry ${explicitPaymentEntryName} could be fetched`);
    return null;
  }

  let guardianEmail = overrideEmail || "";
  let guardianName = "Parent";
  let guardianPhone = overridePhone || undefined;
  let studentName = (inv?.student_name as string) || (inv?.customer_name as string) || (peDoc?.party_name as string) || "";

  if (!guardianEmail || !guardianPhone || guardianName === "Parent") {
    let resolvedEmail = "";
    let resolvedName = "";
    let resolvedPhone: string | undefined;

    if (inv?.student) {
      const g = await resolveContactFromStudent(inv.student);
      if (g.email) resolvedEmail = g.email;
      if (g.name) resolvedName = g.name;
      if (g.phone) resolvedPhone = g.phone;
    }

    if ((!resolvedEmail || !resolvedPhone) && inv?.items?.[0]?.sales_order) {
      const soName = inv.items[0].sales_order;
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

    const customer = (inv?.customer as string) || (peDoc?.party_type === "Customer" ? (peDoc.party as string) : "");
    if ((!resolvedEmail || !resolvedPhone) && customer) {
      const params = new URLSearchParams({
        filters: JSON.stringify([["customer", "=", customer]]),
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

  let paymentEntry: PaymentEntryRef | null = peDoc ? (peDoc as unknown as PaymentEntryRef) : null;

  if (!paymentEntry && invoiceId) {
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

  let totalCourseFee = inv?.grand_total || (paymentEntry?.paid_amount || 0);
  let totalOutstanding = inv?.outstanding_amount || 0;
  let totalPaidSoFar = totalCourseFee - totalOutstanding;
  let instalmentIndex = 1;
  let totalInstalments = 1;

  const soName = inv?.items?.[0]?.sales_order;
  if (soName && invoiceId) {
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
  const paidOnInvoice = inv
    ? (inv.grand_total || 0) - (inv.outstanding_amount || 0)
    : (ctx.paymentEntry?.paid_amount || 0);
  const balanceOnInvoice = inv ? (inv.outstanding_amount || 0) : 0;

  const paymentRef = ctx.paymentEntry?.reference_no || ctx.paymentEntry?.name || "—";
  const paymentMode = ctx.paymentEntry?.mode_of_payment || "Online";
  const paymentDate =
    ctx.paymentEntry?.posting_date || inv?.posting_date || new Date().toISOString().slice(0, 10);

  const instalmentLabel =
    ctx.totalInstalments > 1
      ? `Instalment ${ctx.instalmentIndex} of ${ctx.totalInstalments}`
      : inv ? "Full Payment" : "Payment Entry";

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

    <!-- Details -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
      ${inv ? `
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
      ` : `
      <tr>
        <td style="padding: 6px 0; color: #777; width: 160px;">Payment Entry:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #333;">${ctx.paymentEntry?.name || "—"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #777;">Payment Date:</td>
        <td style="padding: 6px 0; color: #333;">${paymentDate}</td>
      </tr>
      `}
    </table>

    <!-- Amount Breakdown -->
    <div style="background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 14px; font-size: 14px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">
        Payment Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${inv ? `
        <tr>
          <td style="padding: 8px 0; color: #555;">Instalment Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${fmt(inv.grand_total || 0)}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #555;">Amount Paid</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2e7d32;">${fmt(paidOnInvoice)}</td>
        </tr>
        ${inv ? `
        <tr style="border-top: 1px dashed #ccc;">
          <td style="padding: 10px 0 4px; color: #555; font-weight: 600;">Balance Remaining</td>
          <td style="padding: 10px 0 4px; text-align: right; font-weight: 700; color: ${balanceOnInvoice > 0 ? "#e65100" : "#2e7d32"}; font-size: 16px;">
            ${balanceOnInvoice > 0 ? fmt(balanceOnInvoice) : "Fully Paid ✓"}
          </td>
        </tr>
        ` : ""}
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
      📎 The detailed receipt PDF is attached to this email.
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

export async function dispatchPaymentReceipt(
  opts: DispatchReceiptOptions,
): Promise<DispatchReceiptResult> {
  const {
    invoiceId,
    paymentEntryId,
    sendEmail: shouldSendEmail = true,
    sendWhatsapp: shouldSendWhatsapp = true,
    overrideEmail,
    overridePhone,
    paymentEntryName,
    amountPaid: explicitAmount,
    modeOfPayment,
  } = opts;

  const targetId = invoiceId || paymentEntryId || paymentEntryName || "unknown";
  console.log(`[receiptService] Dispatching payment receipt for ${invoiceId ? `invoice ${invoiceId}` : `payment entry ${paymentEntryId || paymentEntryName}`}`);

  const ctx = await resolveReceiptContext(
    invoiceId,
    overrideEmail,
    overridePhone,
    paymentEntryId || paymentEntryName,
  );

  if (!ctx) {
    console.error(`[receiptService] Unable to resolve context for target ${targetId}`);
    return {
      success: false,
      emailSent: false,
      whatsappSent: false,
      error: `Could not resolve context or guardian details for ${targetId}`,
    };
  }

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

  const emailPromise = (async () => {
    if (!shouldSendEmail) return;

    if (!ctx.guardianEmail) {
      emailError = "No guardian email available";
      return;
    }

    try {
      let pdfBuffer: Buffer | null = null;
      let filename = `${targetId}.pdf`;

      if (invoiceId) {
        pdfBuffer = await fetchInvoicePDF(invoiceId);
        filename = `${invoiceId}.pdf`;
      } else if (paymentEntryId || ctx.paymentEntry?.name) {
        const peId = paymentEntryId || ctx.paymentEntry!.name;
        pdfBuffer = await fetchPaymentEntryPDF(peId);
        filename = `${peId}.pdf`;
      }

      const attachments = pdfBuffer
        ? [{ filename, content: pdfBuffer, contentType: "application/pdf" }]
        : undefined;

      const instLabel =
        ctx.totalInstalments > 1
          ? `Inst ${ctx.instalmentIndex}/${ctx.totalInstalments}`
          : "";
      const subject = instLabel
        ? `Payment Receipt — ${instLabel} — ${ctx.studentName} | ${invoiceId || targetId}`
        : `Payment Receipt — ${ctx.studentName} | ${invoiceId || targetId}`;

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

  const whatsappPromise = (async () => {
    if (!shouldSendWhatsapp) return;

    if (!ctx.guardianPhone) {
      whatsappError = "No guardian phone available";
      return;
    }

    try {
      const paidAmt =
        explicitAmount ??
        ctx.paymentEntry?.paid_amount ??
        (ctx.invoice ? ((ctx.invoice.grand_total || 0) - (ctx.invoice.outstanding_amount || 0)) : 0);

      const txRef =
        ctx.paymentEntry?.reference_no || ctx.paymentEntry?.name || (ctx.invoice ? ctx.invoice.name : targetId);
      const txDate =
        ctx.paymentEntry?.posting_date ||
        ctx.invoice?.posting_date ||
        new Date().toISOString().slice(0, 10);

      const docIdForPdf = invoiceId || paymentEntryId || ctx.paymentEntry?.name || "";
      const docTypeForPdf = invoiceId ? "Sales Invoice" : "Payment Entry";
      const pdfLink = docIdForPdf ? generatePdfUrl(docIdForPdf, docTypeForPdf) : "";

      const primaryDocId = invoiceId || targetId;

      try {
        const templateOpts = buildPaymentDoneWithPdf(ctx.guardianPhone, {
          guardianName: ctx.guardianName,
          amountPaid: paidAmt,
          invoiceId: primaryDocId,
          referenceNo: txRef,
          paymentDate: txDate,
          pdfUrl: pdfLink,
        });
        await sendTemplate(templateOpts);
        whatsappSent = true;
        console.log(`[receiptService] WhatsApp (smartup_payment_done_v2) sent to ${ctx.guardianPhone}`);
      } catch (waErr: unknown) {
        console.warn(`[receiptService] Template smartup_payment_done_v2 failed, trying payment_receipt fallback...`, waErr);
        const fallbackOpts = buildPaymentReceipt(ctx.guardianPhone, {
          guardianName: ctx.guardianName,
          studentName: ctx.studentName,
          invoiceId: primaryDocId,
          amountPaid: paidAmt,
          paymentDate: txDate,
          paymentMode: ctx.paymentEntry?.mode_of_payment || modeOfPayment || "Online",
          referenceId: txRef,
          instalmentSummary: ctx.totalInstalments > 1
            ? `Instalment ${ctx.instalmentIndex}/${ctx.totalInstalments} — Balance: ₹${((ctx.invoice?.outstanding_amount) || 0).toLocaleString("en-IN")}`
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
