/**
 * Convert Ayra Rahmath — Advanced Quarterly → Basic Quarterly (4 instalments)
 * Student:  STU-SU FKO-26-002
 * SO:       SAL-ORD-2026-00108  (grand_total=₹23,700)
 * PE:       PEN-9th-Fortkochi 26-27-002
 *
 * Plan:
 *  - KEEP Q1 invoice ACC-SINV-2026-01896 (₹8,300 PAID) — untouched
 *  - KEEP payment ACC-PAY-2026-03911 (₹8,300 Razorpay) — untouched
 *  - Cancel Q2/Q3/Q4 unpaid invoices
 *  - Create 3 new Basic quarterly invoices: ₹1,800 / ₹4,200 / ₹2,600
 *  - Cancel+Amend Program Enrollment → Basic, SU FKO-9th State-Basic-4
 *  - Update SO custom_plan → Basic
 */

const BASE  = 'https://smartup.m.frappe.cloud';
const AUTH  = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY   = process.argv.includes('--dry-run');

if (DRY) console.log('\n*** DRY RUN — no changes will be made ***\n');

// ── helpers ────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(j.exception ?? j._server_messages ?? j)}`);
  return j.data ?? j.message ?? j;
}
const get    = (p)       => api('GET',  p);
const post   = (p, b)    => api('POST', p, b);
const put    = (p, b)    => api('PUT',  p, b);

async function cancelDoc(doctype, name) {
  if (DRY) { console.log(`  [DRY] Would cancel ${doctype} / ${name}`); return; }
  await post('/api/method/frappe.client.cancel', { doctype, name });
  console.log(`  ✓ Cancelled ${doctype} / ${name}`);
}

async function submitDoc(doctype, name) {
  if (DRY) { console.log(`  [DRY] Would submit ${doctype} / ${name}`); return name; }
  await put(`/api/resource/${doctype}/${encodeURIComponent(name)}`, { docstatus: 1 });
  console.log(`  ✓ Submitted ${doctype} / ${name}`);
  return name;
}

// ── constants ──────────────────────────────────────────────────────────────
const CUSTOMER   = 'AYRA RAHMATH';
const SO         = 'SAL-ORD-2026-00108';
const SO_ROW     = '7v0jru19k0';
const PE_NAME    = 'PEN-9th-Fortkochi 26-27-002';
const COMPANY    = 'Smart Up Fortkochi';
const COST_CTR   = 'Main - SU FKO';
const DEBTORS    = 'Debtors - SU FKO';
const ITEM_CODE  = '9th State Tuition Fee';
const FS_BASIC   = 'SU FKO-9th State-Basic-4';
const TODAY      = '2026-05-26';

// Q2/Q3/Q4 to cancel
const CANCEL_INVOICES = [
  { name: 'ACC-SINV-2026-01897', amount: 5900, label: 'Q2' },
  { name: 'ACC-SINV-2026-01898', amount: 5900, label: 'Q3' },
  { name: 'ACC-SINV-2026-01899', amount: 3600, label: 'Q4' },
];

// New Basic quarterly invoices
const NEW_INVOICES = [
  { amount: 1800, due: '2026-07-15', label: 'Q2' },
  { amount: 4200, due: '2026-10-15', label: 'Q3' },
  { amount: 2600, due: '2027-01-15', label: 'Q4' },
];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=================================================================');
  console.log('AYRA RAHMATH — Advanced Quarterly → Basic Quarterly');
  console.log('=================================================================\n');

  // ── Verify starting state ────────────────────────────────────────────────
  console.log('[VERIFY] Checking starting state...');
  const q1 = await get('/api/resource/Sales Invoice/ACC-SINV-2026-01896');
  console.log(`  ACC-SINV-2026-01896 (Q1): ₹${q1.grand_total} | outstanding=₹${q1.outstanding_amount} | status=${q1.status} | docstatus=${q1.docstatus}`);
  if (q1.outstanding_amount !== 0) console.warn('  ⚠ Q1 is NOT fully paid — double-check!');

  for (const inv of CANCEL_INVOICES) {
    const doc = await get(`/api/resource/Sales Invoice/${inv.name}`);
    console.log(`  ${inv.name} (${inv.label}): ₹${doc.grand_total} | outstanding=₹${doc.outstanding_amount} | docstatus=${doc.docstatus}`);
    if (!DRY && doc.docstatus === 2) {
      console.log(`  ⚠ ${inv.name} already cancelled, skipping.`);
      inv.alreadyCancelled = true;
    }
  }

  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  console.log(`  PE: ${pe.name} | plan=${pe.custom_plan} | fs=${pe.custom_fee_structure} | docstatus=${pe.docstatus}`);
  console.log('  ✓ Starting state verified.\n');

  // ── Steps 1-3: Cancel Q2/Q3/Q4 invoices ──────────────────────────────────
  for (let i = 0; i < CANCEL_INVOICES.length; i++) {
    const inv = CANCEL_INVOICES[i];
    console.log(`[STEP ${i + 1}] Cancelling ${inv.name} (${inv.label} ₹${inv.amount.toLocaleString()})...`);
    if (inv.alreadyCancelled) { console.log('  Already cancelled, skipping.'); continue; }
    if (DRY) { console.log(`  [DRY] Would cancel Sales Invoice / ${inv.name}`); continue; }
    // Re-check live status in case partially complete from prior run
    const live = await get(`/api/resource/Sales Invoice/${inv.name}`);
    if (live.docstatus === 2) { console.log('  Already cancelled, skipping.'); continue; }
    await cancelDoc('Sales Invoice', inv.name);
  }

  // ── Steps 4-6: Create new Basic quarterly invoices ────────────────────────
  const createdInvoices = [];
  for (let i = 0; i < NEW_INVOICES.length; i++) {
    const inv = NEW_INVOICES[i];
    const stepNum = i + 4;
    console.log(`\n[STEP ${stepNum}] Creating new ${inv.label} invoice ₹${inv.amount.toLocaleString()} (due ${inv.due})...`);

    if (DRY) {
      console.log(`  [DRY] Would create invoice: ${ITEM_CODE} ₹${inv.amount} | due=${inv.due} | SO=${SO}`);
      continue;
    }

    const payload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: TODAY,
      due_date: inv.due,
      cost_center: COST_CTR,
      debit_to: DEBTORS,
      custom_academic_year: '2026-2027',
      selling_price_list: 'Standard Selling',
      currency: 'INR',
      items: [{
        item_code: ITEM_CODE,
        qty: 1,
        rate: inv.amount,
        amount: inv.amount,
        sales_order: SO,
        so_detail: SO_ROW,
        cost_center: COST_CTR,
      }],
    };

    const draft = await post('/api/resource/Sales Invoice', payload);
    console.log(`  ✓ Created draft invoice: ${draft.name}`);
    await submitDoc('Sales Invoice', draft.name);
    createdInvoices.push({ name: draft.name, amount: inv.amount, due: inv.due, label: inv.label });
  }

  // ── Step 7: Cancel + Amend Program Enrollment → Basic ────────────────────
  console.log(`\n[STEP 7] Cancel + Amend Program Enrollment → Basic Quarterly...`);
  if (DRY) {
    console.log(`  [DRY] Would cancel+amend ${PE_NAME} → Plan: Basic, FS: ${FS_BASIC}, instalments: 4`);
  } else {
    // Re-check PE status in case it was already cancelled in a prior run
    const peDoc = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
    if (peDoc.docstatus !== 2) {
      await cancelDoc('Program Enrollment', PE_NAME);
    } else {
      console.log('  PE already cancelled, skipping cancel step.');
    }

    // Check if an amended copy already exists
    const existingAmend = await get(
      `/api/resource/Program Enrollment?filters=[["amended_from","=","${PE_NAME}"]]&fields=["name","docstatus"]&limit=1`
    );
    let amendedName;
    if (existingAmend?.length > 0) {
      amendedName = existingAmend[0].name;
      console.log(`  Found existing amended PE: ${amendedName} (docstatus=${existingAmend[0].docstatus})`);
      if (existingAmend[0].docstatus === 1) {
        console.log('  Amended PE already submitted. Skipping creation.');
        amendedName = null; // nothing to do
      }
    }

    if (amendedName === undefined) {
      // Create amended copy from original
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
        custom_fee_structure:     FS_BASIC,
        custom_no_of_instalments: '4',
        courses: (original.courses || []).map(c => ({ course: c.course })),
      };
      const newPE = await post('/api/resource/Program Enrollment', amendPayload);
      console.log(`  ✓ Created amended PE: ${newPE.name}`);
      amendedName = newPE.name;
    }

    if (amendedName) {
      await put(`/api/resource/Program Enrollment/${encodeURIComponent(amendedName)}`, { docstatus: 1 });
      console.log(`  ✓ Submitted amended PE: ${amendedName}`);
    }
  }

  // ── Step 8: Update Sales Order ────────────────────────────────────────────
  console.log(`\n[STEP 8] Updating Sales Order ${SO} → custom_plan: Basic...`);
  if (DRY) {
    console.log(`  [DRY] Would set_value on Sales Order/${SO}: { custom_plan: 'Basic', custom_no_of_instalments: '4' }`);
  } else {
    try {
      await post('/api/method/frappe.client.set_value', {
        doctype: 'Sales Order',
        name: SO,
        fieldname: { custom_plan: 'Basic', custom_no_of_instalments: '4' },
      });
      console.log(`  ✓ Updated Sales Order / ${SO}`);
    } catch (e) {
      console.log(`  ⚠ SO update failed (non-critical): ${e.message.slice(0, 120)}`);
    }
  }

  // ── Final verify ──────────────────────────────────────────────────────────
  console.log('\n[VERIFY] Final state...\n');
  if (!DRY) {
    const invList = await get(
      `/api/resource/Sales Invoice?filters=[["Sales Invoice Item","sales_order","=","${SO}"],["docstatus","=","1"]]&fields=["name","grand_total","outstanding_amount","status","due_date"]&limit=10`
    );
    let activeTotal = 0;
    console.log(`  Active invoices for ${CUSTOMER}:`);
    for (const inv of invList) {
      console.log(`  ${inv.name}: ₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | ${inv.status} | due=${inv.due_date}`);
      activeTotal += inv.grand_total;
    }
    const ok = activeTotal === 16900;
    console.log(`  Active Total: ₹${activeTotal} (expected ₹16,900) ${ok ? '✅' : '⚠'}`);
  } else {
    console.log('  [DRY] Would verify active invoices sum to ₹16,900');
  }

  console.log('\n=================================================================');
  console.log(`${DRY ? '[DRY RUN] ' : ''}✅ AYRA RAHMATH CONVERSION COMPLETE`);
  console.log('=================================================================\n');
}

main().catch(e => { console.error('\n❌ FAILED:', e.message); process.exit(1); });
