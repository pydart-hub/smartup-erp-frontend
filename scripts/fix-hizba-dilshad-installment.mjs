/**
 * fix-hizba-dilshad-installment.mjs
 * 
 * Moves payment from Installment 2 → Installment 1 for:
 * - HIZBA FATHIMA M B (STU-SU CHL-26-109): ₹5,000 from 04661 → 04857
 * - MOHAMMED DILSHAD K M (STU-SU CHL-26-110): ₹1,300 from 04664 → 04858
 *
 * Steps per student:
 * 1. Fetch existing payment entry details
 * 2. Cancel the payment entry
 * 3. Delete the payment entry
 * 4. Recreate it referencing Installment 1 invoice
 * 5. Submit
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

function step(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function fGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}

async function fPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const json = await r.json();
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function fPut(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
  const json = await r.json();
  if (!r.ok) throw new Error(`PUT ${path}: ${r.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function fDel(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  const json = await r.json();
  if (!r.ok) throw new Error(`DEL ${path}: ${r.status} ${JSON.stringify(json)}`);
  return json;
}

async function cancelAndDelete(doctype, name, label) {
  const encoded = encodeURIComponent(name);
  try {
    const doc = await fGet(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`);
    if (doc.docstatus === 1) {
      await fPut(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`, { docstatus: 2 });
      step(`  ✓ Cancelled ${label} (${name})`);
    } else {
      step(`  ~ ${label} (${name}) already at docstatus=${doc.docstatus}`);
    }
  } catch (e) {
    step(`  ! Cancel failed for ${name}: ${e.message}`);
    throw e;
  }
  await fDel(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`);
  step(`  ✓ Deleted ${label} (${name})`);
}

async function main() {
  const FIXES = [
    {
      studentName: 'HIZBA FATHIMA M B',
      paymentEntry: 'ACC-PAY-2026-04389',
      oldInvoice: 'ACC-SINV-2026-04661',  // Inst 2 — currently holds ₹5,000
      newInvoice: 'ACC-SINV-2026-04857',  // Inst 1 — should hold ₹5,000
      amount: 5000,
    },
    {
      studentName: 'MOHAMMED DILSHAD K M',
      paymentEntry: 'ACC-PAY-2026-04390',
      oldInvoice: 'ACC-SINV-2026-04664',  // Inst 2 — currently holds ₹1,300
      newInvoice: 'ACC-SINV-2026-04858',  // Inst 1 — should hold ₹1,300
      amount: 1300,
    },
  ];

  for (const fix of FIXES) {
    step(`\n${'='.repeat(60)}`);
    step(`FIXING: ${fix.studentName}`);
    step('='.repeat(60));

    // STEP 1: Fetch existing PE details to copy all fields
    step('\n--- Step 1: Fetch existing Payment Entry details ---');
    const pe = await fGet(`/api/resource/Payment Entry/${fix.paymentEntry}`);
    step(`  party: ${pe.party} | amount: ${pe.paid_amount} | mode: ${pe.mode_of_payment}`);
    step(`  company: ${pe.company} | paid_to: ${pe.paid_to} | paid_from: ${pe.paid_from}`);
    step(`  posting_date: ${pe.posting_date}`);
    step(`  current reference: ${pe.references?.[0]?.reference_name}`);

    // STEP 2: Cancel
    step('\n--- Step 2: Cancel Payment Entry ---');
    await fPut(`/api/resource/Payment Entry/${encodeURIComponent(fix.paymentEntry)}`, { docstatus: 2 });
    step(`  ✓ Cancelled ${fix.paymentEntry}`);

    // STEP 3: Delete
    step('\n--- Step 3: Delete Payment Entry ---');
    await fDel(`/api/resource/Payment Entry/${encodeURIComponent(fix.paymentEntry)}`);
    step(`  ✓ Deleted ${fix.paymentEntry}`);

    // STEP 4: Recreate pointing to Inst 1 invoice
    step('\n--- Step 4: Create new Payment Entry → Inst 1 ---');
    const pePayload = {
      payment_type: pe.payment_type,
      mode_of_payment: pe.mode_of_payment,
      party_type: pe.party_type,
      party: pe.party,
      party_name: pe.party_name,
      company: pe.company,
      paid_from: pe.paid_from,
      paid_to: pe.paid_to,
      paid_amount: pe.paid_amount,
      received_amount: pe.received_amount,
      source_exchange_rate: pe.source_exchange_rate,
      target_exchange_rate: pe.target_exchange_rate,
      posting_date: pe.posting_date,
      reference_no: pe.reference_no,
      reference_date: pe.reference_date,
      remarks: pe.remarks,
      references: [{
        reference_doctype: 'Sales Invoice',
        reference_name: fix.newInvoice,
        allocated_amount: fix.amount,
      }],
    };
    const newPE = await fPost('/api/resource/Payment Entry', pePayload);
    step(`  ✓ Created draft: ${newPE.name} → ${fix.newInvoice}`);

    // STEP 5: Submit
    step('\n--- Step 5: Submit new Payment Entry ---');
    await fPut(`/api/resource/Payment Entry/${encodeURIComponent(newPE.name)}`, { docstatus: 1 });
    step(`  ✓ Submitted ${newPE.name}`);

    step(`\n✅ DONE: ${fix.studentName}`);
    step(`   Payment ${newPE.name} (₹${fix.amount}) → ${fix.newInvoice} (Installment 1)`);
  }

  step('\n=== ALL FIXES COMPLETE ===');
}

main().catch(e => {
  console.error('\n❌ FATAL ERROR:', e.message);
  process.exit(1);
});
