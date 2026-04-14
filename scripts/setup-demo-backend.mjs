/**
 * Backend setup script for Demo Student Admission
 *
 * Run this ONCE against each Frappe Cloud site to set up the required backend records.
 *
 * What it does:
 * 1. Creates "Demo" Student Category (if not exists)
 * 2. Adds "Demo" to custom_student_type Select options (if not already present)
 * 3. Creates "Demo Tuition Fee" item under Tuition Fee group (if not exists)
 *
 * Usage:
 *   node scripts/setup-demo-backend.mjs
 *
 * Environment (from .env.local):
 *   NEXT_PUBLIC_FRAPPE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET
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

const BASE_URL = env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = env.FRAPPE_API_KEY;
const API_SECRET = env.FRAPPE_API_SECRET;

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error("Missing NEXT_PUBLIC_FRAPPE_URL, FRAPPE_API_KEY, or FRAPPE_API_SECRET in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function frappeGet(endpoint) {
  const res = await fetch(`${BASE_URL}/api${endpoint}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${endpoint} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function frappePost(endpoint, body) {
  const res = await fetch(`${BASE_URL}/api${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function frappePut(endpoint, body) {
  const res = await fetch(`${BASE_URL}/api${endpoint}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// ───────────────────────────────────────────────────
// 1. Create "Demo" Student Category
// ───────────────────────────────────────────────────
async function ensureStudentCategory() {
  try {
    await frappeGet("/resource/Student Category/Demo");
    console.log("✓ Student Category 'Demo' already exists");
    return;
  } catch {
    // Doesn't exist — create it
  }

  const { status, data } = await frappePost("/resource/Student Category", { category: "Demo" });
  if (status === 200 || status === 201) {
    console.log("✓ Created Student Category 'Demo'");
  } else {
    console.error(`✗ Failed to create Student Category 'Demo' (HTTP ${status})`);
    console.error(JSON.stringify(data, null, 2));
  }
}

// ───────────────────────────────────────────────────
// 2. Add "Demo" to custom_student_type field options
// ───────────────────────────────────────────────────
async function ensureStudentTypeOption() {
  // Read the Custom Field by its exact name (Frappe naming: {doctype}-{fieldname})
  let field;
  try {
    const res = await frappeGet(`/resource/Custom Field/Student-custom_student_type?fields=["name","options"]`);
    field = res.data;
  } catch {
    console.log("⚠ custom_student_type Custom Field not found — you may need to add it manually");
    return;
  }

  if (!field) {
    console.log("⚠ custom_student_type Custom Field not found");
    return;
  }

  const currentOptions = field.options || "";
  if (currentOptions.includes("Demo")) {
    console.log("✓ 'Demo' already in custom_student_type options");
    return;
  }

  const newOptions = currentOptions.trim() + "\nDemo";
  const { status } = await frappePut(`/resource/Custom Field/${encodeURIComponent(field.name)}`, {
    options: newOptions,
  });

  if (status === 200) {
    console.log("✓ Added 'Demo' to custom_student_type options");
  } else {
    console.error(`✗ Failed to update custom_student_type options (HTTP ${status})`);
  }
}

// ───────────────────────────────────────────────────
// 3. Create "Demo Tuition Fee" Item
// ───────────────────────────────────────────────────
async function ensureDemoItem() {
  try {
    await frappeGet("/resource/Item/Demo Tuition Fee");
    console.log("✓ Item 'Demo Tuition Fee' already exists");
    return;
  } catch {
    // Doesn't exist — create it
  }

  // Find the Item Group for tuition fees
  let itemGroup = "Services";
  try {
    // Check if "Tuition Fee" item group exists
    await frappeGet("/resource/Item Group/Tuition Fee");
    itemGroup = "Tuition Fee";
  } catch {
    // Use "Services" as fallback
  }

  const { status, data } = await frappePost("/resource/Item", {
    item_code: "Demo Tuition Fee",
    item_name: "Demo Tuition Fee",
    item_group: itemGroup,
    stock_uom: "Nos",
    is_stock_item: 0,
    description: "Demo admission fee — ₹499 flat fee for 1 month trial",
    standard_rate: 499,
  });

  if (status === 200 || status === 201) {
    console.log("✓ Created Item 'Demo Tuition Fee'");
  } else {
    console.error(`✗ Failed to create Item 'Demo Tuition Fee' (HTTP ${status})`);
    console.error(JSON.stringify(data, null, 2));
  }
}

// ───── Run all ─────
async function main() {
  console.log("Setting up Demo Student backend on:", BASE_URL);
  console.log("");
  await ensureStudentCategory();
  await ensureStudentTypeOption();
  await ensureDemoItem();
  console.log("");
  console.log("Done! You can now admit demo students from the portal.");
  console.log("");
  console.log("Note: If your branches have per-branch tuition fee items (e.g. 'Tuition Fee - SU CHL'),");
  console.log("you may want to look up the item using the program as the demo flow does automatically.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
