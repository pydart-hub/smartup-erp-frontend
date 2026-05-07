/**
 * Revert the accidental conversion of ARUN M (STU-SU CHL-26-161)
 * 
 * Steps:
 * 1. Cancel + delete invoices ACC-SINV-2026-06872 to 06875
 * 2. Cancel + delete Sales Order SAL-ORD-2026-00905
 * 3. Reset Student type back to "Demo"
 * 4. Clear PE plan/instalments fields
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";

const headers = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

const INVOICES = [
  "ACC-SINV-2026-06872",
  "ACC-SINV-2026-06873",
  "ACC-SINV-2026-06874",
  "ACC-SINV-2026-06875",
];
const SALES_ORDER = "SAL-ORD-2026-00905";
const STUDENT_ID = "STU-SU CHL-26-161";
const PE_NAME = "PEN-12sc state-Chullickal 26-27-161";

async function frappePut(path, body) {
  const res = await fetch(`${FRAPPE_URL}/api${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).data;
}

async function frappeDelete(path) {
  const res = await fetch(`${FRAPPE_URL}/api${path}`, {
    method: "DELETE",
    headers,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

async function frappeGet(path) {
  const res = await fetch(`${FRAPPE_URL}/api${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()).data;
}

async function setValueFrappe(doctype, name, fieldname) {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.set_value`, {
    method: "POST",
    headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`set_value ${doctype}/${name} → ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  // ── 1. Verify current state ──────────────────────────────────────────────
  console.log("=== Checking current state ===");
  const student = await frappeGet(`/resource/Student/${encodeURIComponent(STUDENT_ID)}`);
  console.log(`Student type: ${student.custom_student_type}`);

  const pe = await frappeGet(`/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  console.log(`PE plan: "${pe.custom_plan}", instalments: "${pe.custom_no_of_instalments}"`);

  // ── 2. Cancel + Delete Invoices ─────────────────────────────────────────
  console.log("\n=== Cancelling & Deleting Invoices ===");
  for (const inv of INVOICES) {
    try {
      // Check current docstatus
      const invDoc = await frappeGet(`/resource/Sales Invoice/${encodeURIComponent(inv)}`);
      console.log(`Invoice ${inv}: docstatus=${invDoc.docstatus}, status=${invDoc.status}`);

      if (invDoc.docstatus === 1) {
        // Cancel first
        await frappePut(`/resource/Sales Invoice/${encodeURIComponent(inv)}`, { docstatus: 2 });
        console.log(`  ✓ Cancelled ${inv}`);
      }

      if (invDoc.docstatus !== 2 || invDoc.docstatus === 2) {
        // Delete
        await frappeDelete(`/resource/Sales Invoice/${encodeURIComponent(inv)}`);
        console.log(`  ✓ Deleted ${inv}`);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${inv}: ${err.message}`);
    }
  }

  // ── 3. Cancel + Delete Sales Order ──────────────────────────────────────
  console.log("\n=== Cancelling & Deleting Sales Order ===");
  try {
    const soDoc = await frappeGet(`/resource/Sales Order/${encodeURIComponent(SALES_ORDER)}`);
    console.log(`SO ${SALES_ORDER}: docstatus=${soDoc.docstatus}, status=${soDoc.status}`);

    if (soDoc.docstatus === 1) {
      await frappePut(`/resource/Sales Order/${encodeURIComponent(SALES_ORDER)}`, { docstatus: 2 });
      console.log(`  ✓ Cancelled ${SALES_ORDER}`);
    }

    await frappeDelete(`/resource/Sales Order/${encodeURIComponent(SALES_ORDER)}`);
    console.log(`  ✓ Deleted ${SALES_ORDER}`);
  } catch (err) {
    console.error(`  ✗ Error processing SO: ${err.message}`);
  }

  // ── 4. Reset Student type back to Demo ──────────────────────────────────
  console.log("\n=== Resetting Student type to Demo ===");
  try {
    await frappePut(`/resource/Student/${encodeURIComponent(STUDENT_ID)}`, {
      custom_student_type: "Demo",
    });
    console.log(`  ✓ Student type reset to Demo`);
  } catch (err) {
    console.error(`  ✗ Error resetting student type: ${err.message}`);
  }

  // ── 5. Clear PE plan/instalments fields ────────────────────────────────
  console.log("\n=== Clearing PE plan fields ===");
  try {
    await setValueFrappe("Program Enrollment", PE_NAME, {
      custom_plan: "",
      custom_no_of_instalments: "",
    });
    console.log(`  ✓ PE plan and instalments cleared`);
  } catch (err) {
    console.error(`  ✗ Error clearing PE fields: ${err.message}`);
  }

  // ── 6. Verify final state ────────────────────────────────────────────────
  console.log("\n=== Verifying final state ===");
  const studentFinal = await frappeGet(`/resource/Student/${encodeURIComponent(STUDENT_ID)}`);
  console.log(`Student type: ${studentFinal.custom_student_type}`);

  const peFinal = await frappeGet(`/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  console.log(`PE plan: "${peFinal.custom_plan}", instalments: "${peFinal.custom_no_of_instalments}"`);

  console.log("\n=== Revert complete ===");
}

main().catch(console.error);
