// study-dhiya.mjs — Deep study of Dhiya Fathima SA (Ervaveli branch)
import { setTimeout as sleep } from 'timers/promises';

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

const fmt = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : 'N/A');
const sep = (ch = '─', len = 60) => console.log(ch.repeat(len));

// ─── 1. Find student ────────────────────────────────────────────
console.log('\n══ 1. STUDENT SEARCH ══');
const stuSearch = await api(`${BASE}/api/resource/Student?filters=[["student_name","like","%Dhiya%"]]&fields=["name","student_name","student_email_id","student_mobile_number"]&limit=30`);
console.log('Matches:', JSON.stringify(stuSearch.data, null, 2));

if (!stuSearch.data.length) throw new Error('No student found with name containing Dhiya');

// Pick the one from Ervaveli (filter by name pattern or just show all)
let student = stuSearch.data.find(s => s.student_name.toLowerCase().includes('dhiya fathima')) || stuSearch.data[0];
console.log('\n► Studying:', student.name, '|', student.student_name);

// ─── 2. Full student record ──────────────────────────────────────
console.log('\n══ 2. FULL STUDENT RECORD ══');
const stu = (await api(`${BASE}/api/resource/Student/${student.name}`)).data;
console.log(JSON.stringify(stu, null, 2));

// ─── 3. Program Enrollments ──────────────────────────────────────
console.log('\n══ 3. PROGRAM ENROLLMENTS ══');
const pes = await api(`${BASE}/api/resource/Program Enrollment?filters=[["student","=","${student.name}"]]&fields=["name","program","academic_year","academic_term","enrollment_date","custom_fee_structure","custom_no_of_instalments","docstatus"]&limit=20`);
console.log(JSON.stringify(pes.data, null, 2));

for (const pe of pes.data) {
  console.log(`\n── PE Details: ${pe.name} ──`);
  const peDetail = (await api(`${BASE}/api/resource/Program Enrollment/${pe.name}`)).data;
  console.log(JSON.stringify(peDetail, null, 2));
  await sleep(200);
}

// ─── 4. Sales Orders ────────────────────────────────────────────
console.log('\n══ 4. SALES ORDERS ══');
const sos = await api(`${BASE}/api/resource/Sales Order?filters=[["customer","like","%Dhiya%"]]&fields=["name","customer","transaction_date","grand_total","status","per_billed","company"]&limit=20`);
console.log(JSON.stringify(sos.data, null, 2));

// Also search by student name variants
const sos2 = await api(`${BASE}/api/resource/Sales Order?filters=[["customer","like","%dhiya%"]]&fields=["name","customer","transaction_date","grand_total","status","per_billed","company"]&limit=20`);
if (sos2.data.length) {
  console.log('Also found (case-insensitive):', JSON.stringify(sos2.data, null, 2));
}

for (const so of sos.data) {
  console.log(`\n── SO Detail: ${so.name} ──`);
  const soDetail = (await api(`${BASE}/api/resource/Sales Order/${so.name}`)).data;
  console.log(JSON.stringify(soDetail, null, 2));
  await sleep(200);
}

// ─── 5. Sales Invoices ──────────────────────────────────────────
console.log('\n══ 5. SALES INVOICES ══');
const sinvs = await api(`${BASE}/api/resource/Sales Invoice?filters=[["customer","like","%Dhiya%"]]&fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&limit=50&order_by=posting_date asc`);
console.log(JSON.stringify(sinvs.data, null, 2));

// ─── 6. Payment Entries ─────────────────────────────────────────
console.log('\n══ 6. PAYMENT ENTRIES ══');
const pes2 = await api(`${BASE}/api/resource/Payment Entry?filters=[["party","like","%Dhiya%"]]&fields=["name","party","posting_date","paid_amount","payment_type","reference_no","mode_of_payment","docstatus"]&limit=30&order_by=posting_date asc`);
console.log(JSON.stringify(pes2.data, null, 2));

// ─── 7. Payment Entry References (per invoice) ──────────────────
console.log('\n══ 7. PAYMENT REFERENCES PER INVOICE ══');
for (const inv of sinvs.data) {
  if (inv.docstatus === 2) { console.log(`${inv.name}: CANCELLED`); continue; }
  // Fetch payment entries that reference this invoice
  try {
    const refs = await api(`${BASE}/api/resource/Payment Entry?filters=[["Payment Entry Reference","reference_name","=","${inv.name}"]]&fields=["name","party","posting_date","paid_amount","payment_type","mode_of_payment","docstatus"]&limit=10`);
    if (refs.data.length) {
      console.log(`\n${inv.name} (due ${inv.due_date}, ${fmt(inv.grand_total)}, status=${inv.status}):`);
      for (const ref of refs.data) {
        console.log(`  PE: ${ref.name} | date: ${ref.posting_date} | paid: ${fmt(ref.paid_amount)} | mode: ${ref.mode_of_payment}`);
      }
    } else {
      console.log(`${inv.name} (due ${inv.due_date}, ${fmt(inv.grand_total)}, status=${inv.status}): NO payment`);
    }
  } catch(e) {
    console.log(`${inv.name}: Error fetching payment refs: ${e.message.slice(0,80)}`);
  }
  await sleep(150);
}

// ─── 8. Fee Structure lookup ─────────────────────────────────────
console.log('\n══ 8. FEE STRUCTURES (Ervaveli) ══');
const fss = await api(`${BASE}/api/resource/Fee Structure?filters=[["name","like","%ERV%"]]&fields=["name","program","academic_year","total_amount"]&limit=30`);
console.log(JSON.stringify(fss.data, null, 2));

console.log('\n══ STUDY COMPLETE ══');
