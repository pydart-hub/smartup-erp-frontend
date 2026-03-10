/**
 * Submit WhatsApp message templates to Meta Cloud API.
 *
 * Usage:  node scripts/submit-whatsapp-templates.mjs
 *
 * Reads credentials from .env.local and POSTs each template to:
 *   POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local manually (no dotenv dependency needed) ──────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "..", ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const WABA_ID = env.WHATSAPP_BUSINESS_ID;
const ACCESS_TOKEN = env.WHATSAPP_ACCESS_TOKEN;

if (!WABA_ID || !ACCESS_TOKEN) {
  console.error("❌ Missing WHATSAPP_BUSINESS_ID or WHATSAPP_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const API_URL = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;

// ── Template definitions (same as whatsappTemplates.ts) ─────────────────

const TEMPLATES = [
  // 1. Payment Receipt
  {
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
        text: "Hi {{1}},\n\nWe've received your payment for *{{2}}*.\n\n📄 *Invoice:* {{3}}\n💰 *Amount Paid:* ₹{{4}}\n📅 *Date:* {{5}}\n💳 *Mode:* {{6}}\n🔖 *Ref:* {{7}}\n\n{{8}}\n\nThank you for your timely payment!",
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

  // 2. Payment Request
  {
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
        text: "Hi {{1}},\n\nYour child *{{2}}* has a pending fee payment.\n\n💰 *Total Amount:* ₹{{3}}\n📋 *Instalments:*\n{{4}}\n\nPlease complete the payment at your earliest convenience.",
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

  // 3. Student Welcome
  {
    name: "student_welcome",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Welcome to SmartUp",
      },
      {
        type: "BODY",
        text: "Hi {{1}},\n\nWelcome to SmartUp Learning! Your student account is ready.\n\n📚 *Program:* {{2}}\n🏫 *Branch:* {{3}}\n\n🔐 *Login Details:*\nEmail: {{4}}\nStudent ID: {{5}}\n\nPlease log in and change your password on first access.",
        example: {
          body_text: [
            [
              "Arjun Ravi",
              "BCA",
              "Vennala",
              "arjun@student.smartup.in",
              "STU-2026-0042",
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
            text: "Login Now",
            url: "https://smartuplearning.net/auth/login",
          },
        ],
      },
    ],
  },

  // 4. Parent Welcome
  {
    name: "parent_welcome",
    language: "en",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Parent Portal Access",
      },
      {
        type: "BODY",
        text: "Hi {{1}},\n\nYour SmartUp Parent Portal account is ready! Track your child's academic progress, fees, and attendance.\n\n🔐 *Login Details:*\nEmail: {{2}}\n\nUse the link below to set your password and get started.",
        example: {
          body_text: [["Ravi Kumar", "ravi@example.com"]],
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
            text: "Set Password",
            url: "https://smartuplearning.net/auth/forgot-password",
          },
        ],
      },
    ],
  },

  // 5. Fee Reminder
  {
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
        text: "Hi {{1}},\n\nThis is a friendly reminder that a fee payment for *{{2}}* is due soon.\n\n📄 *Invoice:* {{3}}\n💰 *Amount Due:* ₹{{4}}\n📅 *Due Date:* {{5}}\n\nPlease make the payment before the due date to avoid any late fees.",
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
];

// ── Submit each template ────────────────────────────────────────────────

async function submitTemplate(template) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(template),
  });

  const data = await res.json();
  return { name: template.name, status: res.status, data };
}

async function main() {
  console.log(`\n📤 Submitting ${TEMPLATES.length} templates to Meta WhatsApp API...\n`);
  console.log(`   WABA ID: ${WABA_ID}`);
  console.log(`   API URL: ${API_URL}\n`);

  const results = [];

  for (const template of TEMPLATES) {
    process.stdout.write(`  → ${template.name} ... `);
    try {
      const result = await submitTemplate(template);
      if (result.status === 200 || result.status === 201) {
        console.log(`✅ OK (id: ${result.data.id}, status: ${result.data.status})`);
      } else {
        console.log(`❌ FAILED (${result.status})`);
        console.log(`    Error: ${JSON.stringify(result.data.error || result.data)}`);
      }
      results.push(result);
    } catch (err) {
      console.log(`❌ NETWORK ERROR: ${err.message}`);
      results.push({ name: template.name, status: 0, data: { error: err.message } });
    }
  }

  console.log("\n── Summary ──────────────────────────────────────────");
  const ok = results.filter((r) => r.status === 200 || r.status === 201);
  const fail = results.filter((r) => r.status !== 200 && r.status !== 201);
  console.log(`  ✅ Submitted: ${ok.length}/${TEMPLATES.length}`);
  if (fail.length > 0) {
    console.log(`  ❌ Failed: ${fail.length}`);
    for (const f of fail) {
      console.log(`     - ${f.name}: ${JSON.stringify(f.data.error || f.data)}`);
    }
  }
  console.log("\n💡 Templates go to PENDING status first, then Meta reviews & approves.");
  console.log("   UTILITY templates are typically auto-approved within minutes.\n");
}

main();
