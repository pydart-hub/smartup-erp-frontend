/**
 * Fix Missing First Installment Invoices
 * 
 * Root cause: Students admitted on/after April 16, 2026 are missing their 
 * first installment invoice (due April 15). The create-invoices route 
 * likely had a race condition / transient error on the first API call after SO submission.
 * 
 * Pattern: ALL plans have inst1 due April 15.
 * Result: inst1 invoice was never created. Invoices 2-N exist.
 * 
 * Fix: For each partly-billed SO, calculate missing amount and create one invoice.
 * 
 * Run with: node docs/fix_missing_first_invoice.mjs [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const BASE = 'https://smartup.m.frappe.cloud';
const H = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
};
const enc = encodeURIComponent;
const TODAY = new Date().toISOString().split('T')[0]; // 2026-04-21

async function get(path) {
  const r = await fetch(BASE + path, { headers: H });
  return r.json();
}

async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return r.json();
}

async function put(path, body) {
  const r = await fetch(BASE + path, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  return r.json();
}

console.log('=== Fix Missing First Installment Invoices ===');
console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'LIVE');
console.log('Today:', TODAY);
console.log('');

// 1. Get all partly-billed SOs from April 2026 (submitted, not fully billed)
const soRes = await get('/api/resource/Sales%20Order?filters=' + enc(JSON.stringify([
  ['transaction_date', '>=', '2026-04-16'],
  ['transaction_date', '<=', '2026-04-21'],
  ['billing_status', '!=', 'Fully Billed'],
  ['docstatus', '=', 1]
])) + '&fields=' + enc(JSON.stringify([
  'name', 'customer', 'grand_total', 'per_billed', 'billing_status', 'transaction_date'
])) + '&limit=200');

const partlyBilledSOs = soRes.data || [];
console.log(`Found ${partlyBilledSOs.length} partly-billed SOs (Apr 16-21)\n`);

let fixed = 0, skipped = 0, failed = 0;

for (const so of partlyBilledSOs) {
  const remaining = Math.round(so.grand_total - (so.per_billed * so.grand_total / 100));
  
  if (remaining <= 10) { // Floating point tolerance
    console.log(`SKIP ${so.name} (${so.customer}) — remaining too small: ${remaining}`);
    skipped++;
    continue;
  }

  // Get full SO details
  const soDetail = await get('/api/resource/Sales%20Order/' + enc(so.name));
  const soData = soDetail.data;
  const soItem = soData?.items?.[0];
  const numInst = parseInt(soData?.custom_no_of_instalments || '1', 10);
  
  if (!soItem || numInst <= 1) {
    console.log(`SKIP ${so.name} (${so.customer}) — no items or OTP plan`);
    skipped++;
    continue;
  }

  // Get existing invoices
  const invRes = await get('/api/resource/Sales%20Invoice?filters=' + enc(JSON.stringify([
    ['customer', '=', so.customer], ['docstatus', '=', 1]
  ])) + '&fields=' + enc(JSON.stringify(['name', 'grand_total', 'due_date'])) + '&limit=20');
  
  const existingInvoices = (invRes.data || []).filter(i => i.grand_total > 0); // exclude credit notes
  const billedTotal = existingInvoices.reduce((s, i) => s + i.grand_total, 0);
  const missingAmount = Math.round(so.grand_total - billedTotal);

  if (missingAmount <= 0) {
    console.log(`SKIP ${so.name} (${so.customer}) — no missing amount (billed: ${billedTotal}, total: ${so.grand_total})`);
    skipped++;
    continue;
  }

  if (existingInvoices.length !== numInst - 1) {
    console.log(`SKIP ${so.name} (${so.customer}) — unexpected invoice count: ${existingInvoices.length} (expected ${numInst-1}). Needs manual review.`);
    console.log(`  Existing: ${existingInvoices.map(i => `${i.grand_total}`).join(', ')}`);
    skipped++;
    continue;
  }

  // Check earliest existing invoice date to confirm the missing one is the FIRST
  const sortedDates = existingInvoices.map(i => i.due_date).sort();
  const earliestExisting = sortedDates[0];

  console.log(`FIX ${so.name} | ${so.customer} | plan=${numInst}-inst | total=${so.grand_total} | missing=₹${missingAmount} | existing-start=${earliestExisting}`);
  console.log(`  Existing invoices: ${existingInvoices.map(i => `₹${i.grand_total} (${i.due_date})`).join(', ')}`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create: ₹${missingAmount} due ${TODAY}`);
    fixed++;
    continue;
  }

  // Create the missing first installment invoice
  const invoicePayload = {
    doctype: 'Sales Invoice',
    customer: soData.customer,
    company: soData.company,
    posting_date: TODAY,
    due_date: TODAY,
    student: soData.student,
    custom_academic_year: soData.custom_academic_year,
    items: [{
      item_code: soItem.item_code,
      item_name: soItem.item_name,
      description: `Inst 1 (Apr 15 due) — ${soItem.item_name}`,
      qty: 1,
      rate: missingAmount,
      amount: missingAmount,
      sales_order: so.name,
      so_detail: soItem.name,
    }],
  };

  try {
    // Create draft
    const createRes = await post('/api/resource/Sales%20Invoice', invoicePayload);
    if (!createRes.data) {
      console.error(`  ✗ Failed to create: ${JSON.stringify(createRes).slice(0, 200)}`);
      failed++;
      continue;
    }
    const invName = createRes.data.name;
    console.log(`  ✓ Created draft: ${invName}`);

    // Submit
    const submitRes = await put('/api/resource/Sales%20Invoice/' + enc(invName), { docstatus: 1 });
    if (!submitRes.data) {
      console.error(`  ✗ Failed to submit ${invName}: ${JSON.stringify(submitRes).slice(0, 200)}`);
      failed++;
      continue;
    }
    console.log(`  ✓ Submitted: ${invName} | outstanding: ₹${submitRes.data.outstanding_amount}`);
    fixed++;
  } catch (e) {
    console.error(`  ✗ Error for ${so.name}: ${e.message}`);
    failed++;
  }

  // Small delay to avoid overloading Frappe
  await new Promise(r => setTimeout(r, 300));
}

console.log('\n=== SUMMARY ===');
console.log(`Fixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed: ${failed}`);
if (DRY_RUN) console.log('\nRe-run without --dry-run to apply fixes.');
