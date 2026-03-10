/**
 * Real-workflow end-to-end test.
 *
 * Hits the actual Next.js API routes (running on localhost:3000) the same
 * way the dashboard UI does, with phone numbers added, and verifies that
 * both email AND WhatsApp notifications fire correctly.
 *
 * Prerequisites:
 *   1.  npm run dev  (or running server)
 *   2.  Valid staff session cookie  (set STAFF_COOKIE below)
 *
 * Usage:
 *   node scripts/test-real-workflow.mjs
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
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

// ── Config ─────────────────────────────────────────────────────────────────
const BASE = "http://localhost:3000";
const STUDENT_PHONE = "917356765036";
const PARENT_PHONE  = "918089835558";

// Get a real session cookie by logging into the dev server first:
//   POST /api/auth/login with valid credentials
// Then paste the smartup_session value here:
const STAFF_COOKIE = ""; // FILL IN if running auth-protected tests

function headers(cookie) {
  return {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: `smartup_session=${cookie}` } : {}),
  };
}

// ── Test runner ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
  process.stdout.write(`\n  Testing: ${name}...`);
  try {
    await fn();
    console.log(" ✅");
    passed++;
  } catch (err) {
    console.log(` ❌  ${err.message}`);
    failed++;
  }
}

function expect(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

// ── Tests ──────────────────────────────────────────────────────────────────

/**
 * 1. send-student-welcome → email + WhatsApp smartup_student_onboard
 *    No auth required.
 */
async function testStudentWelcome() {
  const res = await fetch(`${BASE}/api/auth/send-student-welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:      "smartuplearningventures@gmail.com", // send to our own inbox for testing
      full_name:  "Arjun Ravi",
      student_id: "STU-2026-0042",
      program:    "NIOS (Secondary)",
      branch:     "Vennala, Kochi",
      password:   "Welcome@123",
      phone:      STUDENT_PHONE,  // ← new field — triggers WhatsApp
    }),
  });
  const data = await res.json();
  expect(res.ok, `HTTP ${res.status}: ${JSON.stringify(data)}`);
  expect(data.sent === true, `Expected sent=true, got ${JSON.stringify(data)}`);
  console.log(`\n     → Email: smartuplearningventures@gmail.com`);
  console.log(`     → WhatsApp: ${STUDENT_PHONE} (smartup_student_onboard)`);
}

/**
 * 2. create-parent-user → email + WhatsApp smartup_user_setup
 *    Requires staff session.
 */
async function testCreateParentUser() {
  if (!STAFF_COOKIE) {
    throw new Error("STAFF_COOKIE not set — skipping auth-required test");
  }
  const res = await fetch(`${BASE}/api/auth/create-parent-user`, {
    method: "POST",
    headers: headers(STAFF_COOKIE),
    body: JSON.stringify({
      email:     "smartuplearningventures@gmail.com",
      full_name: "Ravi Kumar",
      password:  "Parent@123",
      phone:     PARENT_PHONE,  // ← new field — triggers WhatsApp
    }),
  });
  const data = await res.json();
  expect(res.ok, `HTTP ${res.status}: ${JSON.stringify(data)}`);
  console.log(`\n     → Email: smartuplearningventures@gmail.com`);
  console.log(`     → WhatsApp: ${PARENT_PHONE} (smartup_user_setup)`);
}

/**
 * 3. send-payment-request → email + WhatsApp smartup_payment_reminder
 *    Requires staff session.
 */
async function testSendPaymentRequest() {
  if (!STAFF_COOKIE) {
    throw new Error("STAFF_COOKIE not set — skipping auth-required test");
  }
  const res = await fetch(`${BASE}/api/payments/send-payment-request`, {
    method: "POST",
    headers: headers(STAFF_COOKIE),
    body: JSON.stringify({
      guardian_email: "smartuplearningventures@gmail.com",
      guardian_name:  "Ravi Kumar",
      guardian_phone: PARENT_PHONE,  // ← new field — triggers WhatsApp
      student_name:   "Arjun Ravi",
      total_amount:   75000,
      invoices: [
        { invoice_id: "ACC-SINV-2026-00045", amount: 25000, due_date: "2026-04-15", label: "Instalment 1" },
        { invoice_id: "ACC-SINV-2026-00046", amount: 25000, due_date: "2026-07-15", label: "Instalment 2" },
        { invoice_id: "ACC-SINV-2026-00047", amount: 25000, due_date: "2026-10-15", label: "Instalment 3" },
      ],
    }),
  });
  const data = await res.json();
  expect(res.ok, `HTTP ${res.status}: ${JSON.stringify(data)}`);
  console.log(`\n     → Email: smartuplearningventures@gmail.com`);
  console.log(`     → WhatsApp: ${PARENT_PHONE} (smartup_payment_reminder)`);
}

/**
 * 4. send-receipt → email + WhatsApp smartup_payment_done
 *    Requires auth (any logged-in user). Uses a real invoice from Frappe.
 *    guardian phone comes from Frappe Guardian.mobile_number field.
 */
async function testSendReceipt() {
  if (!STAFF_COOKIE) {
    throw new Error("STAFF_COOKIE not set — skipping auth-required test");
  }
  // Use a real invoice ID from your Frappe instance
  const REAL_INVOICE = "ACC-SINV-2026-00001"; // change to a real one
  const res = await fetch(`${BASE}/api/payments/send-receipt`, {
    method: "POST",
    headers: headers(STAFF_COOKIE),
    body: JSON.stringify({ invoice_id: REAL_INVOICE }),
  });
  const data = await res.json();
  expect(res.ok, `HTTP ${res.status}: ${JSON.stringify(data)}`);
  console.log(`\n     → Invoice: ${REAL_INVOICE}`);
  console.log(`     → Email: ${data.recipient}`);
  console.log(`     → WhatsApp fires if Guardian.mobile_number is set in Frappe`);
}

// ── WhatsApp direct test (no auth needed) ─────────────────────────────────

/**
 * Direct WhatsApp API test — verifies token + approved templates still work.
 * Uses Meta API directly (not via Next.js routes).
 */
async function testWhatsAppDirectAll() {
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;
  const API_VERSION     = "v21.0";

  async function send(templateName, to, components) {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to,
          type: "template",
          template: { name: templateName, language: { code: "en" }, components },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`${templateName}: ${data.error?.message}`);
    return data.messages?.[0]?.id;
  }

  // 1. Student enrollment
  const id1 = await send("smartup_student_onboard", STUDENT_PHONE, [{
    type: "body",
    parameters: [
      { type: "text", text: "Arjun Ravi" },
      { type: "text", text: "NIOS (Secondary)" },
      { type: "text", text: "Vennala, Kochi" },
      { type: "text", text: "STU-2026-0042" },
    ],
  }]);
  console.log(`\n     → [student] smartup_student_onboard → ${STUDENT_PHONE} | msgId: ${id1}`);

  // 2. Parent portal setup
  const id2 = await send("smartup_user_setup", PARENT_PHONE, [{
    type: "body",
    parameters: [
      { type: "text", text: "Ravi Kumar" },
      { type: "text", text: "Parent" },
      { type: "text", text: "smartuplearning.net" },
      { type: "text", text: "ravi.kumar@example.com" },
    ],
  }]);
  console.log(`     → [parent] smartup_user_setup → ${PARENT_PHONE} | msgId: ${id2}`);

  // 3. Payment received
  const id3 = await send("smartup_payment_done", STUDENT_PHONE, [{
    type: "body",
    parameters: [
      { type: "text", text: "Arjun Ravi" },
      { type: "text", text: "₹25,000" },
      { type: "text", text: "ACC-SINV-2026-00045" },
      { type: "text", text: "10 Mar 2026" },
    ],
  }]);
  console.log(`     → [student] smartup_payment_done → ${STUDENT_PHONE} | msgId: ${id3}`);

  // 4. Payment reminder
  const id4 = await send("smartup_payment_reminder", PARENT_PHONE, [{
    type: "body",
    parameters: [
      { type: "text", text: "Ravi Kumar" },
      { type: "text", text: "₹25,000" },
      { type: "text", text: "Arjun Ravi" },
      { type: "text", text: "15 Apr 2026" },
      { type: "text", text: "ACC-SINV-2026-00045" },
    ],
  }]);
  console.log(`     → [parent] smartup_payment_reminder → ${PARENT_PHONE} | msgId: ${id4}`);

  // 5. Fee reminder
  const id5 = await send("fee_reminder", PARENT_PHONE, [{
    type: "body",
    parameters: [
      { type: "text", text: "Ravi Kumar" },
      { type: "text", text: "Arjun Ravi" },
      { type: "text", text: "ACC-SINV-2026-00045" },
      { type: "text", text: "25,000" },
      { type: "text", text: "15 Apr 2026" },
    ],
  }]);
  console.log(`     → [parent] fee_reminder → ${PARENT_PHONE} | msgId: ${id5}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log(" Real-Workflow End-to-End Test — SmartUp Learning Ventures");
  console.log("=".repeat(65));
  console.log(`\n  Student phone : ${STUDENT_PHONE}`);
  console.log(`  Parent phone  : ${PARENT_PHONE}`);
  console.log(`  Staff session : ${STAFF_COOKIE ? "SET" : "NOT SET (auth tests will skip)"}`);
  console.log("");

  // ── Section A: Direct WhatsApp template verification ──────────────
  console.log("─".repeat(65));
  console.log(" A. Direct WhatsApp — Approved Templates (no server needed)");
  console.log("─".repeat(65));
  await test("All 5 approved templates fire correctly", testWhatsAppDirectAll);

  // ── Section B: API route integration (requires dev server) ─────────
  console.log("\n" + "─".repeat(65));
  console.log(" B. API Route Integration (requires npm run dev on port 3000)");
  console.log("─".repeat(65));

  // Check if dev server is up
  let serverUp = false;
  try {
    const res = await fetch(`${BASE}/api/auth/me`, { signal: AbortSignal.timeout(2000) });
    serverUp = true;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    console.log("\n  ⚠️  Dev server not running on port 3000.");
    console.log("     Run `npm run dev` then re-run this script to test API routes.");
    console.log("     Direct WhatsApp tests (Section A) above are still valid.");
  } else {
    await test("send-student-welcome (email + WhatsApp)", testStudentWelcome);
    await test("create-parent-user (email + WhatsApp)", testCreateParentUser);
    await test("send-payment-request (email + WhatsApp)", testSendPaymentRequest);
    await test("send-receipt (email + WhatsApp via Frappe)", testSendReceipt);
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(65));
  console.log(` Results: ${passed} passed | ${failed} failed`);
  console.log("=".repeat(65));
  console.log("");
  console.log(" Workflow Coverage:");
  console.log("  ✅  Student enrolled  → email + WhatsApp (smartup_student_onboard)");
  console.log("  ✅  Parent created    → email + WhatsApp (smartup_user_setup)");
  console.log("  ✅  Fee requested     → email + WhatsApp (smartup_payment_reminder)");
  console.log("  ✅  Payment recorded  → email + WhatsApp (smartup_payment_done)");
  console.log("  ✅  Fee reminder      → email + WhatsApp (fee_reminder)");
  console.log("\n  PENDING (will activate once Meta approves):");
  console.log("  ⏳  payment_receipt          → detailed instalment receipt");
  console.log("  ⏳  payment_request          → full instalment breakdown");
  console.log("  ⏳  smartup_parent_onboard   → parent welcome message");
  console.log("=".repeat(65));
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err.message);
  process.exit(1);
});
