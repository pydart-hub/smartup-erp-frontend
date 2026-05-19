/**
 * fix-sana-otp-invoice.mjs
 *
 * Fixes Sana Fathima Ismail (STU-SU PLR-26-061):
 *
 * Problem:
 *   - Student changed from installment → OTP on Apr 24, 2026
 *   - OTP total for PLR 10th State Basic = ₹16,300 (one-time full payment)
 *   - Invoice 1 (SINV-05659) = ₹16,300 → PAID ✅ (covers full OTP)
 *   - Invoice 2 (SINV-07237) = ₹16,300 → OVERDUE ❌ (erroneous duplicate)
 *   - Program Enrollment still shows old 8-installment fee structure
 *
 * Fix:
 *   1. Cancel Invoice 2 (ACC-SINV-2026-07237) — erroneous overcharge
 *   2. Update PE to OTP plan fields
 *   3. Close the Sales Order (SAL-ORD-2026-00688)
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const INVOICE_2     = 'ACC-SINV-2026-07237';
const PE_NAME       = 'PEN-10th-Palluruthy 26-27-061';
const SO_NAME       = 'SAL-ORD-2026-00688';
const OTP_FEE_STR   = 'SU PLR-10th State-Basic-1';

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: AUTH,
};

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { headers: HEADERS, ...opts });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function main() {

  // ──────────────────────────────────────────────────────────────
  // SAFETY CHECKS before making any changes
  // ──────────────────────────────────────────────────────────────
  console.log('\n✦ Running safety checks...\n');

  // Check Invoice 2 state
  const inv2 = await fetchJSON(`${BASE}/api/resource/Sales Invoice/${encodeURIComponent(INVOICE_2)}`);
  const inv2Data = inv2.data;
  console.log(`Invoice 2 (${INVOICE_2}):`);
  console.log(`  docstatus       : ${inv2Data.docstatus}`);
  console.log(`  grand_total     : ₹${inv2Data.grand_total}`);
  console.log(`  outstanding_amt : ₹${inv2Data.outstanding_amount}`);
  console.log(`  is_return       : ${inv2Data.is_return}`);

  if (inv2Data.docstatus !== 1) {
    console.log(`\n⚠ Invoice 2 docstatus=${inv2Data.docstatus} — already cancelled or draft, skipping cancel.`);
  } else if (inv2Data.outstanding_amount !== inv2Data.grand_total) {
    console.error(`\n✗ Invoice 2 has partial payment (outstanding ₹${inv2Data.outstanding_amount} ≠ total ₹${inv2Data.grand_total}). Cannot cancel safely. Aborting.`);
    process.exit(1);
  } else {
    console.log(`  ✓ Safe to cancel — fully outstanding, no payments collected.\n`);
  }

  // Check PE state
  const peRes = await fetchJSON(`${BASE}/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  const pe = peRes.data;
  console.log(`Program Enrollment (${PE_NAME}):`);
  console.log(`  docstatus               : ${pe.docstatus}`);
  console.log(`  custom_fee_structure    : ${pe.custom_fee_structure}`);
  console.log(`  custom_no_of_instalments: ${pe.custom_no_of_instalments}`);
  console.log(`  custom_plan             : ${pe.custom_plan}`);

  // Check SO state
  const soRes = await fetchJSON(`${BASE}/api/resource/Sales Order/${encodeURIComponent(SO_NAME)}`);
  const so = soRes.data;
  console.log(`\nSales Order (${SO_NAME}):`);
  console.log(`  docstatus    : ${so.docstatus}`);
  console.log(`  status       : ${so.status}`);
  console.log(`  per_billed   : ${so.per_billed}%`);
  console.log(`  grand_total  : ₹${so.grand_total}`);

  console.log('\n══════════════════════════════════════════════');
  console.log('STARTING FIXES');
  console.log('══════════════════════════════════════════════\n');

  // ──────────────────────────────────────────────────────────────
  // STEP 1: Cancel Invoice 2
  // ──────────────────────────────────────────────────────────────
  if (inv2Data.docstatus === 1) {
    console.log(`► Step 1: Cancelling Invoice 2 (${INVOICE_2})...`);
    try {
      const cancelRes = await fetchJSON(
        `${BASE}/api/method/frappe.client.cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ doctype: 'Sales Invoice', name: INVOICE_2 }),
        }
      );
      console.log(`  ✓ Invoice cancelled. Response:`, JSON.stringify(cancelRes?.message?.docstatus ?? cancelRes, null, 2).slice(0, 100));
    } catch (err) {
      // Fallback: try PUT with docstatus=2
      console.warn(`  frappe.client.cancel failed (${err.message.slice(0,80)}), trying PUT docstatus=2...`);
      try {
        await fetchJSON(
          `${BASE}/api/resource/Sales Invoice/${encodeURIComponent(INVOICE_2)}`,
          {
            method: 'PUT',
            body: JSON.stringify({ docstatus: 2 }),
          }
        );
        console.log(`  ✓ Invoice cancelled via PUT docstatus=2.`);
      } catch (err2) {
        console.error(`  ✗ Could not cancel Invoice 2: ${err2.message}`);
        console.error('  → Please cancel it manually in Frappe backend.');
      }
    }
  } else {
    console.log(`► Step 1: Invoice 2 already not submitted (docstatus=${inv2Data.docstatus}), skipping.`);
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 2: Update Program Enrollment to OTP fields
  // ──────────────────────────────────────────────────────────────
  console.log(`\n► Step 2: Updating Program Enrollment (${PE_NAME}) to OTP...`);

  if (pe.custom_no_of_instalments === '1' && pe.custom_fee_structure === OTP_FEE_STR) {
    console.log('  ✓ PE already shows OTP plan, no update needed.');
  } else if (pe.docstatus === 1) {
    // Submitted PEs cannot be directly edited — use frappe.client.set_value
    try {
      const setVal1 = await fetchJSON(
        `${BASE}/api/method/frappe.client.set_value`,
        {
          method: 'POST',
          body: JSON.stringify({
            doctype: 'Program Enrollment',
            name: PE_NAME,
            fieldname: 'custom_fee_structure',
            value: OTP_FEE_STR,
          }),
        }
      );
      console.log(`  ✓ custom_fee_structure → ${OTP_FEE_STR}`);

      const setVal2 = await fetchJSON(
        `${BASE}/api/method/frappe.client.set_value`,
        {
          method: 'POST',
          body: JSON.stringify({
            doctype: 'Program Enrollment',
            name: PE_NAME,
            fieldname: 'custom_no_of_instalments',
            value: '1',
          }),
        }
      );
      console.log(`  ✓ custom_no_of_instalments → 1`);

    } catch (err) {
      console.error(`  ✗ Could not update PE: ${err.message.slice(0, 200)}`);
      console.error('  → Please update manually in Frappe backend.');
    }
  } else {
    console.log(`  ⚠ PE docstatus=${pe.docstatus}, skipping update.`);
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Close the Sales Order
  // ──────────────────────────────────────────────────────────────
  console.log(`\n► Step 3: Closing Sales Order (${SO_NAME})...`);

  if (so.status === 'Closed') {
    console.log('  ✓ SO already Closed, skipping.');
  } else {
    try {
      const closeRes = await fetchJSON(
        `${BASE}/api/method/frappe.client.set_value`,
        {
          method: 'POST',
          body: JSON.stringify({
            doctype: 'Sales Order',
            name: SO_NAME,
            fieldname: 'status',
            value: 'Closed',
          }),
        }
      );
      console.log(`  ✓ Sales Order status → Closed`);
    } catch (err) {
      // Try update_sales_order_status or just PUT
      console.warn(`  set_value failed (${err.message.slice(0,80)}), trying close_sales_order...`);
      try {
        await fetchJSON(
          `${BASE}/api/method/erpnext.selling.doctype.sales_order.sales_order.close_or_unclose_sales_orders`,
          {
            method: 'POST',
            body: JSON.stringify({ names: JSON.stringify([SO_NAME]), status: 'Closed' }),
          }
        );
        console.log(`  ✓ Sales Order closed via close_or_unclose_sales_orders.`);
      } catch (err2) {
        console.error(`  ✗ Could not close SO: ${err2.message.slice(0, 200)}`);
        console.error('  → Please close it manually in Frappe backend (SO → Close button).');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // VERIFY
  // ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('VERIFICATION');
  console.log('══════════════════════════════════════════════\n');

  const inv2After = await fetchJSON(`${BASE}/api/resource/Sales Invoice/${encodeURIComponent(INVOICE_2)}`);
  console.log(`Invoice 2 docstatus after: ${inv2After.data.docstatus} (expected: 2=Cancelled)`);

  const peAfter = await fetchJSON(`${BASE}/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  console.log(`PE custom_fee_structure after: ${peAfter.data.custom_fee_structure} (expected: ${OTP_FEE_STR})`);
  console.log(`PE custom_no_of_instalments after: ${peAfter.data.custom_no_of_instalments} (expected: 1)`);

  const soAfter = await fetchJSON(`${BASE}/api/resource/Sales Order/${encodeURIComponent(SO_NAME)}`);
  console.log(`SO status after: ${soAfter.data.status} (expected: Closed)`);

  console.log('\n✓ Fix complete.\n');
}

main().catch((err) => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
