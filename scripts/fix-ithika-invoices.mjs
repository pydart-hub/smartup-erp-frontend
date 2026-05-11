/**
 * fix-ithika-invoices.mjs
 *
 * Manual recovery script for ITHIKA SAJU (STU-SU FKO-26-098)
 *
 * Problem: Demo→Regular conversion succeeded (SO created, student type updated)
 * but invoice creation FAILED because the internal API call to
 * /api/admission/create-invoices didn't forward the session cookie → 401.
 *
 * Fee Structure: Tier 1 Advanced 9th State (Fortkochi = Tier 1)
 *   8-installment total: ₹25,000
 *   Inst 1–7: ₹3,300 each
 *   Inst 8 (final): ₹1,900
 *   Demo credit applied to final inst: ₹1,900 - ₹499 = ₹1,401
 *   Net invoiced total: ₹24,501
 *   SO committed total: ₹24,500.96 (₹0.04 rounding from averaging credit)
 *
 * Start date: 2026-05-01 → monthly due dates May 1 – Dec 1
 * Inst 1 (Apr 22) is past → posted with original date so it shows as overdue
 *
 * Usage:
 *   node scripts/fix-ithika-invoices.mjs           # dry run (default)
 *   DRY_RUN=false node scripts/fix-ithika-invoices.mjs  # actual fix
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY_RUN = process.env.DRY_RUN !== 'false';

const STUDENT_ID       = 'STU-SU FKO-26-098';
const SALES_ORDER_NAME = 'SAL-ORD-2026-00906';
const PE_NAME          = 'PEN-9th-Fortkochi 26-27-098';

// Instalment schedule — Tier 1 Advanced 9th State, 8 instalments
// Fee config: ₹3,300 × 7 + ₹1,900 (final) = ₹25,000
// Demo credit ₹499 applied to final instalment: ₹1,900 - ₹499 = ₹1,401
// Start date: 2026-05-01, monthly due dates May–Dec 1
const SCHEDULE = [
  { label: 'Instalment 1 of 8', dueDate: '2026-05-01', amount: 3300 },
  { label: 'Instalment 2 of 8', dueDate: '2026-06-01', amount: 3300 },
  { label: 'Instalment 3 of 8', dueDate: '2026-07-01', amount: 3300 },
  { label: 'Instalment 4 of 8', dueDate: '2026-08-01', amount: 3300 },
  { label: 'Instalment 5 of 8', dueDate: '2026-09-01', amount: 3300 },
  { label: 'Instalment 6 of 8', dueDate: '2026-10-01', amount: 3300 },
  { label: 'Instalment 7 of 8', dueDate: '2026-11-01', amount: 3300 },
  // Final instalment ₹1,900 reduced by ₹499 demo credit already paid via SAL-ORD-2026-00660
  { label: 'Instalment 8 of 8', dueDate: '2026-12-01', amount: 1401, creditApplied: 499 },
];

const today = new Date().toISOString().split('T')[0];

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}: ${await r.text().catch(() => '')}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${await r.text().catch(() => '')}`);
  return r.json();
}

async function put(path, body) {
  const r = await fetch(BASE + path, {
    method: 'PUT',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${path} → ${r.status}: ${await r.text().catch(() => '')}`);
  return r.json();
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FIX: ITHIKA SAJU — INVOICE RECOVERY`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE MODE'}`);
  console.log(`${'='.repeat(60)}\n`);

  // ── 1. Verify Sales Order ──────────────────────────────────────────────────
  console.log(`[1] Verifying Sales Order ${SALES_ORDER_NAME}...`);
  const soData = await get(`/api/resource/Sales Order/${SALES_ORDER_NAME}`);
  const so = soData.data;

  console.log(`  Status:         ${so.status}`);
  console.log(`  Billing Status: ${so.billing_status}`);
  console.log(`  Docstatus:      ${so.docstatus}`);
  console.log(`  Grand Total:    ₹${so.grand_total}`);
  console.log(`  Customer:       ${so.customer}`);
  console.log(`  Company:        ${so.company}`);
  console.log(`  Academic Year:  ${so.custom_academic_year}`);

  if (so.docstatus !== 1) throw new Error(`SO is not submitted (docstatus=${so.docstatus})`);
  if (so.billing_status !== 'Not Billed') {
    console.warn(`  ⚠️  billing_status="${so.billing_status}" — some invoices may already exist!`);
  }

  const soItem = so.items?.[0];
  if (!soItem) throw new Error('SO has no items');
  console.log(`  Item:           ${soItem.item_code} (qty=${soItem.qty}, rate=₹${soItem.rate})`);

  // ── 2. Preview schedule ────────────────────────────────────────────────────
  console.log('\n[2] Instalment Schedule:');
  let scheduleTotal = 0;
  for (const inst of SCHEDULE) {
    console.log(`  ${inst.label}: ₹${inst.amount.toFixed(2)} due ${inst.dueDate}${inst.creditApplied ? ` [demo credit -₹${inst.creditApplied}]` : ''}${inst.dueDate < today ? ' ⚠️ OVERDUE' : ''}`);
    scheduleTotal += inst.amount;
  }
  console.log(`  Total invoices: ₹${scheduleTotal.toFixed(2)}`);
  console.log(`  SO total:       ₹${so.grand_total}`);
  console.log(`  Demo credit:    ₹499.00 (already paid via SAL-ORD-2026-00660)`);
  console.log(`  Fee config:     Tier 1 Advanced 9 State (₹25,000 → 7×₹3,300 + ₹1,900)`);
  console.log(`  Delta note:     SO was averaged (net/8) so ₹0.04 rounding diff is expected`);

  // ── 3. Verify student ──────────────────────────────────────────────────────
  console.log('\n[3] Verifying student...');
  const stuData = await get(`/api/resource/Student/${STUDENT_ID}`);
  const stu = stuData.data;
  console.log(`  Name:    ${stu.student_name}`);
  console.log(`  Branch:  ${stu.custom_branch}`);
  console.log(`  Type:    ${stu.custom_student_type}`);

  // ── 4. Verify PE ───────────────────────────────────────────────────────────
  console.log('\n[4] Verifying Program Enrollment...');
  const peData = await get(`/api/resource/Program Enrollment/${PE_NAME}`);
  const pe = peData.data;
  console.log(`  Program:      ${pe.program}`);
  console.log(`  Enrollment:   ${pe.enrollment_date}`);
  console.log(`  custom_plan:  "${pe.custom_plan}" (should be "Advanced")`);
  console.log(`  instalments:  "${pe.custom_no_of_instalments}" (should be "8")`);

  if (DRY_RUN) {
    console.log('\n✅ DRY RUN complete. No changes made.');
    console.log('   Set DRY_RUN=false to apply the fix.\n');
    return;
  }

  // ── 5. Create invoices ─────────────────────────────────────────────────────
  console.log('\n[5] Creating Sales Invoices...');
  const createdInvoices = [];

  for (let i = 0; i < SCHEDULE.length; i++) {
    const inst = SCHEDULE[i];
    const description = inst.creditApplied
      ? `${inst.label} — ${soItem.item_name} | Demo credit: -₹${inst.creditApplied} (already paid via SAL-ORD-2026-00660; original rate ₹1,900)`
      : `${inst.label} — ${soItem.item_name}`;

    // Use the original due date (even if past) so it shows as correctly overdue.
    // Frappe allows past posting_date. due_date must not be before posting_date,
    // so we set both to the original due date.
    const postDate = inst.dueDate;

    const invoicePayload = {
      doctype: 'Sales Invoice',
      customer: so.customer,
      company: so.company,
      posting_date: postDate,
      due_date: inst.dueDate,
      student: STUDENT_ID,
      custom_academic_year: so.custom_academic_year,
      items: [{
        item_code: soItem.item_code,
        item_name: soItem.item_name,
        description,
        qty: 1,
        rate: inst.amount,
        amount: inst.amount,
        sales_order: SALES_ORDER_NAME,
        so_detail: soItem.name,
      }],
    };

    try {
      const created = await post('/api/resource/Sales Invoice', invoicePayload);
      const invoiceName = created.data?.name;
      console.log(`  ✓ Created draft: ${invoiceName} (₹${inst.amount.toFixed(2)})`);

      // Submit it
      await put(`/api/resource/Sales Invoice/${invoiceName}`, { docstatus: 1 });
      console.log(`  ✓ Submitted:     ${invoiceName}`);
      createdInvoices.push(invoiceName);
    } catch (err) {
      console.error(`  ❌ Failed instalment ${i + 1}: ${err.message}`);
      // Continue with remaining instalments
    }
  }

  // ── 6. Update Program Enrollment ───────────────────────────────────────────
  console.log('\n[6] Updating Program Enrollment...');
  try {
    const peRes = await post('/api/method/frappe.client.set_value', {
      doctype: 'Program Enrollment',
      name: PE_NAME,
      fieldname: {
        custom_plan: 'Advanced',
        custom_no_of_instalments: '8',
        student_category: '',
      },
    });
    console.log(`  ✓ PE updated: custom_plan=Advanced, custom_no_of_instalments=8`);
    console.log(`    Response: ${JSON.stringify(peRes?.message?.name ?? peRes)}`);
  } catch (err) {
    console.error(`  ❌ PE update failed: ${err.message}`);
    console.error('     → Update manually in Frappe: PEN-9th-Fortkochi 26-27-098');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DONE — ${createdInvoices.length} invoices created:`);
  for (const inv of createdInvoices) console.log(`   • ${inv}`);
  console.log(`\nStudent: ${STUDENT_ID} | SO: ${SALES_ORDER_NAME}`);
  console.log(`Check in Frappe: Sales Invoice list filtered by customer=ITHIKA SAJU`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});
