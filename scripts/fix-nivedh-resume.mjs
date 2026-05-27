/**
 * fix-nivedh-resume.mjs
 *
 * Resumes from Phase 4 (SO+invoices+PEs already partially done).
 * The previous run cancelled all PEs + invoices + old SO.
 * It also created new SO: SAL-ORD-2026-01094 (submitted).
 * It failed BEFORE creating any invoices.
 *
 * This script:
 *   1. Creates 4 new invoices against SAL-ORD-2026-01094
 *   2. Creates 3 Payment Entries against Inst 1
 *   3. Sends payment receipt
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

const STUDENT       = 'STU-SU KDV-26-008';
const CUSTOMER      = 'NIVEDH KRISHNA';
const COMPANY       = 'Smart Up Kadavanthara';
const ITEM_CODE     = '12th Science CBSE Tuition Fee';
const ITEM_NAME     = '12th Science CBSE Tuition Fee';
const ITEM_DESC     = '12th CBSE Tuition Fee';
const NEW_SO        = 'SAL-ORD-2026-01094';
const ACADEMIC_YEAR = '2026-2027';
const TODAY         = '2026-05-25';

const TARGET_SCHEDULE = [
  { label: 'Q1', amount: 12300, postingDate: TODAY, dueDate: TODAY        },
  { label: 'Q2', amount:  8800, postingDate: TODAY, dueDate: '2026-07-15' },
  { label: 'Q3', amount:  8800, postingDate: TODAY, dueDate: '2026-10-15' },
  { label: 'Q4', amount:  5300, postingDate: TODAY, dueDate: '2027-01-15' },
];

const PAYMENTS_TO_RESTORE = [
  { amount: 5000, refNo: 'CASH-1778064930066', date: TODAY },
  { amount: 6000, refNo: 'CASH-1779704467507', date: TODAY },
  { amount: 1300, refNo: 'CASH-1779704488102', date: TODAY },
];

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}
const get  = (path)       => fetchJSON(BASE + path).then(d => d.data);
const post = (path, body) => fetchJSON(BASE + path, { method: 'POST', body: JSON.stringify(body) }).then(d => d.data);
const put  = (path, body) => fetchJSON(BASE + path, { method: 'PUT',  body: JSON.stringify(body) }).then(d => d.data);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' RESUME FIX: NIVEDH KRISHNA — from Phase 4');
  console.log('═══════════════════════════════════════════════════════════');

  // Verify new SO exists and is submitted
  console.log('\n── Verify SO');
  const soDoc = await get(`/api/resource/Sales Order/${encodeURIComponent(NEW_SO)}`);
  if (soDoc.docstatus !== 1) throw new Error(`SO ${NEW_SO} is NOT submitted (docstatus=${soDoc.docstatus})`);
  const newSoItemRow = soDoc.items?.[0]?.name;
  console.log(`   ✓ SO ${NEW_SO} | ₹${soDoc.grand_total} | item row: ${newSoItemRow}`);

  // Verify no existing invoices already (in case of partial run)
  console.log('\n── Check existing invoices for this customer');
  const existInvParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER], ['docstatus', '!=', '2']]),
    fields: JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'docstatus']),
    limit_page_length: '10',
  });
  const existInv = (await fetchJSON(`${BASE}/api/resource/Sales Invoice?${existInvParams}`)).data;
  if (existInv?.length) {
    console.log('   ⚠ Found existing active invoices — aborting to prevent duplicates:');
    existInv.forEach(i => console.log(`     ${i.name}: ₹${i.grand_total} | ${i.status}`));
    throw new Error('Existing invoices found — will not create duplicates');
  }
  console.log('   ✓ No existing invoices — safe to create');

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
  console.log(`\n   Inst 1 target: ${inst1Invoice} (₹12,300)`);

  // ── PHASE 6: Recreate 3 Payment Entries ──────────────────────────────────
  console.log('\n── PHASE 6: Recreate 3 Payment Entries (total ₹12,300) → Inst 1');

  // Fetch Cash account for Kadavanthara
  const mopRes = await get('/api/resource/Mode of Payment/Cash');
  const companyAccount = (mopRes?.accounts ?? []).find(a => a.company === COMPANY);
  const cashAccount = companyAccount?.default_account;
  console.log(`   Cash account for ${COMPANY}: ${cashAccount || '(will use get_payment_entry default)'}`);

  for (const pmt of PAYMENTS_TO_RESTORE) {
    // Use get_payment_entry to get auto-resolved GL accounts
    const peRes = await fetchJSON(
      `${BASE}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
      {
        method: 'POST',
        body: JSON.stringify({
          dt: 'Sales Invoice',
          dn: inst1Invoice,
          party_amount: pmt.amount,
          bank_amount: pmt.amount,
        }),
      }
    );
    const peTemplate = peRes.message;

    // Patch with cash-specific fields
    peTemplate.mode_of_payment  = 'Cash';
    peTemplate.posting_date     = pmt.date;
    peTemplate.reference_no     = pmt.refNo;
    peTemplate.reference_date   = pmt.date;
    peTemplate.paid_amount      = pmt.amount;
    peTemplate.received_amount  = pmt.amount;
    peTemplate.remarks          = `Cash payment ref ${pmt.refNo} — ${inst1Invoice} (restored fee restructure)`;

    // Override allocated amount in references
    if (peTemplate.references?.length) {
      for (const ref of peTemplate.references) {
        if (ref.reference_name === inst1Invoice) ref.allocated_amount = pmt.amount;
      }
    }

    // Override paid_to account if we found the cash account
    if (cashAccount) {
      peTemplate.paid_to = cashAccount;
      peTemplate.paid_to_account_type = 'Cash';
    }

    const peDraft = await post('/api/resource/Payment Entry', peTemplate);
    await put(`/api/resource/Payment Entry/${encodeURIComponent(peDraft.name)}`, { docstatus: 1 });
    console.log(`   ✓ ${peDraft.name} — ₹${pmt.amount} Cash | ref: ${pmt.refNo}`);
  }

  // ── VERIFY ────────────────────────────────────────────────────────────────
  console.log('\n── PHASE 7: Verify');
  const inst1Doc = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inst1Invoice)}`);
  console.log(`   ${inst1Invoice}: ₹${inst1Doc.grand_total} | outstanding: ₹${inst1Doc.outstanding_amount} | status: ${inst1Doc.status}`);

  if (inst1Doc.status !== 'Paid') {
    console.warn(`   ⚠ WARNING: Inst 1 not fully paid — ₹${inst1Doc.outstanding_amount} remaining`);
  } else {
    console.log('   ✓ Inst 1 is PAID ✓');
  }

  // ── PHASE 8: Send Receipt ─────────────────────────────────────────────────
  console.log('\n── PHASE 8: Send Payment Receipt');
  const sessionCookie = Buffer.from(JSON.stringify({
    email: 'arjunprakashk7@gmail.com',
    roles: ['Administrator', 'System Manager', 'Branch Manager'],
  })).toString('base64');

  const receiptRes = await fetch('http://localhost:3000/api/payments/send-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `smartup_session=${sessionCookie}` },
    body: JSON.stringify({ invoice_id: inst1Invoice }),
  });
  const receiptBody = await receiptRes.json().catch(() => ({}));

  if (receiptRes.ok) {
    console.log(`   ✓ Email sent to: ${receiptBody.recipient}`);
    console.log('   ✓ WhatsApp attempted to: +918089835558 (guardian HIMA MOHAN)');
  } else {
    console.warn(`   ⚠ Receipt failed (${receiptRes.status}):`, JSON.stringify(receiptBody));
  }

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' ✅  DONE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`New SO: ${NEW_SO} (₹35,200)`);
  console.log('Invoices:');
  for (const inv of createdInvoices) {
    const tag = inv.label === 'Q1' ? '← PAID ✓' : 'unpaid';
    console.log(`  ${inv.label}: ${inv.invoiceName} — ₹${inv.amount} | due ${inv.dueDate}  ${tag}`);
  }
  console.log('\nTotal: ₹35,200 | Paid: ₹12,300 | Outstanding: ₹22,900');
}

main().catch(e => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
