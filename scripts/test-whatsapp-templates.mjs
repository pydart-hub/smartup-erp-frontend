/**
 * Test script — sends one sample message for each APPROVED WhatsApp template.
 *
 * Student:  7356765036
 * Parent:   8089835558
 *
 * APPROVED templates sent:
 *   smartup_student_onboard   → student (enrollment confirmation)
 *   smartup_user_setup        → parent  (portal login ready)
 *   smartup_payment_done      → student (payment receipt)
 *   smartup_payment_reminder  → parent  (payment due reminder)
 *   fee_reminder              → parent  (proactive fee reminder)
 *
 * PENDING (will be sent once approved):
 *   payment_receipt, payment_request, smartup_parent_onboard
 *
 * Usage:  node scripts/test-whatsapp-templates.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  process.env[key] = val;
}

// ── Config ─────────────────────────────────────────────────────────────────
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION     = "v21.0";
const BASE_URL        = `https://graph.facebook.com/${API_VERSION}`;

const STUDENT_PHONE = "917356765036";  // Arjun (student)
const PARENT_PHONE  = "918089835558";  // Parent

// ── Helpers ────────────────────────────────────────────────────────────────
function formatINR(n) {
  return n.toLocaleString("en-IN");
}

async function sendTemplate(templateName, to, components) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      ...(components?.length ? { components } : {}),
    },
  };

  console.log(`\n📤 Sending "${templateName}" → ${to}`);
  const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`   ❌ FAILED (${res.status}):`, JSON.stringify(data?.error || data, null, 2));
    return null;
  }
  console.log(`   ✅ Sent — Message ID: ${data.messages?.[0]?.id}`);
  return data;
}

function txt(text) {
  return { type: "text", text };
}

// ── Templates ──────────────────────────────────────────────────────────────

/** 1. Enrollment confirmation → STUDENT */
async function sendStudentOnboard() {
  return sendTemplate("smartup_student_onboard", STUDENT_PHONE, [
    {
      type: "body",
      parameters: [
        txt("Arjun"),                          // {{1}} student first name
        txt("NIOS (Secondary)"),               // {{2}} program
        txt("Vennala, Kochi"),                 // {{3}} branch
        txt("STU-2026-0042"),                  // {{4}} student ID
      ],
    },
  ]);
}

/** 2. Parent portal login ready → PARENT */
async function sendUserSetup() {
  return sendTemplate("smartup_user_setup", PARENT_PHONE, [
    {
      type: "body",
      parameters: [
        txt("Ravi Kumar"),                     // {{1}} parent name
        txt("Parent"),                         // {{2}} role
        txt("smartuplearning.net"),            // {{3}} portal URL
        txt("ravi.kumar@example.com"),         // {{4}} email
      ],
    },
  ]);
}

/** 3. Payment received confirmation → STUDENT */
async function sendPaymentDone() {
  return sendTemplate("smartup_payment_done", STUDENT_PHONE, [
    {
      type: "body",
      parameters: [
        txt("Arjun"),                          // {{1}} name
        txt("₹25,000"),                        // {{2}} amount
        txt("pay_QR1abc2def3ghi"),             // {{3}} transaction ID
        txt("10 Mar 2026"),                    // {{4}} date
      ],
    },
  ]);
}

/** 4. Payment due reminder → PARENT */
async function sendPaymentReminder() {
  return sendTemplate("smartup_payment_reminder", PARENT_PHONE, [
    {
      type: "body",
      parameters: [
        txt("Ravi Kumar"),                     // {{1}} parent name
        txt("₹25,000"),                        // {{2}} amount
        txt("Arjun Ravi"),                     // {{3}} student name
        txt("15 Apr 2026"),                    // {{4}} due date
        txt("ACC-SINV-2026-00045"),            // {{5}} invoice ID
      ],
    },
  ]);
}

/** 5. Fee reminder (proactive) → PARENT */
async function sendFeeReminder() {
  return sendTemplate("fee_reminder", PARENT_PHONE, [
    {
      type: "body",
      parameters: [
        txt("Ravi Kumar"),                     // {{1}} parent name
        txt("Arjun Ravi"),                     // {{2}} student name
        txt("ACC-SINV-2026-00045"),            // {{3}} invoice ID
        txt(formatINR(25000)),                 // {{4}} amount due
        txt("15 Apr 2026"),                    // {{5}} due date
      ],
    },
  ]);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log(" WhatsApp Template Test — SmartUp Learning Ventures");
  console.log("=".repeat(60));
  console.log(`\nPhone Number ID : ${PHONE_NUMBER_ID}`);
  console.log(`Student (7356765036) : ${STUDENT_PHONE}`);
  console.log(`Parent  (8089835558) : ${PARENT_PHONE}`);
  console.log("");
  console.log("Templates: smartup_student_onboard, smartup_user_setup,");
  console.log("           smartup_payment_done, smartup_payment_reminder, fee_reminder");
  console.log("Pending  : payment_receipt, payment_request, smartup_parent_onboard");
  console.log("");

  const results = {
    "smartup_student_onboard → student": await sendStudentOnboard(),
    "smartup_user_setup → parent":       await sendUserSetup(),
    "smartup_payment_done → student":    await sendPaymentDone(),
    "smartup_payment_reminder → parent": await sendPaymentReminder(),
    "fee_reminder → parent":             await sendFeeReminder(),
  };

  console.log("\n" + "=".repeat(60));
  console.log(" Summary");
  console.log("=".repeat(60));
  let passed = 0, failed = 0;
  for (const [name, result] of Object.entries(results)) {
    const ok = !!result;
    console.log(`  ${ok ? "✅" : "❌"}  ${name}`);
    ok ? passed++ : failed++;
  }
  console.log(`\n  Sent: ${passed}  |  Failed: ${failed}`);
  console.log("\n  NOTE: payment_receipt, payment_request, smartup_parent_onboard");
  console.log("        are still PENDING approval at Meta. Will send once approved.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err.message);
  process.exit(1);
});
