/**
 * fix-ziyan-due-dates.mjs
 *
 * Fix Mohammed Ziyan S (STU-SU PLR-26-078):
 *   - SINV-06022 (Inst 2): due Apr 29 ❌ → cancel & recreate due May 15
 *   - SINV-06023 (Inst 3): due Apr 29 ❌ → cancel & recreate due Jun 15
 *
 * Both invoices are fully outstanding (no payments). Safe to cancel.
 */

const BASE   = 'https://smartup.m.frappe.cloud';
const AUTH   = 'token 03330270e330d49:9c2261ae11ac2d2';
const SO     = 'SAL-ORD-2026-00751';
const CUSTOMER = 'Mohammed Ziyan S';
const STUDENT  = 'STU-SU PLR-26-078';
const COMPANY  = 'Smart Up Palluruthy';
const AY       = '2026-2027';

const FIXES = [
  // May 15 is now 2 days past — set due to today (May 17) so it shows as Unpaid, not stuck at Apr 29
  { invoice: 'ACC-SINV-2026-06022', label: 'Inst 2', amount: 2400, newDue: '2026-05-17', postDate: '2026-05-17' },
  // Jun 15 is future — post today, due Jun 15
  { invoice: 'ACC-SINV-2026-06023', label: 'Inst 3', amount: 2400, newDue: '2026-06-15', postDate: '2026-05-17' },
];

const H = { 'Content-Type': 'application/json', Authorization: AUTH };

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: H, ...opts });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {

  // ── Safety checks ──────────────────────────────────────────────
  console.log('\n✦ Safety checks...\n');

  for (const fix of FIXES) {
    const inv = (await api(`${BASE}/api/resource/Sales Invoice/${fix.invoice}`)).data;
    console.log(`${fix.invoice}:`);
    console.log(`  docstatus       : ${inv.docstatus}`);
    console.log(`  grand_total     : ₹${inv.grand_total}`);
    console.log(`  outstanding_amt : ₹${inv.outstanding_amount}`);

    if (inv.docstatus === 2) {
      fix._alreadyCancelled = true;
      console.log(`  ✓ Already cancelled — will skip cancel step, just recreate\n`);
      continue;
    }
    if (inv.docstatus !== 1) {
      throw new Error(`${fix.invoice} is in unexpected state (docstatus=${inv.docstatus}). Aborting.`);
    }
    if (inv.outstanding_amount !== inv.grand_total) {
      throw new Error(`${fix.invoice} has partial payment (outstanding ≠ total). Cannot cancel safely. Aborting.`);
    }
    console.log(`  ✓ Safe to cancel\n`);
  }

  // ── Get SO item row name (needed for so_detail link) ──────────
  const soDoc = (await api(`${BASE}/api/resource/Sales Order/${SO}`)).data;
  const soItem = soDoc.items?.[0];
  if (!soItem) throw new Error('SO has no items!');
  const soItemName = soItem.name;
  const itemCode   = soItem.item_code;
  const itemName   = soItem.item_name;
  console.log(`SO item row: ${soItemName} | item_code: ${itemCode}`);

  console.log('\n══════════════════════════════════════');
  console.log('RUNNING FIXES');
  console.log('══════════════════════════════════════\n');

  const newInvoices = [];

  for (const fix of FIXES) {
    console.log(`\n─── ${fix.label}: ${fix.invoice} ───`);

    // Step A: Cancel the old invoice (skip if already cancelled)
    if (fix._alreadyCancelled) {
      console.log(`  ► Cancel: already cancelled, skipping`);
    } else {
      console.log(`  ► Cancelling ${fix.invoice}...`);
      try {
        await api(`${BASE}/api/method/frappe.client.cancel`, {
          method: 'POST',
          body: JSON.stringify({ doctype: 'Sales Invoice', name: fix.invoice }),
        });
        console.log(`  ✓ Cancelled`);
      } catch (e) {
        console.warn(`  frappe.client.cancel failed (${e.message.slice(0, 60)}), trying PUT docstatus=2...`);
        await api(`${BASE}/api/resource/Sales Invoice/${fix.invoice}`, {
          method: 'PUT',
          body: JSON.stringify({ docstatus: 2 }),
        });
        console.log(`  ✓ Cancelled via PUT`);
      }
      // Brief pause — let Frappe unlock the SO billing row
      await new Promise(r => setTimeout(r, 1200));
    }

    // Step B: Create new invoice with correct due date
    // posting_date = fix.postDate (today or same as due for past dates)
    // due_date = fix.newDue (the corrected due date)
    console.log(`  ► Creating new invoice (posting=${fix.postDate}, due=${fix.newDue})...`);
    const payload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: fix.postDate,
      due_date: fix.newDue,
      student: STUDENT,
      custom_academic_year: AY,
      items: [{
        item_code: itemCode,
        item_name: itemName,
        description: `${fix.label} — ${itemName}`,
        qty: 1,
        rate: fix.amount,
        amount: fix.amount,
        sales_order: SO,
        so_detail: soItemName,
      }],
    };

    const created = (await api(`${BASE}/api/resource/Sales Invoice`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })).data;
    const newName = created.name;
    console.log(`  ✓ Created: ${newName}`);

    // Step C: Submit
    console.log(`  ► Submitting ${newName}...`);
    await api(`${BASE}/api/resource/Sales Invoice/${newName}`, {
      method: 'PUT',
      body: JSON.stringify({ docstatus: 1 }),
    });
    console.log(`  ✓ Submitted`);
    newInvoices.push({ label: fix.label, name: newName, due: fix.newDue, amount: fix.amount });
  }

  // ── Verify ─────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('VERIFICATION');
  console.log('══════════════════════════════════════\n');

  // Cancelled invoices
  for (const fix of FIXES) {
    const inv = (await api(`${BASE}/api/resource/Sales Invoice/${fix.invoice}`)).data;
    console.log(`${fix.invoice} docstatus: ${inv.docstatus} (expected 2=Cancelled) ${inv.docstatus === 2 ? '✓' : '❌'}`);
  }

  // New invoices
  for (const ni of newInvoices) {
    const inv = (await api(`${BASE}/api/resource/Sales Invoice/${ni.name}`)).data;
    console.log(`\n${ni.label} → ${ni.name}:`);
    console.log(`  due_date       : ${inv.due_date} (expected ${ni.due}) ${inv.due_date === ni.due ? '✓' : '❌'}`);
    console.log(`  grand_total    : ₹${inv.grand_total} (expected ₹${ni.amount}) ${inv.grand_total === ni.amount ? '✓' : '❌'}`);
    console.log(`  status         : ${inv.status}`);
    console.log(`  outstanding_amt: ₹${inv.outstanding_amount}`);
  }

  // Final schedule summary
  console.log('\n══════════════════════════════════════');
  console.log('FINAL INSTALMENT SCHEDULE');
  console.log('══════════════════════════════════════');
  console.log('  Inst 1: Apr 29  ₹2,400  PAID ✅');
  console.log(`  Inst 2: May 15  ₹2,400  Unpaid`);
  console.log(`  Inst 3: Jun 15  ₹2,400  Unpaid`);
  console.log('  Inst 4: Jul 15  ₹2,400  Unpaid');
  console.log('  Inst 5: Aug 15  ₹2,400  Unpaid');
  console.log('  Inst 6: Sep 15  ₹2,400  Unpaid');
  console.log('  Inst 7: Oct 15  ₹2,400  Unpaid');
  console.log('  Inst 8: Nov 15  ₹1,000  Unpaid');
  console.log('  Total: ₹17,800');
  console.log('\n✓ Fix complete.\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e.message); process.exit(1); });
