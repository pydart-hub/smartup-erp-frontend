/**
 * Fix missing Sales Order + 8 Sales Invoices for ADHARSH PS (SRR 030)
 * 
 * Student:    STU-SU VYT-26-030  (ADHARSH PS)
 * Customer:   ADHARSH PS
 * Program:    10th State
 * Branch:     Smart Up Vennala
 * Plan:       Basic, 8 instalments
 * Fee Struct: SU VYT-10th State-Basic-8  (total ₹25,000)
 * 
 * Amounts (from fee config, Vennala | Basic | 10 State):
 *   Inst 1-7: ₹3,300 each  → 7 × 3,300 = 23,100
 *   Inst 8:   ₹1,900        → 1 × 1,900 =  1,900
 *   Total:                                 25,000
 * 
 * Due dates (monthly Apr-Nov 2026):
 *   Apr 15, May 15, Jun 15, Jul 15, Aug 15, Sep 15, Oct 15, Nov 15
 */

const BASE    = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type':  'application/json',
};

const STUDENT_ID   = 'STU-SU VYT-26-030';
const CUSTOMER     = 'ADHARSH PS';
const COMPANY      = 'Smart Up Vennala';
const PROGRAM_ENRL = 'PEN-10th-Vennala 26-27-030';
const ACAD_YEAR    = '2026-2027';
const ITEM_CODE    = '10th State Tuition Fee';
const DEBIT_TO     = 'Debtors - SU VYT';
const INCOME_ACCT  = 'Sales - SU VYT';

// 8 instalments
const SCHEDULE = [
  { amount: 3300, dueDate: '2026-04-20', label: 'Inst 1' },  // backdated to today (Apr 15 past posting date)
  { amount: 3300, dueDate: '2026-05-15', label: 'Inst 2' },
  { amount: 3300, dueDate: '2026-06-15', label: 'Inst 3' },
  { amount: 3300, dueDate: '2026-07-15', label: 'Inst 4' },
  { amount: 3300, dueDate: '2026-08-15', label: 'Inst 5' },
  { amount: 3300, dueDate: '2026-09-15', label: 'Inst 6' },
  { amount: 3300, dueDate: '2026-10-15', label: 'Inst 7' },
  { amount: 1900, dueDate: '2026-11-15', label: 'Inst 8' },
];
const TOTAL = SCHEDULE.reduce((s, e) => s + e.amount, 0); // 25000

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}/api/${endpoint}`, {
    method,
    headers: HEADERS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${method} ${endpoint}:`, res.status, json?.exception || json?.message || JSON.stringify(json).slice(0, 200));
    throw new Error(`API error ${res.status}`);
  }
  return json.data;
}

// SO already created in previous run
const SO_NAME = 'SAL-ORD-2026-00577';
const SO_ITEM_ROW = '58ch16vmhi';

// ── Step 4: Create + Submit 8 Sales Invoices ────────────────────────────────
console.log('\n=== Step 4: Create & Submit 8 Sales Invoices ===');
const invoiceNames = [];

for (let i = 0; i < SCHEDULE.length; i++) {
  const inst = SCHEDULE[i];
  console.log(`\n  [${i+1}/8] ${inst.label}  ₹${inst.amount}  due ${inst.dueDate}`);

  // Create invoice
  const siPayload = {
    doctype: 'Sales Invoice',
    customer: CUSTOMER,
    company: COMPANY,
    posting_date: inst.dueDate,  // use due_date as posting_date so it's never before
    due_date: inst.dueDate,
    currency: 'INR',
    price_list: 'Standard Selling',
    customer_group: 'All Customer Groups',
    territory: 'All Territories',
    student: STUDENT_ID,
    custom_academic_year: ACAD_YEAR,
    debit_to: DEBIT_TO,
    items: [
      {
        item_code: ITEM_CODE,
        item_name: ITEM_CODE,
        qty: 1,
        rate: inst.amount,
        uom: 'Nos',
        conversion_factor: 1,
        income_account: INCOME_ACCT,
        sales_order: SO_NAME,
        so_detail: SO_ITEM_ROW,
      }
    ],
  };

  const siDoc = await api('POST', 'resource/Sales Invoice', siPayload);
  console.log(`    ✓ Created: ${siDoc.name}`);

  // Submit invoice
  await api('PUT', `resource/Sales Invoice/${encodeURIComponent(siDoc.name)}`, { docstatus: 1 });
  console.log(`    ✓ Submitted: ${siDoc.name}`);
  invoiceNames.push(siDoc.name);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n=== DONE ===');
console.log(`Student:  ADHARSH PS (STU-SU VYT-26-030)`);
console.log(`SO:       ${SO_NAME}  (₹${TOTAL})`);
console.log(`Invoices: ${invoiceNames.join(', ')}`);
console.log(`\n✓ All ${invoiceNames.length} invoices created and submitted.`);
