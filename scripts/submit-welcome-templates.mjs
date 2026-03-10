/**
 * Submit the 2 welcome templates (student + parent) as UTILITY without URL buttons.
 * The first 3 templates (payment_receipt, payment_request, fee_reminder) are already PENDING.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
const apiUrl = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;

const TEMPLATES = [
  {
    name: "smartup_student_onboard",
    language: "en",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Welcome to SmartUp" },
      {
        type: "BODY",
        text: "Hi {{1}},\n\nYour enrollment at SmartUp Learning is confirmed.\n\nProgram: {{2}}\nBranch: {{3}}\nStudent ID: {{4}}\n\nYour account details have been sent to your registered email address. Please check your inbox to get started.",
        example: {
          body_text: [["Arjun Ravi", "BCA", "Vennala", "STU-2026-0042"]],
        },
      },
      { type: "FOOTER", text: "SmartUp Learning Ventures" },
    ],
  },
  {
    name: "smartup_parent_onboard",
    language: "en",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Parent Portal Ready" },
      {
        type: "BODY",
        text: "Hi {{1}},\n\nYour SmartUp Parent Portal account is ready. You can now track your childs academic progress, fees, and attendance.\n\nYour account details have been sent to your registered email address. Please check your inbox to get started.",
        example: {
          body_text: [["Ravi Kumar"]],
        },
      },
      { type: "FOOTER", text: "SmartUp Learning Ventures" },
    ],
  },
];

async function main() {
  console.log("Submitting 2 welcome templates...\n");
  for (const tpl of TEMPLATES) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tpl),
    });
    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ${tpl.name}: OK (id: ${data.id}, status: ${data.status})`);
    } else {
      console.log(`  ${tpl.name}: FAILED (${res.status})`);
      console.log(`    ${JSON.stringify(data.error || data)}`);
    }
  }
}

main();
