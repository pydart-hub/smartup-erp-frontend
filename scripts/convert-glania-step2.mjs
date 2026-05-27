/**
 * convert-glania-step2.mjs
 *
 * Continues from where convert-glania-to-basic.mjs stopped:
 *   Q2/Q3/Q4 invoices already cancelled ✓
 *   Program Enrollment needs cancel+amend to update fee_structure
 *   Then create 3 new Basic invoices
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
  let json; try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!r.ok) {
    const msg = json?._server_messages || json?.message || text.slice(0, 500);
    throw new Error(`${method} ${path} → ${r.status}: ${msg}`);
  }
  return json.data ?? json;
}

const get  = (path)       => api('GET',   path, null);
const post = (path, body) => api('POST',  path, body);
const put  = (path, body) => api('PUT',   path, body);

async function setValues(doctype, name, fieldname) {
  if (DRY) { console.log(`  [DRY] Would set_value on ${doctype}/${name}:`, fieldname); return; }
  const r = await fetch(BASE + '/api/method/frappe.client.set_value', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`set_value ${doctype}/${name} failed: ${text.slice(0, 400)}`);
  const j = JSON.parse(text);
  console.log(`  ✓ Updated ${doctype}/${name}`);
  return j.message;
}

async function cancelDoc(doctype, name) {
  if (DRY) { console.log(`  [DRY] Would cancel ${doctype}/${name}`); return; }
  const r = await fetch(BASE + '/api/method/frappe.client.cancel', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Cancel ${doctype}/${name} failed: ${text.slice(0, 400)}`);
  console.log(`  ✓ Cancelled ${doctype}/${name}`);
}

async function amendAndResubmitPE(name, updates) {
  // Frappe amendment: copy doc, set amended_from, update fields, save, submit
  if (DRY) {
    console.log(`  [DRY] Would cancel+amend PE ${name} with:`, updates);
    return;
  }

  // 1. Cancel the original PE
  await cancelDoc('Program Enrollment', name);

  // 2. Fetch the cancelled doc to use as amendment base
  const original = await get(`/api/resource/Program Enrollment/${encodeURIComponent(name)}`);
  const d = original;

  // 3. Build amendment payload
  const amendPayload = {
    doctype: 'Program Enrollment',
    amended_from: name,
    student: d.student,
    student_name: d.student_name,
    enrollment_date: d.enrollment_date,
    program: d.program,
    academic_year: d.academic_year,
    student_batch_name: d.student_batch_name,
    custom_student_srr: d.custom_student_srr,
    custom_program_abb: d.custom_program_abb,
    // Updated fields:
    custom_plan: updates.custom_plan,
    custom_fee_structure: updates.custom_fee_structure,
    custom_no_of_instalments: updates.custom_no_of_instalments,
    // Copy courses
    courses: (d.courses || []).map(c => ({ course: c.course })),
  };

  // 4. Save the new amended PE (draft)
  const newPE = await post('/api/resource/Program Enrollment', amendPayload);
  console.log(`  ✓ Created amended PE: ${newPE.name}`);

  // 5. Submit the amended PE
  await put(`/api/resource/Program Enrollment/${encodeURIComponent(newPE.name)}`, { docstatus: 1 });
  console.log(`  ✓ Submitted amended PE: ${newPE.name}`);

  return newPE.name;
}

async function createAndSubmitInvoice({ customer, company, student, posting_date, due_date, description, amount, sales_order, so_detail, label }) {
  if (DRY) {
    console.log(`  [DRY] Would create invoice: ${label} ₹${amount} | due=${due_date}`);
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
  await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
  console.log(`  ✓ Created & submitted: ${inv.name} | ${label} ₹${amount} | due=${due_date}`);
  return inv.name;
}

// ─── main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(65));
  console.log('GLANIA PHILIP - Step 2: PE update + New invoices');
  console.log('='.repeat(65));

  // ── Verify invoices already cancelled ────────────────────────
  console.log('\n[VERIFY] Checking cancelled invoices...');
  const [inv2, inv3, inv4] = await Promise.all([
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02508'),
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02509'),
    get('/api/resource/Sales Invoice/ACC-SINV-2026-02510'),
  ]);
  const cancelledOK = [inv2, inv3, inv4].every(i => i.docstatus === 2);
  console.log(`  ACC-SINV-2026-02508: docstatus=${inv2.docstatus} (2=cancelled)`);
  console.log(`  ACC-SINV-2026-02509: docstatus=${inv3.docstatus}`);
  console.log(`  ACC-SINV-2026-02510: docstatus=${inv4.docstatus}`);
  if (!cancelledOK) throw new Error('Invoices not all cancelled — check manually.');
  console.log('  ✓ All 3 invoices confirmed cancelled.');

  // ── Step 2: Cancel + Amend Program Enrollment ────────────────
  console.log('\n[STEP 2] Cancel + Amend Program Enrollment → Basic...');
  await amendAndResubmitPE('PEN-10th-Fortkochi 26-27-011', {
    custom_plan: 'Basic',
    custom_fee_structure: 'SU FKO-10th State-Basic-4',
    custom_no_of_instalments: '4',
  });

  // ── Step 3: Update Sales Order custom_plan ───────────────────
  console.log('\n[STEP 3] Updating Sales Order custom_plan → Basic...');
  try {
    await setValues('Sales Order', 'SAL-ORD-2026-00199', {
      custom_plan: 'Basic',
      custom_no_of_instalments: '4',
    });
  } catch (e) {
    console.log(`  ⚠ SO update failed (non-critical): ${e.message.slice(0, 120)}`);
  }

  // ── Step 4: Create 3 new Basic installment invoices ──────────
  console.log('\n[STEP 4] Creating new Basic installment invoices...');

  const newQ2 = await createAndSubmitInvoice({
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

  const newQ3 = await createAndSubmitInvoice({
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

  const newQ4 = await createAndSubmitInvoice({
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

  // ── Final verification ────────────────────────────────────────
  console.log('\n[VERIFY] Final state check...');
  const finalInvoices = await get(`/api/resource/Sales Invoice?filters=[["customer","=","GLANIA PHILIP"],["docstatus","!=","2"]]&fields=["name","grand_total","outstanding_amount","status","due_date"]&limit=20`);
  console.log('\n  Active invoices for GLANIA PHILIP:');
  let total = 0;
  (finalInvoices.data || []).forEach(i => {
    console.log(`  ${i.name}: ₹${i.grand_total} | ${i.status} | due=${i.due_date}`);
    total += i.grand_total;
  });
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Grand Total: ₹${total} (expected ₹16,900)`);
  if (total === 16900) {
    console.log('  ✓ Total matches Basic plan perfectly!');
  } else {
    console.log(`  ⚠ Total mismatch — expected 16900, got ${total}`);
  }

  console.log('\n' + '='.repeat(65));
  console.log('✅ GLANIA PHILIP CONVERSION COMPLETE');
  console.log('='.repeat(65));
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
