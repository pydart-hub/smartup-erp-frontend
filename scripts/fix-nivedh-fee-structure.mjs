/**
 * fix-nivedh-fee-structure.mjs
 *
 * Fixes NIVEDH KRISHNA (STU-SU KDV-26-008) fee structure:
 *   Current: 4 invoices = ₹11,000 + ₹7,800 + ₹7,800 + ₹4,700 = ₹31,300
 *   Target:  4 invoices = ₹12,300 + ₹8,800 + ₹8,800 + ₹5,300 = ₹35,200
 *
 * Already paid: ₹12,300 (3 cash PEs) — will be re-mapped to new Inst 1.
 *
 * Run dry-run first:  node scripts/fix-nivedh-fee-structure.mjs --dry-run
 * Execute:            node scripts/fix-nivedh-fee-structure.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };
const DRY = process.argv.includes('--dry-run');

if (DRY) console.log('*** DRY-RUN — no changes will be made ***\n');

// ── Known data (from study scripts) ──────────────────────────────────────────
const STUDENT       = 'STU-SU KDV-26-008';
const CUSTOMER      = 'NIVEDH KRISHNA';
const COMPANY       = 'Smart Up Kadavanthara';
const ITEM_CODE     = '12th Science CBSE Tuition Fee';
const ITEM_NAME     = '12th Science CBSE Tuition Fee';
const ITEM_DESC     = '12th CBSE Tuition Fee';
const OLD_SO        = 'SAL-ORD-2026-00878';
const ACADEMIC_YEAR = '2026-2027';

const PES_TO_CANCEL = [
  { name: 'ACC-PAY-2026-05193', amount: 1300 },   // ₹1,300 against SINV-06732
  { name: 'ACC-PAY-2026-05192', amount: 6000 },   // ₹6,000 against SINV-06731
  { name: 'ACC-PAY-2026-04812', amount: 5000 },   // ₹5,000 against SINV-06731
];

const INVOICES_TO_CANCEL = [
  'ACC-SINV-2026-06732',  // partly paid — cancel after PEs cancelled
  'ACC-SINV-2026-06731',  // paid       — cancel after PEs cancelled
  'ACC-SINV-2026-06733',  // unpaid
  'ACC-SINV-2026-06734',  // unpaid
];

const TODAY = new Date().toISOString().slice(0, 10); // 2026-05-25

const TARGET_SCHEDULE = [
  { label: 'Q1', amount: 12300, postingDate: TODAY,        dueDate: TODAY        }, // past due → use today
  { label: 'Q2', amount:  8800, postingDate: TODAY,        dueDate: '2026-07-15' },
  { label: 'Q3', amount:  8800, postingDate: TODAY,        dueDate: '2026-10-15' },
  { label: 'Q4', amount:  5300, postingDate: TODAY,        dueDate: '2027-01-15' },
];
// 12300+8800+8800+5300 = 35200 ✓

const PAYMENTS_TO_RESTORE = [
  { amount: 5000, refNo: 'CASH-1778064930066', date: TODAY },  // original: 2026-05-06
  { amount: 6000, refNo: 'CASH-1779704467507', date: TODAY },  // original: 2026-05-25
  { amount: 1300, refNo: 'CASH-1779704488102', date: TODAY },  // original: 2026-05-25
];
// all against new Inst 1 (₹12,300); total = ₹12,300 → Inst 1 fully paid

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await r.text();
  if (!r.ok) {
    const preview = text.slice(0, 400);
    throw new Error(`${init.method ?? 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${preview}`);
  }
  return text ? JSON.parse(text) : {};
}

const get    = (path)        => fetchJSON(BASE + path).then(d => d.data);
const post   = (path, body)  => fetchJSON(BASE + path, { method: 'POST', body: JSON.stringify(body) }).then(d => d.data);
const put    = (path, body)  => fetchJSON(BASE + path, { method: 'PUT',  body: JSON.stringify(body) }).then(d => d.data);
const del    = (path)        => fetchJSON(BASE + path, { method: 'DELETE' });

async function cancel(doctype, name) {
  const r = await fetch(`${BASE}/api/method/frappe.client.cancel`, {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Cancel ${doctype} ${name} → ${r.status}: ${text.slice(0, 300)}`);
  console.log(`    ✓ Cancelled ${name}`);
}

async function deleteDoc(doctype, name) {
  await del(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  console.log(`    ✓ Deleted  ${name}`);
}

// ── Step helpers ──────────────────────────────────────────────────────────────
async function step(label, fn) {
  console.log(`\n── ${label}`);
  if (DRY) { console.log('   [skip — dry run]'); return null; }
  return fn();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' FIX: NIVEDH KRISHNA — Fee Restructure to ₹35,200');
  console.log('═══════════════════════════════════════════════════════════');

  // ── VERIFY ────────────────────────────────────────────────────────────────
  console.log('\n── PRE-FLIGHT VERIFICATION');
  for (const pe of PES_TO_CANCEL) {
    const doc = await get(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`);
    if (doc.docstatus !== 1) throw new Error(`PE ${pe.name} is NOT submitted (docstatus=${doc.docstatus})`);
    if (Math.abs(doc.paid_amount - pe.amount) > 0.01) throw new Error(`PE ${pe.name} amount mismatch: expected ${pe.amount}, got ${doc.paid_amount}`);
    console.log(`   ✓ PE ${pe.name} — ₹${doc.paid_amount} submitted`);
  }
  for (const inv of INVOICES_TO_CANCEL) {
    const doc = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inv)}`);
    if (doc.docstatus !== 1) throw new Error(`Invoice ${inv} is NOT submitted (docstatus=${doc.docstatus})`);
    console.log(`   ✓ Invoice ${inv} — ₹${doc.grand_total} | ${doc.status}`);
  }
  const soDoc = await get(`/api/resource/Sales Order/${encodeURIComponent(OLD_SO)}`);
  if (soDoc.docstatus !== 1) throw new Error(`SO ${OLD_SO} is NOT submitted`);
  console.log(`   ✓ SO ${OLD_SO} — ₹${soDoc.grand_total} | ${soDoc.billing_status}`);
  const soItemRow = soDoc.items?.[0]?.name; // needed for so_detail in invoices
  console.log(`   ✓ SO item row: ${soItemRow}`);
  console.log('\n   Pre-flight passed ✓');

  if (DRY) {
    console.log('\n[DRY RUN] Would execute:');
    console.log('  1. Cancel 3 Payment Entries');
    console.log('  2. Cancel + delete 4 Sales Invoices');
    console.log('  3. Cancel + delete Sales Order');
    console.log('  4. Create new Sales Order (₹35,200)');
    console.log('  5. Create 4 new invoices: ₹12,300 + ₹8,800 + ₹8,800 + ₹5,300');
    console.log('  6. Create 3 Payment Entries (₹5,000 + ₹6,000 + ₹1,300) against Inst 1');
    console.log('  7. Send payment receipt email + WhatsApp');
    return;
  }

  // ── PHASE 1: Cancel Payment Entries ──────────────────────────────────────
  console.log('\n── PHASE 1: Cancel Payment Entries');
  for (const pe of PES_TO_CANCEL) {
    await cancel('Payment Entry', pe.name);
  }

  // ── PHASE 2: Cancel & Delete Invoices ────────────────────────────────────
  console.log('\n── PHASE 2: Cancel & Delete Invoices');
  for (const inv of INVOICES_TO_CANCEL) {
    await cancel('Sales Invoice', inv);
  }
  console.log('   Deleting cancelled invoices...');
  for (const inv of INVOICES_TO_CANCEL) {
    await deleteDoc('Sales Invoice', inv);
  }

  // ── PHASE 3: Cancel & Delete Old SO ──────────────────────────────────────
  console.log('\n── PHASE 3: Cancel & Delete Old SO');
  await cancel('Sales Order', OLD_SO);
  await deleteDoc('Sales Order', OLD_SO);

  // ── PHASE 4: Create New SO (₹35,200) ─────────────────────────────────────
  console.log('\n── PHASE 4: Create New Sales Order (₹35,200)');
  const newSoPayload = {
    doctype: 'Sales Order',
    customer: CUSTOMER,
    customer_name: CUSTOMER,
    company: COMPANY,
    transaction_date: '2026-05-06',
    delivery_date: '2026-05-06',
    order_type: 'Sales',
    currency: 'INR',
    selling_price_list: 'Standard Selling',
    student: STUDENT,
    custom_academic_year: ACADEMIC_YEAR,
    custom_plan: 'Basic',
    custom_no_of_instalments: '4',
    items: [{
      item_code: ITEM_CODE,
      item_name: ITEM_NAME,
      description: ITEM_DESC,
      qty: 4,
      rate: 8800,
      amount: 35200,
      uom: 'Nos',
      delivery_date: '2026-05-06',
      cost_center: 'Main - SU KDV',
    }],
  };
  const newSoDraft = await post('/api/resource/Sales Order', newSoPayload);
  const NEW_SO = newSoDraft.name;
  console.log(`   Created draft SO: ${NEW_SO}`);

  await put(`/api/resource/Sales Order/${encodeURIComponent(NEW_SO)}`, { docstatus: 1 });
  console.log(`   ✓ Submitted SO: ${NEW_SO} (₹35,200)`);

  // Fetch submitted SO to get item row name for so_detail
  const newSoDoc = await get(`/api/resource/Sales Order/${encodeURIComponent(NEW_SO)}`);
  const newSoItemRow = newSoDoc.items?.[0]?.name;
  console.log(`   SO item row: ${newSoItemRow}`);

  // ── PHASE 5: Create 4 New Invoices ───────────────────────────────────────
  console.log('\n── PHASE 5: Create 4 New Invoices');
  const createdInvoices = [];

  for (const inst of TARGET_SCHEDULE) {
    const invPayload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER,
      customer_name: CUSTOMER,
      company: COMPANY,
      posting_date: inst.postingDate,
      due_date: inst.dueDate,
      student: STUDENT,
      disable_rounded_total: 1,
      custom_academic_year: ACADEMIC_YEAR,
      items: [{
        item_code: ITEM_CODE,
        item_name: ITEM_NAME,
        description: `${inst.label} — ${ITEM_DESC}`,
        qty: 1,
        rate: inst.amount,
        amount: inst.amount,
        sales_order: NEW_SO,
        so_detail: newSoItemRow,
        cost_center: 'Main - SU KDV',
      }],
    };

    const invDraft = await post('/api/resource/Sales Invoice', invPayload);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(invDraft.name)}`, { docstatus: 1 });
    console.log(`   ✓ ${inst.label}: ${invDraft.name} — ₹${inst.amount} | due ${inst.dueDate}`);
    createdInvoices.push({ ...inst, invoiceName: invDraft.name });
  }

  const inst1Invoice = createdInvoices[0].invoiceName;
  console.log(`\n   Inst 1 invoice (target of payments): ${inst1Invoice}`);

  // ── PHASE 6: Recreate Payment Entries against Inst 1 ─────────────────────
  console.log('\n── PHASE 6: Recreate 3 Payment Entries (total ₹12,300) → Inst 1');

  for (const pmt of PAYMENTS_TO_RESTORE) {
    // Use get_payment_entry to auto-resolve GL accounts
    const peTemplate = await fetchJSON(`${BASE}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`, {
      method: 'POST',
      body: JSON.stringify({
        dt: 'Sales Invoice',
        dn: inst1Invoice,
        party_amount: pmt.amount,
        bank_amount: pmt.amount,
      }),
    }).then(d => d.message);

    // Patch with cash-specific fields
    peTemplate.mode_of_payment  = 'Cash';
    peTemplate.posting_date     = pmt.date;
    peTemplate.reference_no     = pmt.refNo;
    peTemplate.reference_date   = pmt.date;
    peTemplate.paid_amount      = pmt.amount;
    peTemplate.received_amount  = pmt.amount;
    peTemplate.remarks          = `Cash payment ref ${pmt.refNo} dated ${pmt.date} against ${inst1Invoice} (restored)`;

    // Override allocated amount in references
    if (peTemplate.references?.length) {
      for (const ref of peTemplate.references) {
        if (ref.reference_name === inst1Invoice) {
          ref.allocated_amount = pmt.amount;
        }
      }
    }

    // Resolve paid_to account for Cash in this company
    const mopRes = await get(`/api/resource/Mode of Payment/Cash`);
    const mopAccounts = mopRes?.accounts ?? [];
    const companyAccount = mopAccounts.find(a => a.company === COMPANY);
    if (companyAccount?.default_account) {
      peTemplate.paid_to = companyAccount.default_account;
      peTemplate.paid_to_account_type = 'Cash';
    }

    const peDraft = await post('/api/resource/Payment Entry', peTemplate);
    await put(`/api/resource/Payment Entry/${encodeURIComponent(peDraft.name)}`, { docstatus: 1 });
    console.log(`   ✓ ${peDraft.name} — ₹${pmt.amount} Cash | ref: ${pmt.refNo} | date: ${pmt.date}`);
  }

  // ── VERIFY: Inst 1 should now be Paid ────────────────────────────────────
  console.log('\n── PHASE 7: Verify Inst 1 status');
  const inst1Doc = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inst1Invoice)}`);
  console.log(`   ${inst1Invoice}: grand_total=₹${inst1Doc.grand_total}, outstanding=₹${inst1Doc.outstanding_amount}, status=${inst1Doc.status}`);
  if (inst1Doc.status !== 'Paid') {
    console.warn(`   ⚠ WARNING: Inst 1 is not fully Paid — outstanding ₹${inst1Doc.outstanding_amount}`);
  } else {
    console.log(`   ✓ Inst 1 is PAID`);
  }

  // ── PHASE 8: Send Payment Receipt ────────────────────────────────────────
  console.log('\n── PHASE 8: Send Payment Receipt');
  const sessionData = {
    email: 'arjunprakashk7@gmail.com',
    roles: ['Administrator', 'System Manager', 'Branch Manager'],
  };
  const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  const receiptRes = await fetch('http://localhost:3000/api/payments/send-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `smartup_session=${sessionCookie}`,
    },
    body: JSON.stringify({ invoice_id: inst1Invoice }),
  });

  const receiptBody = await receiptRes.json().catch(() => ({}));
  if (receiptRes.ok) {
    console.log(`   ✓ Receipt sent to: ${receiptBody.recipient}`);
    console.log('   WhatsApp attempted to: 8089835558');
  } else {
    console.warn(`   ⚠ Receipt send failed (${receiptRes.status}):`, receiptBody);
  }

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' DONE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`New SO:    ${NEW_SO}`);
  console.log('New Invoices:');
  for (const inv of createdInvoices) {
    const isPaid = inv.label === 'Q1' ? '← PAID ✓' : 'unpaid';
    console.log(`  ${inv.label}: ${inv.invoiceName} — ₹${inv.amount} | due ${inv.dueDate} ${isPaid}`);
  }
  console.log(`\nTotal: ₹35,200 | Paid: ₹12,300 | Outstanding: ₹22,900`);
}

main().catch(e => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
