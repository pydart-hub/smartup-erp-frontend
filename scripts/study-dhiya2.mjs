// study-dhiya2.mjs — Focused study on DHIYA FATHIMA SA
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    ...opts,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// ─── 1. Student Record ────────────────────────────────────────
console.log('\n══ 1. STUDENT SEARCH: DHIYA FATHIMA SA ══');
const stuRes = await api(`${BASE}/api/resource/Student?filters=[["student_name","like","%DHIYA FATHIMA%"]]&fields=["name","student_name","student_email_id","student_mobile_number","joining_date","enabled"]&limit=10`);
console.log(JSON.stringify(stuRes.data, null, 2));

if (!stuRes.data.length) {
  console.log('Trying broader search...');
  const broad = await api(`${BASE}/api/resource/Student?filters=[["student_name","like","%Dhiya Fathima%"]]&fields=["name","student_name","student_email_id","student_mobile_number","joining_date"]&limit=10`);
  console.log(JSON.stringify(broad.data, null, 2));
}

const stu = stuRes.data[0] || { name: 'UNKNOWN' };
console.log('\n► Student ID:', stu.name, '|', stu.student_name);

// ─── 2. Program Enrollments ──────────────────────────────────
console.log('\n══ 2. PROGRAM ENROLLMENTS ══');
if (stu.name !== 'UNKNOWN') {
  const pes = await api(`${BASE}/api/resource/Program Enrollment?filters=[["student","=","${stu.name}"]]&fields=["name","program","academic_year","academic_term","enrollment_date","custom_fee_structure","custom_no_of_instalments","docstatus"]&limit=10`);
  console.log(JSON.stringify(pes.data, null, 2));

  for (const pe of pes.data) {
    const d = (await api(`${BASE}/api/resource/Program Enrollment/${pe.name}`)).data;
    console.log(`\n── PE ${pe.name} FULL ──`);
    console.log('  student:', d.student, '|', d.student_name);
    console.log('  program:', d.program);
    console.log('  academic_year:', d.academic_year);
    console.log('  enrollment_date:', d.enrollment_date);
    console.log('  custom_fee_structure:', d.custom_fee_structure);
    console.log('  custom_no_of_instalments:', d.custom_no_of_instalments);
    console.log('  docstatus:', d.docstatus);
  }
}

// ─── 3. Sales Orders for DHIYA FATHIMA SA ────────────────────
console.log('\n══ 3. SALES ORDERS ══');
const sos = await api(`${BASE}/api/resource/Sales Order?filters=[["customer","=","DHIYA FATHIMA SA"]]&fields=["name","customer","transaction_date","grand_total","status","per_billed","company"]&limit=10`);
console.log(JSON.stringify(sos.data, null, 2));

for (const so of sos.data) {
  const d = (await api(`${BASE}/api/resource/Sales Order/${so.name}`)).data;
  console.log(`\n── SO ${so.name} DETAIL ──`);
  console.log('  customer:', d.customer);
  console.log('  company:', d.company);
  console.log('  transaction_date:', d.transaction_date);
  console.log('  grand_total:', fmt(d.grand_total));
  console.log('  status:', d.status);
  console.log('  per_billed:', d.per_billed + '%');
  if (d.items?.length) {
    for (const it of d.items) {
      console.log('  item:', it.item_code, '| qty:', it.qty, '| rate:', fmt(it.rate), '| amount:', fmt(it.amount));
      console.log('  item_name_row:', it.name);
    }
  }
}

// ─── 4. Invoice Summary ──────────────────────────────────────
console.log('\n══ 4. INVOICE SUMMARY: DHIYA FATHIMA SA ══');
const invs = [
  { name: 'ACC-SINV-2026-04088', due: '2026-04-15', total: 2100, outstanding: 1100, status: 'Overdue' },
  { name: 'ACC-SINV-2026-04089', due: '2026-05-15', total: 2100, outstanding: 2100, status: 'Overdue' },
  { name: 'ACC-SINV-2026-04090', due: '2026-06-15', total: 2100, outstanding: 2100, status: 'Unpaid' },
  { name: 'ACC-SINV-2026-04091', due: '2026-07-15', total: 2100, outstanding: 2100, status: 'Unpaid' },
  { name: 'ACC-SINV-2026-04092', due: '2026-08-15', total: 2100, outstanding: 2100, status: 'Unpaid' },
  { name: 'ACC-SINV-2026-04093', due: '2026-09-15', total: 2100, outstanding: 2100, status: 'Unpaid' },
  { name: 'ACC-SINV-2026-04094', due: '2026-10-15', total: 2100, outstanding: 2100, status: 'Unpaid' },
  { name: 'ACC-SINV-2026-04095', due: '2026-11-15', total: 1600, outstanding: 1600, status: 'Unpaid' },
];
const grandTotal = invs.reduce((s, i) => s + i.total, 0);
const totalPaid = invs.reduce((s, i) => s + (i.total - i.outstanding), 0);
const totalOutstanding = invs.reduce((s, i) => s + i.outstanding, 0);

console.log(`\nInstalment Schedule:`);
invs.forEach((inv, i) => {
  const paid = inv.total - inv.outstanding;
  console.log(`  Inst ${i+1}: ${inv.due}  ${fmt(inv.total)}  paid=${fmt(paid)}  outstanding=${fmt(inv.outstanding)}  [${inv.status}]`);
});
console.log(`\n  Grand Total   : ${fmt(grandTotal)}`);
console.log(`  Total Paid    : ${fmt(totalPaid)}`);
console.log(`  Total Outstnd : ${fmt(totalOutstanding)}`);

// ─── 5. Payment Entry Detail ─────────────────────────────────
console.log('\n══ 5. PAYMENT ENTRY DETAIL: ACC-PAY-2026-04288 ══');
const pe = (await api(`${BASE}/api/resource/Payment Entry/ACC-PAY-2026-04288`)).data;
console.log('  party:', pe.party);
console.log('  posting_date:', pe.posting_date);
console.log('  paid_amount:', fmt(pe.paid_amount));
console.log('  mode_of_payment:', pe.mode_of_payment);
console.log('  reference_no:', pe.reference_no);
console.log('  references (invoices):', JSON.stringify(pe.references?.map(r => ({ inv: r.reference_name, allocated: r.allocated_amount })), null, 2));

// ─── 6. Fee Structure detail ─────────────────────────────────
console.log('\n══ 6. FEE STRUCTURE DETAILS ══');
// Based on 8 installments: 7×2100 + 1600 = 16,300
// Check which ERV fee structure this matches
const candidateFSs = ['SU ERV-10th State-Basic-8', 'SU ERV-10th State-Intermediate-8'];
for (const fsName of candidateFSs) {
  try {
    const fs = (await api(`${BASE}/api/resource/Fee Structure/${encodeURIComponent(fsName)}`)).data;
    console.log(`\n${fsName}:`);
    console.log('  total_amount:', fmt(fs.total_amount));
    console.log('  components:', JSON.stringify(fs.components?.map(c => ({ component: c.fees_category || c.description, amount: c.amount })), null, 2));
    if (fs.custom_installment_plan) {
      console.log('  custom_installment_plan:', JSON.stringify(fs.custom_installment_plan, null, 2));
    }
    // Print all keys that start with 'inst' or 'custom'
    for (const [k, v] of Object.entries(fs)) {
      if ((k.startsWith('inst') || k.startsWith('custom')) && v != null && v !== '' && v !== 0) {
        console.log(`  ${k}: ${v}`);
      }
    }
  } catch(e) {
    console.log(`${fsName}: ${e.message.slice(0, 60)}`);
  }
}

console.log('\n══ DONE ══');
