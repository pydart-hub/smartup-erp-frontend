/**
 * convert-glania-to-basic.mjs
 *
 * Converts GLANIA PHILIP (STU-SU FKO-26-011) from Advanced Quarterly → Basic Quarterly
 *
 * Plan:
 *   - Paid ₹8,300 via Razorpay (Q1 Advanced) → keeps as Q1 paid
 *   - ₹8,300: first fills Basic Q1 (₹5,900), remaining ₹2,400 reduces Q2 (₹4,200 → ₹1,800)
 *
 * Actions:
 *   1. Cancel 3 unpaid invoices (Q2, Q3, Q4)
 *   2. Update Program Enrollment → Basic
 *   3. Update Sales Order custom_plan → Basic
 *   4. Create 3 new Basic installment invoices
 *
 * Run: node scripts/convert-glania-to-basic.mjs --dry-run
 *      node scripts/convert-glania-to-basic.mjs
 */

const BASE  = 'https://smartup.m.frappe.cloud';
const AUTH  = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY   = process.argv.includes('--dry-run');

if (DRY) console.log('\n*** DRY RUN — no changes will be made ***\n');

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

// ─── helpers ──────────────────────────────────────────────────

async function api(method, path, body) {
  const init = { method, headers };
  if (body) init.body = JSON.stringify(body);
  const r = await fetch(BASE + path, init);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!r.ok) {
    const msg = json?._server_messages || json?.message || text.slice(0, 400);
    throw new Error(`${method} ${path} → ${r.status}: ${msg}`);
  }
  return json.data ?? json;
}

const get  = (path)       => api('GET',   path, null);
const post = (path, body) => api('POST',  path, body);
const put  = (path, body) => api('PUT',   path, body);

async function cancelInvoice(name) {
  if (DRY) { console.log(`  [DRY] Would cancel ${name}`); return; }
  const r = await fetch(BASE + '/api/method/frappe.client.cancel', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype: 'Sales Invoice', name }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Cancel ${name} failed: ${text.slice(0, 300)}`);
  console.log(`  ✓ Cancelled ${name}`);
}

async function setValues(doctype, name, fieldname) {
  if (DRY) {
    console.log(`  [DRY] Would set_value on ${doctype}/${name}:`, fieldname);
    return;
  }
  const r = await fetch(BASE + '/api/method/frappe.client.set_value', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`set_value ${doctype}/${name} failed: ${text.slice(0, 300)}`);
  console.log(`  ✓ Updated ${doctype}/${name}:`, fieldname);
}

async function createAndSubmitInvoice({ customer, company, student, posting_date, due_date, description, amount, sales_order, so_detail, label }) {
  if (DRY) {
    console.log(`  [DRY] Would create invoice: ${label} ₹${amount} | due=${due_date} | ref=${sales_order}`);
    return;
  }
  const payload = {
    doctype: 'Sales Invoice',
    customer,
    company,
    student,
    custom_academic_year: '2026-2027',
    posting_date,
    due_date,
    disable_rounded_total: 1,
    items: [{
      item_code: '10th State Tuition Fee',
      item_name: '10th State Tuition Fee',
      description,
      qty: 1,
      rate: amount,
      amount,
      sales_order,
      so_detail,
      cost_center: 'Main - SU FKO',
    }],
  };
  const inv = await post('/api/resource/Sales Invoice', payload);
  // Submit (docstatus → 1)
  await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
  console.log(`  ✓ Created & submitted: ${inv.name} | ${label} ₹${amount} | due=${due_date}`);
  return inv.name;
}

// ─── main ────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(65));
  console.log('CONVERT GLANIA PHILIP: Advanced Quarterly → Basic Quarterly');
  console.log('='.repeat(65));

  // ── Verify current state ─────────────────────────────────────
  console.log('\n[STEP 0] Verifying current state...');

  const pen = await get('/api/resource/Program Enrollment/PEN-10th-Fortkochi%2026-27-011');
  console.log(`  Program Enrollment: plan=${pen.custom_plan} | fs=${pen.custom_fee_structure}`);
  if (pen.custom_plan !== 'Advanced') {
    throw new Error(`Expected plan=Advanced, got ${pen.custom_plan}. Abort.`);
  }

  const [inv1, inv2, inv3, inv4] = await Promise.all([
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02507'),
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02508'),
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02509'),
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02510'),
  ]);

  console.log(`  Q1 ACC-SINV-2026-02507: ₹${inv1.grand_total} | ${inv1.status} — must be Paid`);
  console.log(`  Q2 ACC-SINV-2026-02508: ₹${inv2.grand_total} | ${inv2.status} — must be Unpaid`);
  console.log(`  Q3 ACC-SINV-2026-02509: ₹${inv3.grand_total} | ${inv3.status} — must be Unpaid`);
  console.log(`  Q4 ACC-SINV-2026-02510: ₹${inv4.grand_total} | ${inv4.status} — must be Unpaid`);

  if (inv1.status !== 'Paid')   throw new Error('Q1 is not Paid — abort.');
  if (inv2.status !== 'Unpaid') throw new Error('Q2 is not Unpaid — abort.');
  if (inv3.status !== 'Unpaid') throw new Error('Q3 is not Unpaid — abort.');
  if (inv4.status !== 'Unpaid') throw new Error('Q4 is not Unpaid — abort.');

  console.log('  ✓ State verified. Safe to proceed.');

  // ── Step 1: Cancel Q2, Q3, Q4 ────────────────────────────────
  console.log('\n[STEP 1] Cancelling 3 unpaid invoices (Q2, Q3, Q4)...');
  await cancelInvoice('ACC-SINV-2026-02508');
  await cancelInvoice('ACC-SINV-2026-02509');
  await cancelInvoice('ACC-SINV-2026-02510');

  // ── Step 2: Update Program Enrollment ────────────────────────
  console.log('\n[STEP 2] Updating Program Enrollment → Basic...');
  await setValues('Program Enrollment', 'PEN-10th-Fortkochi 26-27-011', {
    custom_plan: 'Basic',
    custom_fee_structure: 'SU FKO-10th State-Basic-4',
    custom_no_of_instalments: '4',
  });

  // ── Step 3: Update Sales Order custom_plan ───────────────────
  console.log('\n[STEP 3] Updating Sales Order custom_plan → Basic...');
  await setValues('Sales Order', 'SAL-ORD-2026-00199', {
    custom_plan: 'Basic',
    custom_no_of_instalments: '4',
  });

  // ── Step 4: Create new Basic installment invoices ────────────
  console.log('\n[STEP 4] Creating new Basic installment invoices...');

  // Q2: ₹1,800  (Basic Q2 ₹4,200 − ₹2,400 excess from Q1)
  await createAndSubmitInvoice({
    customer:     'GLANIA PHILIP',
    company:      'Smart Up Fortkochi',
    student:      'STU-SU FKO-26-011',
    posting_date: '2026-05-26',
    due_date:     '2026-07-15',
    description:  'Q2 \u2014 10th State Tuition Fee',
    amount:       1800,
    sales_order:  'SAL-ORD-2026-00199',
    so_detail:    'd64m71ivoj',
    label:        'Q2',
  });

  // Q3: ₹4,200 (standard Basic Q3)
  await createAndSubmitInvoice({
    customer:     'GLANIA PHILIP',
    company:      'Smart Up Fortkochi',
    student:      'STU-SU FKO-26-011',
    posting_date: '2026-05-26',
    due_date:     '2026-10-15',
    description:  'Q3 \u2014 10th State Tuition Fee',
    amount:       4200,
    sales_order:  'SAL-ORD-2026-00199',
    so_detail:    'd64m71ivoj',
    label:        'Q3',
  });

  // Q4: ₹2,600 (standard Basic Q4)
  await createAndSubmitInvoice({
    customer:     'GLANIA PHILIP',
    company:      'Smart Up Fortkochi',
    student:      'STU-SU FKO-26-011',
    posting_date: '2026-05-26',
    due_date:     '2027-01-15',
    description:  'Q4 \u2014 10th State Tuition Fee',
    amount:       2600,
    sales_order:  'SAL-ORD-2026-00199',
    so_detail:    'd64m71ivoj',
    label:        'Q4',
  });

  // ── Final summary ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('CONVERSION COMPLETE');
  console.log('='.repeat(65));
  console.log('\nFinal invoice structure for GLANIA PHILIP:');
  console.log('  Q1  ACC-SINV-2026-02507  ₹8,300  PAID   (existing, kept)');
  console.log('  Q2  (new)               ₹1,800  Unpaid  due 2026-07-15');
  console.log('  Q3  (new)               ₹4,200  Unpaid  due 2026-10-15');
  console.log('  Q4  (new)               ₹2,600  Unpaid  due 2027-01-15');
  console.log('  ─────────────────────────────────────────');
  console.log('  Total:                  ₹16,900  (Basic Quarterly)');
  console.log('  Paid:                   ₹8,300');
  console.log('  Remaining:              ₹8,600');
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
