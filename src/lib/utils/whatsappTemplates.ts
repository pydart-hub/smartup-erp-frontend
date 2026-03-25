/**
 * WhatsApp Template Definitions & Parameter Builders
 *
 * All templates are UTILITY category — approved for transactional use.
 * These mirror the existing email notification workflows 1:1.
 *
 * ┌──────────────────────────┬────────────────────────────────────────┐
 * │ Template Name            │ Email Equivalent                       │
 * ├──────────────────────────┼────────────────────────────────────────┤
 * │ payment_receipt          │ POST /api/payments/send-receipt        │
 * │ payment_request          │ POST /api/payments/send-payment-request│
 * │ parent_welcome           │ POST /api/auth/create-parent-user      │
 * │ fee_reminder             │ (new — no email equiv yet)             │
 * └──────────────────────────┴────────────────────────────────────────┘
 *
 * HOW TO USE:
 *   1. Submit the template JSON to Meta via their Template API or Business Manager UI.
 *   2. Wait for APPROVED status.
 *   3. Use the builder functions to construct runtime parameters.
 *   4. Call sendTemplate() from whatsapp.ts.
 *
 * META TEMPLATE SUBMISSION:
 *   POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates
 *   Authorization: Bearer {ACCESS_TOKEN}
 *   Body: { ...templateDefinitionJSON }
 */

import type { TemplateComponent, SendTemplateOptions } from "./whatsapp";

// ═══════════════════════════════════════════════════════════════════════════
// 1. TEMPLATE DEFINITIONS (submit these to Meta for approval)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Structure matching Meta's Template API submission format.
 * Use these to create templates via API or copy into Business Manager UI.
 */
export const TEMPLATE_DEFINITIONS = {
  // ─────────────────────────────────────────────────────────────────────
  // 1. PAYMENT RECEIPT
  //    Sent after Razorpay/Cash payment is recorded.
  //    Email equiv: POST /api/payments/send-receipt
  // ─────────────────────────────────────────────────────────────────────
  payment_receipt: {
    name: "payment_receipt",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Payment Received",
      },
      {
        type: "BODY",
        text: [
          "Hi {{1}},",
          "",
          "We've received your payment for *{{2}}*.",
          "",
          "📄 *Invoice:* {{3}}",
          "💰 *Amount Paid:* ₹{{4}}",
          "📅 *Date:* {{5}}",
          "💳 *Mode:* {{6}}",
          "🔖 *Ref:* {{7}}",
          "",
          "{{8}}",
          "",
          "Thank you for your timely payment!",
        ].join("\n"),
        example: {
          body_text: [
            [
              "Ravi Kumar",
              "Arjun Ravi",
              "ACC-SINV-2026-00042",
              "25,000",
              "10 Mar 2026",
              "Razorpay",
              "pay_QR1abc2def3ghi",
              "Instalment 1/3 — Balance: ₹50,000",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "SmartUp Learning Ventures",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. PAYMENT REQUEST
  //    Staff sends payment link to parent.
  //    Email equiv: POST /api/payments/send-payment-request
  // ─────────────────────────────────────────────────────────────────────
  payment_request: {
    name: "payment_request",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Fee Payment Due",
      },
      {
        type: "BODY",
        text: [
          "Hi {{1}},",
          "",
          "Your child *{{2}}* has a pending fee payment.",
          "",
          "💰 *Total Amount:* ₹{{3}}",
          "📋 *Instalments:*",
          "{{4}}",
          "",
          "Please complete the payment at your earliest convenience.",
        ].join("\n"),
        example: {
          body_text: [
            [
              "Ravi Kumar",
              "Arjun Ravi",
              "75,000",
              "1. Instalment 1 — ₹25,000 (Due: 15 Jan 2026)\n2. Instalment 2 — ₹25,000 (Due: 15 Apr 2026)\n3. Instalment 3 — ₹25,000 (Due: 15 Jul 2026)",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "SmartUp Learning Ventures",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Pay Now",
            url: "https://smartuplearning.net/dashboard/parent/fees",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. PARENT WELCOME (smartup_parent_onboard)
  // ─────────────────────────────────────────────────────────────────────
  parent_welcome: {
    name: "smartup_parent_onboard",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Parent Portal Ready",
      },
      {
        type: "BODY",
        text: [
          "Hi {{1}},",
          "",
          "Your SmartUp Parent Portal account is ready. You can now track your childs academic progress, fees, and attendance.",
          "",
          "Your account details have been sent to your registered email address. Please check your inbox to get started.",
        ].join("\n"),
        example: {
          body_text: [["Ravi Kumar"]],
        },
      },
      {
        type: "FOOTER",
        text: "SmartUp Learning Ventures",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. FEE REMINDER
  //    Proactive reminder before due date (no email equiv yet).
  //    Common WhatsApp use case for schools.
  // ─────────────────────────────────────────────────────────────────────
  fee_reminder: {
    name: "fee_reminder",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Fee Reminder",
      },
      {
        type: "BODY",
        text: [
          "Hi {{1}},",
          "",
          "This is a friendly reminder that a fee payment for *{{2}}* is due soon.",
          "",
          "📄 *Invoice:* {{3}}",
          "💰 *Amount Due:* ₹{{4}}",
          "📅 *Due Date:* {{5}}",
          "",
          "Please make the payment before the due date to avoid any late fees.",
        ].join("\n"),
        example: {
          body_text: [
            [
              "Ravi Kumar",
              "Arjun Ravi",
              "ACC-SINV-2026-00045",
              "25,000",
              "15 Apr 2026",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "SmartUp Learning Ventures",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Pay Now",
            url: "https://smartuplearning.net/dashboard/parent/fees",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. INVOICE GENERATED (smartup_fee_invoice)
  //    Sent when invoices are created after admission.
  //    Includes magic-link URL for direct payment without login.
  // ─────────────────────────────────────────────────────────────────────
  invoice_generated: {
    name: "smartup_fee_invoice",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Fee Invoices Generated",
      },
      {
        type: "BODY",
        text: [
          "Hi {{1}},",
          "",
          "Fee invoices have been generated for *{{2}}*.",
          "",
          "🎓 *Program:* {{3}}",
          "🏫 *Branch:* {{4}}",
          "📅 *Academic Year:* {{5}}",
          "💰 *Total Fee:* ₹{{6}}",
          "",
          "📋 *Instalments:*",
          "{{7}}",
          "",
          "Tap *Pay Now* to pay directly — no login required. Or tap *View Invoice* to see full details in your parent portal.",
        ].join("\n"),
        example: {
          body_text: [
            [
              "Ravi Kumar",
              "Arjun Ravi",
              "BCA",
              "Vennala",
              "2026-2027",
              "75,000",
              "1. Q1 — ₹25,000 (Due: 15 Jan 2026)\n2. Q2 — ₹25,000 (Due: 15 Apr 2026)\n3. Q3 — ₹25,000 (Due: 15 Jul 2026)",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "SmartUp Learning Ventures",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Pay Now",
            url: "https://smartuplearning.net/pay/{{1}}",
            example: ["sample-token-abc123"],
          },
          {
            type: "URL",
            text: "View Invoice",
            url: "https://smartuplearning.net/dashboard/parent/fees",
          },
        ],
      },
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 2. PARAMETER BUILDER FUNCTIONS
//    These build the runtime `components` array for sendTemplate().
// ═══════════════════════════════════════════════════════════════════════════

function txt(value: string) {
  return { type: "text" as const, text: value };
}

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// 1. Payment Receipt
// ---------------------------------------------------------------------------

export interface PaymentReceiptParams {
  guardianName: string;
  studentName: string;
  invoiceId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string; // "Razorpay" | "Cash" | "UPI" | "Bank Transfer" | "Cheque"
  referenceId: string;
  /** e.g. "Instalment 1/3 — Balance: ₹50,000" or "Fully Paid" */
  instalmentSummary: string;
}

export function buildPaymentReceipt(
  phone: string,
  p: PaymentReceiptParams,
): SendTemplateOptions {
  return {
    to: phone,
    templateName: "payment_receipt",
    components: [
      {
        type: "body",
        parameters: [
          txt(p.guardianName),
          txt(p.studentName),
          txt(p.invoiceId),
          txt(formatINR(p.amountPaid)),
          txt(formatDate(p.paymentDate)),
          txt(p.paymentMode),
          txt(p.referenceId),
          txt(p.instalmentSummary),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Payment Request
// ---------------------------------------------------------------------------

export interface PaymentRequestParams {
  guardianName: string;
  studentName: string;
  totalAmount: number;
  invoices: Array<{
    label: string;
    amount: number;
    dueDate: string;
  }>;
}

export function buildPaymentRequest(
  phone: string,
  p: PaymentRequestParams,
): SendTemplateOptions {
  const instalmentList = p.invoices
    .map(
      (inv, i) =>
        `${i + 1}. ${inv.label} — ₹${formatINR(inv.amount)} (Due: ${formatDate(inv.dueDate)})`,
    )
    .join("\n");

  return {
    to: phone,
    templateName: "payment_request",
    components: [
      {
        type: "body",
        parameters: [
          txt(p.guardianName),
          txt(p.studentName),
          txt(formatINR(p.totalAmount)),
          txt(instalmentList),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Parent Welcome
// ---------------------------------------------------------------------------

export interface ParentWelcomeParams {
  guardianName: string;
}

export function buildParentWelcome(
  phone: string,
  p: ParentWelcomeParams,
): SendTemplateOptions {
  return {
    to: phone,
    templateName: "smartup_parent_onboard",
    components: [
      {
        type: "body",
        parameters: [txt(p.guardianName)],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Fee Reminder
// ---------------------------------------------------------------------------

export interface FeeReminderParams {
  guardianName: string;
  studentName: string;
  invoiceId: string;
  amountDue: number;
  dueDate: string;
}

export function buildFeeReminder(
  phone: string,
  p: FeeReminderParams,
): SendTemplateOptions {
  return {
    to: phone,
    templateName: "fee_reminder",
    components: [
      {
        type: "body",
        parameters: [
          txt(p.guardianName),
          txt(p.studentName),
          txt(p.invoiceId),
          txt(formatINR(p.amountDue)),
          txt(formatDate(p.dueDate)),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. Invoice Generated (with magic-link URL button)
// ---------------------------------------------------------------------------

export interface InvoiceGeneratedParams {
  guardianName: string;
  studentName: string;
  programName: string;
  branchName: string;
  academicYear: string;
  totalAmount: number;
  instalmentSummary: string;
}

export function buildInvoiceGenerated(
  phone: string,
  p: InvoiceGeneratedParams,
  payUrl: string,
): SendTemplateOptions {
  // Extract the token suffix from the full URL for the dynamic URL button
  // Template URL: https://smartuplearning.net/pay/{{1}}
  // We need to pass just the token part as the suffix
  const tokenSuffix = payUrl.replace(/^https?:\/\/[^/]+\/pay\//, "");

  return {
    to: phone,
    templateName: "smartup_fee_invoice",
    components: [
      {
        type: "body",
        parameters: [
          txt(p.guardianName),
          txt(p.studentName),
          txt(p.programName),
          txt(p.branchName),
          txt(p.academicYear),
          txt(formatINR(p.totalAmount)),
          txt(p.instalmentSummary),
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [txt(tokenSuffix)],
      },
      // Button index 1 (View Invoice) is a static URL — no parameters needed
    ],
  };
}
