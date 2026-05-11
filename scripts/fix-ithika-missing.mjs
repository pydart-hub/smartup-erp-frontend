/**
 * fix-ithika-missing.mjs
 * Creates the 2 missing invoices (Inst 1 + Inst 6) and updates Program Enrollment.
 *
 * Already created:
 *   ACC-SINV-2026-07158  → Inst 2 (Jun 1) ₹3,300
 *   ACC-SINV-2026-07159  → Inst 3 (Jul 1) ₹3,300
 *   ACC-SINV-2026-07160  → Inst 4 (Aug 1) ₹3,300
 *   ACC-SINV-2026-07161  → Inst 5 (Sep 1) ₹3,300
 *   ACC-SINV-2026-07162  → Inst 7 (Nov 1) ₹3,300
 *   ACC-SINV-2026-07163  → Inst 8 (Dec 1) ₹1,401
 *
 * Still missing:
 *   Inst 1 (May 1)  ₹3,300 — past date → post today, due today (shows overdue in description)
 *   Inst 6 (Oct 1)  ₹3,300 — network failure, retry
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const STUDENT_ID       = 'STU-SU FKO-26-098';
const SALES_ORDER_NAME = 'SAL-ORD-2026-00906';
const PE_NAME          = 'PEN-9th-Fortkochi 26-27-098';
const TODAY            = new Date().toISOString().split('T')[0]; // 2026-05-11

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`POST ${path} → ${r.status}: ${txt.slice(0, 300)}`);
  }
  return r.json();
}

async function put(path, body) {
  const r = await fetch(BASE + path, {
    method: 'PUT',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`PUT ${path} → ${r.status}: ${txt.slice(0, 300)}`);
  }
  return r.json();
}

// Fetch SO once to get item details
async function getSO() {
  const r = await fetch(`${BASE}/api/resource/Sales Order/${SALES_ORDER_NAME}`, {
    headers: { Authorization: AUTH },
  });
  return (await r.json()).data;
}

async function createInvoice({ label, dueDate, amount, creditApplied }) {
  const so = await getSO();
  const soItem = so.items[0];

  // For past dates: post today but label correctly in description
  const postDate = dueDate < TODAY ? TODAY : dueDate;

  const description = creditApplied
    ? `${label} — ${soItem.item_name} | Demo credit: -₹${creditApplied} (original rate ₹1,900; paid via SAL-ORD-2026-00660)`
    : dueDate < TODAY
      ? `${label} — ${soItem.item_name} (original due: ${dueDate})`
      : `${label} — ${soItem.item_name}`;

  const payload = {
    doctype: 'Sales Invoice',
    customer: so.customer,
    company: so.company,
    posting_date: postDate,
    due_date: postDate,
    student: STUDENT_ID,
    custom_academic_year: so.custom_academic_year,
    items: [{
      item_code: soItem.item_code,
      item_name: soItem.item_name,
      description,
      qty: 1,
      rate: amount,
      amount,
      sales_order: SALES_ORDER_NAME,
      so_detail: soItem.name,
    }],
  };

  const created = await post('/api/resource/Sales Invoice', payload);
  const invoiceName = created.data?.name;
  console.log(`  ✓ Created draft: ${invoiceName} (₹${amount} | due ${postDate})`);

  await put(`/api/resource/Sales Invoice/${invoiceName}`, { docstatus: 1 });
  console.log(`  ✓ Submitted:     ${invoiceName}`);
  return invoiceName;
}

async function main() {
  console.log('\n=== ITHIKA SAJU — MISSING INVOICES FIX ===\n');

  // ── Inst 1: May 1 (past) → post today ─────────────────────────────────────
  console.log('[1] Creating Instalment 1 of 8 (₹3,300)...');
  try {
    const inv1 = await createInvoice({ label: 'Instalment 1 of 8', dueDate: '2026-05-01', amount: 3300 });
    console.log(`    → ${inv1}\n`);
  } catch (e) {
    console.error(`  ❌ Failed: ${e.message}\n`);
  }

  // ── Inst 6: Oct 1 (retry) ─────────────────────────────────────────────────
  console.log('[2] Creating Instalment 6 of 8 (₹3,300)...');
  try {
    const inv6 = await createInvoice({ label: 'Instalment 6 of 8', dueDate: '2026-10-01', amount: 3300 });
    console.log(`    → ${inv6}\n`);
  } catch (e) {
    console.error(`  ❌ Failed: ${e.message}\n`);
  }

  // ── PE Update (without student_category — locked after submit) ────────────
  console.log('[3] Updating Program Enrollment...');
  try {
    await post('/api/method/frappe.client.set_value', {
      doctype: 'Program Enrollment',
      name: PE_NAME,
      fieldname: {
        custom_plan: 'Advanced',
        custom_no_of_instalments: '8',
        // student_category omitted — cannot change after submission
      },
    });
    console.log('  ✓ PE updated: custom_plan=Advanced, custom_no_of_instalments=8');
  } catch (e) {
    console.error(`  ❌ PE update failed: ${e.message}`);
  }

  console.log('\n=== DONE ===\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
