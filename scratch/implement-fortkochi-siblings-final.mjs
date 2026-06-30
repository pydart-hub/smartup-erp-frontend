#!/usr/bin/env node
/**
 * implement-fortkochi-siblings-final.mjs
 * 
 * Registers the missing payment pay_Sqs94tQOoKlEi4 (₹2,050, Razorpay, May 18, 2026)
 * for Abdul Raihan TA and re-allocates his subsequent payments chronologically.
 * 
 * Run dry-run:   node scratch/implement-fortkochi-siblings-final.mjs
 * Execute:       node scratch/implement-fortkochi-siblings-final.mjs --execute
 */

import https from 'https';

const BASE = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';
const AUTH = `token ${API_KEY}:${API_SECRET}`;
const EXECUTE = process.argv.includes('--execute');

if (!EXECUTE) {
  console.log('*** DRY RUN MODE — no changes will be made ***\n');
} else {
  console.log('⚠️  *** RUNNING IN EXECUTE MODE — WRITING CHANGES TO FRAPPE *** ⚠️\n');
}

const headers = {
  'Authorization': AUTH,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// --- Constants ---
const CUSTOMER = 'ABDUL RAIHAN TA';
const COMPANY = 'Smart Up Fortkochi';

const PAYMENTS_TO_CANCEL = [
  'ACC-PAY-2026-06077', // ₹2,000 from June 24
  'ACC-PAY-2026-06078', // ₹50 from June 24
];

const INVOICE_INST2 = 'ACC-SINV-2026-03006';
const INVOICE_INST3 = 'ACC-SINV-2026-03007';

// --- HTTP Helpers ---
async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

async function getDoc(doctype, name) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)).data;
}

async function postDoc(doctype, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })).data;
}

async function putDoc(doctype, name, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })).data;
}

async function cancelDoc(doctype, name) {
  const doc = await getDoc(doctype, name).catch(() => null);
  if (!doc) {
    console.log(`   ⚠ ${doctype} ${name} not found, skipping cancel`);
    return;
  }
  if (doc.docstatus === 2) {
    console.log(`   ✓ ${doctype} ${name} is already cancelled`);
    return;
  }
  const r = await fetch(`${BASE}/api/method/frappe.client.cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, name }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Cancel ${doctype} ${name} failed: ${t.slice(0, 400)}`);
  }
  return r.json();
}

async function deleteDoc(doctype, name) {
  const doc = await getDoc(doctype, name).catch(() => null);
  if (!doc) {
    console.log(`   ⚠ ${doctype} ${name} not found, skipping delete`);
    return;
  }
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Delete ${doctype} ${name} failed: ${t.slice(0, 400)}`);
  }
  return r.json();
}

async function main() {
  console.log('='.repeat(75));
  console.log(`MIGRATING MISSING PAYMENT FOR ${CUSTOMER}`);
  console.log('='.repeat(75));

  if (!EXECUTE) {
    console.log('*** DRY RUN SUMMARY of what would execute: ***');
    PAYMENTS_TO_CANCEL.forEach(p => console.log(`1. Cancel and Delete Payment Entry: ${p}`));
    console.log(`2. Create & Submit new Payment Entry for ₹2,050 (Razorpay, Ref: pay_Sqs94tQOoKlEi4)`);
    console.log(`   - Date: 2026-05-18`);
    console.log(`   - Allocate ₹2,050 to Inst 2 (${INVOICE_INST2})`);
    
    console.log(`3. Recreate & Submit Payment Entry: ₹2,000 (Razorpay, Ref: pay_T5AsQ5meDfBbw1)`);
    console.log(`   - Date: 2026-06-24`);
    console.log(`   - Allocate ₹1,200 to Inst 2 (${INVOICE_INST2})`);
    console.log(`   - Allocate ₹800 to Inst 3 (${INVOICE_INST3})`);

    console.log(`4. Recreate & Submit Payment Entry: ₹50 (Razorpay, Ref: pay_T5AuViLX4aEn95)`);
    console.log(`   - Date: 2026-06-24`);
    console.log(`   - Allocate ₹50 to Inst 2 (${INVOICE_INST2})`);

    console.log('\nTo run for real, run with --execute');
    return;
  }

  // 1. Cancel and Delete June 24 Payments
  console.log('\n⚙️  STEP 1: Cancelling and Deleting 2 June 24 Payment Entries...');
  for (const pe of PAYMENTS_TO_CANCEL) {
    await cancelDoc('Payment Entry', pe);
    await deleteDoc('Payment Entry', pe);
    console.log(`   ✓ Removed ${pe}`);
  }

  // 2. Create the missing Payment Entry
  console.log('\n⚙️  STEP 2: Creating missing Payment Entry (₹2,050)...');
  const missingPePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 2050,
    received_amount: 2050,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: 'Razorpay',
    posting_date: '2026-05-18',
    reference_no: 'pay_Sqs94tQOoKlEi4',
    reference_date: '2026-05-18',
    company: COMPANY,
    paid_from: 'Debtors - SU FKO',
    paid_to: 'Razorpay - SU FKO',
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: INVOICE_INST2,
      allocated_amount: 2050,
    }],
    remarks: `Amount INR 2050.0 received from ${CUSTOMER}\nTransaction reference no pay_Sqs94tQOoKlEi4 dated 2026-05-18\nAmount INR 2050.0 against Sales Invoice ${INVOICE_INST2}`,
  };

  const peMissing = await postDoc('Payment Entry', missingPePayload);
  console.log(`   ✓ Created missing PE: ${peMissing.name}`);
  await putDoc('Payment Entry', peMissing.name, { docstatus: 1 });
  console.log(`   ✓ Submitted missing PE`);

  await new Promise(r => setTimeout(r, 1500));

  // 3. Recreate the ₹2,000 June 24 payment
  console.log('\n⚙️  STEP 3: Re-creating ₹2,000 Payment Entry...');
  const pe2000Payload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: 'Razorpay',
    posting_date: '2026-06-24',
    reference_no: 'pay_T5AsQ5meDfBbw1',
    reference_date: '2026-06-24',
    company: COMPANY,
    paid_from: 'Debtors - SU FKO',
    paid_to: 'Razorpay - SU FKO',
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: INVOICE_INST2,
        allocated_amount: 1200,
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: INVOICE_INST3,
        allocated_amount: 800,
      }
    ],
    remarks: `Amount INR 2000.0 received from ${CUSTOMER}\nTransaction reference no pay_T5AsQ5meDfBbw1 dated 2026-06-24\nAllocated: ${INVOICE_INST2} (₹1,200), ${INVOICE_INST3} (₹800)`,
  };

  const pe2000 = await postDoc('Payment Entry', pe2000Payload);
  console.log(`   ✓ Created PE: ${pe2000.name}`);
  await putDoc('Payment Entry', pe2000.name, { docstatus: 1 });
  console.log(`   ✓ Submitted PE`);

  await new Promise(r => setTimeout(r, 1000));

  // 4. Recreate the ₹50 June 24 payment
  console.log('\n⚙️  STEP 4: Re-creating ₹50 Payment Entry...');
  const pe50Payload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 50,
    received_amount: 50,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: 'Razorpay',
    posting_date: '2026-06-24',
    reference_no: 'pay_T5AuViLX4aEn95',
    reference_date: '2026-06-24',
    company: COMPANY,
    paid_from: 'Debtors - SU FKO',
    paid_to: 'Razorpay - SU FKO',
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: INVOICE_INST2,
      allocated_amount: 50,
    }],
    remarks: `Amount INR 50.0 received from ${CUSTOMER}\nTransaction reference no pay_T5AuViLX4aEn95 dated 2026-06-24\nAmount INR 50.0 against Sales Invoice ${INVOICE_INST2}`,
  };

  const pe50 = await postDoc('Payment Entry', pe50Payload);
  console.log(`   ✓ Created PE: ${pe50.name}`);
  await putDoc('Payment Entry', pe50.name, { docstatus: 1 });
  console.log(`   ✓ Submitted PE`);

  console.log('\n' + '='.repeat(75));
  console.log('✅ MISSING TRANSACTION REGISTERED AND ALLOCATED SUCCESSFULLY!');
  console.log('='.repeat(75));
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
