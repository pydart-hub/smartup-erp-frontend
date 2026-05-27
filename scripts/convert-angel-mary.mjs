/**
 * convert-angel-mary.mjs
 *
 * Converts ANGEL MARY MARTIN (STU-SU FKO-26-009) from Advanced OTP to Basic OTP
 * WITHOUT a credit note — clean cancel + recreate approach.
 *
 * Steps:
 *  1. Cancel ACC-PAY-2026-04179  (₹14,300 Cash — cancel newer first)
 *  2. Cancel ACC-PAY-2026-04000  (₹2,000 Cash)
 *  3. Cancel ACC-SINV-2026-02484 (₹22,900 Advanced OTP invoice)
 *  4. Create new invoice ₹16,300 (Basic OTP) linked to SAL-ORD-2026-00194
 *  5. Submit new invoice
 *  6. Re-create PE₁ ₹2,000  Cash Apr-04 → new invoice
 *  7. Re-create PE₂ ₹14,300 Cash Apr-11 → new invoice
 *  8. Cancel + Amend PEN-10th-Fortkochi 26-27-009 → Basic, 1 inst
 *  9. Update SO SAL-ORD-2026-00194 → custom_plan: Basic
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY  = process.argv.includes('--dry-run');

if (DRY) console.log('\n*** DRY RUN — no changes will be made ***\n');

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

// ─── helpers ──────────────────────────────────────────────────────────────────

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

const get  = (path)        => api('GET',  path, null);
const post = (path, body)  => api('POST', path, body);
const put  = (path, body)  => api('PUT',  path, body);

async function cancelDoc(doctype, name) {
  if (DRY) { console.log(`  [DRY] Would cancel ${doctype} / ${name}`); return; }
  const r = await fetch(BASE + '/api/method/frappe.client.cancel', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Cancel ${doctype}/${name} failed: ${text.slice(0, 400)}`);
  console.log(`  ✓ Cancelled ${doctype} / ${name}`);
}

async function setValues(doctype, name, fieldname) {
  if (DRY) { console.log(`  [DRY] Would set_value on ${doctype}/${name}:`, fieldname); return; }
  const r = await fetch(BASE + '/api/method/frappe.client.set_value', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`set_value ${doctype}/${name} failed: ${text.slice(0, 400)}`);
  console.log(`  ✓ Updated ${doctype} / ${name}`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(65));
  console.log('ANGEL MARY MARTIN — Advanced OTP → Basic OTP');
  console.log('='.repeat(65));

  // ── Verify starting state ─────────────────────────────────────────────────
  console.log('\n[VERIFY] Checking starting state...');
  const inv = await get('/api/resource/Sales Invoice/ACC-SINV-2026-02484');
  console.log(`  ACC-SINV-2026-02484: grand_total=${inv.grand_total} | outstanding=${inv.outstanding_amount} | docstatus=${inv.docstatus}`);
  const invAlreadyCancelled = inv.docstatus === 2;

  const pe1 = await get('/api/resource/Payment Entry/ACC-PAY-2026-04000');
  const pe2 = await get('/api/resource/Payment Entry/ACC-PAY-2026-04179');
  console.log(`  ACC-PAY-2026-04000: ₹${pe1.paid_amount} | docstatus=${pe1.docstatus}`);
  console.log(`  ACC-PAY-2026-04179: ₹${pe2.paid_amount} | docstatus=${pe2.docstatus}`);
  if (invAlreadyCancelled) console.log('  ⚠ Invoice already cancelled — skipping steps 1-3.');
  console.log('  ✓ Starting state verified.');

  // ── Step 1 & 2: Cancel payment entries (newer first) ─────────────────────
  if (!invAlreadyCancelled) {
    console.log('\n[STEP 1] Cancelling ACC-PAY-2026-04179 (₹14,300)...');
    if (pe2.docstatus !== 2) await cancelDoc('Payment Entry', 'ACC-PAY-2026-04179');
    else console.log('  Already cancelled, skipping.');

    console.log('\n[STEP 2] Cancelling ACC-PAY-2026-04000 (₹2,000)...');
    if (pe1.docstatus !== 2) await cancelDoc('Payment Entry', 'ACC-PAY-2026-04000');
    else console.log('  Already cancelled, skipping.');

    // ── Step 3: Cancel invoice ────────────────────────────────────────────────
    console.log('\n[STEP 3] Cancelling ACC-SINV-2026-02484 (₹22,900)...');
    await cancelDoc('Sales Invoice', 'ACC-SINV-2026-02484');
  } else {
    console.log('\n[STEP 1-3] Skipped — already cancelled.');
  }

  // ── Step 4 & 5: Create and submit new ₹16,300 Basic OTP invoice ──────────
  console.log('\n[STEP 4-5] Creating new Basic OTP invoice ₹16,300...');
  let newInvName;
  if (DRY) {
    console.log('  [DRY] Would create invoice: 10th State Tuition Fee ₹16,300 | due=2026-04-04 | SO=SAL-ORD-2026-00194');
    newInvName = 'DRY-RUN-INV';
  } else {
    const newInv = await post('/api/resource/Sales Invoice', {
      doctype:    'Sales Invoice',
      customer:   'ANGEL MARY MARTIN',
      company:    'Smart Up Fortkochi',
      student:    'STU-SU FKO-26-009',
      custom_academic_year: '2026-2027',
      posting_date: '2026-05-26',
      due_date:     '2026-05-26',
      disable_rounded_total: 1,
      items: [{
        item_code:    '10th State Tuition Fee',
        item_name:    '10th State Tuition Fee',
        description:  'Basic OTP — 10th State Tuition Fee',
        qty:          1,
        rate:         16300,
        amount:       16300,
        sales_order:  'SAL-ORD-2026-00194',
        so_detail:    'aba677cfuq',
        cost_center:  'Main - SU FKO',
      }],
    });
    newInvName = newInv.name;
    console.log(`  ✓ Created draft invoice: ${newInvName}`);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(newInvName)}`, { docstatus: 1 });
    console.log(`  ✓ Submitted invoice: ${newInvName} | ₹16,300`);
  }

  // ── Step 6: Re-create PE₁ ₹2,000 Cash Apr-04 ─────────────────────────────
  console.log('\n[STEP 6] Re-creating PE₁ ₹2,000 Cash (Apr 4)...');
  if (DRY) {
    console.log('  [DRY] Would create Payment Entry ₹2,000 Cash Apr-04 → new invoice');
  } else {
    const newPE1 = await post('/api/resource/Payment Entry', {
      doctype:        'Payment Entry',
      payment_type:   'Receive',
      party_type:     'Customer',
      party:          'ANGEL MARY MARTIN',
      company:        'Smart Up Fortkochi',
      posting_date:   '2026-04-04',
      mode_of_payment: 'Cash',
      paid_from:      'Debtors - SU FKO',
      paid_to:        'Cash - SU FKO',
      paid_amount:    2000,
      received_amount: 2000,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      reference_no:   'CASH-1775309150927',
      reference_date: '2026-04-04',
      remarks:        'Amount INR 2000.0 received from ANGEL MARY MARTIN\nTransaction reference no CASH-1775309150927 dated 2026-04-04\nAmount INR 2000.0 against Sales Invoice ' + newInvName,
      references: [{
        reference_doctype: 'Sales Invoice',
        reference_name:    newInvName,
        allocated_amount:  2000,
      }],
    });
    console.log(`  ✓ Created PE draft: ${newPE1.name}`);
    await put(`/api/resource/Payment Entry/${encodeURIComponent(newPE1.name)}`, { docstatus: 1 });
    console.log(`  ✓ Submitted PE₁: ${newPE1.name} | ₹2,000`);
  }

  // ── Step 7: Re-create PE₂ ₹14,300 Cash Apr-11 ───────────────────────────
  console.log('\n[STEP 7] Re-creating PE₂ ₹14,300 Cash (Apr 11)...');
  if (DRY) {
    console.log('  [DRY] Would create Payment Entry ₹14,300 Cash Apr-11 → new invoice');
  } else {
    const newPE2 = await post('/api/resource/Payment Entry', {
      doctype:        'Payment Entry',
      payment_type:   'Receive',
      party_type:     'Customer',
      party:          'ANGEL MARY MARTIN',
      company:        'Smart Up Fortkochi',
      posting_date:   '2026-04-11',
      mode_of_payment: 'Cash',
      paid_from:      'Debtors - SU FKO',
      paid_to:        'Cash - SU FKO',
      paid_amount:    14300,
      received_amount: 14300,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      reference_no:   'CASH-1775873891461',
      reference_date: '2026-04-11',
      remarks:        'Amount INR 14300.0 received from ANGEL MARY MARTIN\nTransaction reference no CASH-1775873891461 dated 2026-04-11\nAmount INR 14300.0 against Sales Invoice ' + newInvName,
      references: [{
        reference_doctype: 'Sales Invoice',
        reference_name:    newInvName,
        allocated_amount:  14300,
      }],
    });
    console.log(`  ✓ Created PE draft: ${newPE2.name}`);
    await put(`/api/resource/Payment Entry/${encodeURIComponent(newPE2.name)}`, { docstatus: 1 });
    console.log(`  ✓ Submitted PE₂: ${newPE2.name} | ₹14,300`);
  }

  // ── Step 8: Cancel + Amend Program Enrollment ────────────────────────────
  console.log('\n[STEP 8] Cancel + Amend Program Enrollment → Basic OTP...');
  const PE_NAME = 'PEN-10th-Fortkochi 26-27-009';
  if (DRY) {
    console.log(`  [DRY] Would cancel+amend ${PE_NAME} → Plan: Basic, FS: SU FKO-10th State-Basic-1, instalments: 1`);
  } else {
    await cancelDoc('Program Enrollment', PE_NAME);
    const original = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
    const amendPayload = {
      doctype:               'Program Enrollment',
      amended_from:          PE_NAME,
      student:               original.student,
      student_name:          original.student_name,
      enrollment_date:       original.enrollment_date,
      program:               original.program,
      academic_year:         original.academic_year,
      student_batch_name:    original.student_batch_name,
      custom_student_srr:    original.custom_student_srr,
      custom_program_abb:    original.custom_program_abb,
      custom_plan:              'Basic',
      custom_fee_structure:     'SU FKO-10th State-Basic-1',
      custom_no_of_instalments: '1',
      courses: (original.courses || []).map(c => ({ course: c.course })),
    };
    const newPE = await post('/api/resource/Program Enrollment', amendPayload);
    console.log(`  ✓ Created amended PE: ${newPE.name}`);
    await put(`/api/resource/Program Enrollment/${encodeURIComponent(newPE.name)}`, { docstatus: 1 });
    console.log(`  ✓ Submitted amended PE: ${newPE.name}`);
  }

  // ── Step 9: Update Sales Order ────────────────────────────────────────────
  console.log('\n[STEP 9] Updating Sales Order custom_plan → Basic...');
  try {
    await setValues('Sales Order', 'SAL-ORD-2026-00194', {
      custom_plan: 'Basic',
      custom_no_of_instalments: '1',
    });
  } catch (e) {
    console.log(`  ⚠ SO update failed (non-critical): ${e.message.slice(0, 120)}`);
  }

  // ── Final verification ────────────────────────────────────────────────────
  console.log('\n[VERIFY] Final state...');
  const invParams = new URLSearchParams({
    filters: JSON.stringify([['Sales Invoice Item', 'sales_order', '=', 'SAL-ORD-2026-00194']]),
    fields:  JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'due_date']),
    limit_page_length: '10',
  });
  const finalInvoices = await get('/api/resource/Sales Invoice?' + invParams);
  const list = Array.isArray(finalInvoices) ? finalInvoices : (finalInvoices.data || []);
  console.log('\n  Active invoices for ANGEL MARY MARTIN:');
  let total = 0;
  list.filter(i => i.docstatus !== 2).forEach(i => {
    console.log(`  ${i.name}: ₹${i.grand_total} | outstanding=${i.outstanding_amount} | ${i.status} | due=${i.due_date}`);
    total += i.grand_total;
  });
  console.log(`  Active Total: ₹${total} (expected ₹16,300) ${total === 16300 ? '✅' : '⚠'}`);

  console.log('\n' + '='.repeat(65));
  console.log('✅ ANGEL MARY MARTIN CONVERSION COMPLETE');
  console.log('='.repeat(65));
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
