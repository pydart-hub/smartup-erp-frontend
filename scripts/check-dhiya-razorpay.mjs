// check-dhiya-razorpay.mjs — Check if pay_SoMHUz17KL259K is recorded
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const api = async (url) => {
  const r = await fetch(url, { headers: { Authorization: AUTH, 'Content-Type': 'application/json' } });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
};

const RAZORPAY_ID = 'pay_SoMHUz17KL259K';
const CUSTOMER = 'DHIYA FATHIMA SA';

// 1. Check if PE already exists with this Razorpay ID
console.log('== 1. Search by Razorpay reference_no ==');
const byRef = await api(`${BASE}/api/resource/Payment Entry?filters=[["reference_no","=","${RAZORPAY_ID}"]]&fields=["name","party","posting_date","paid_amount","reference_no","mode_of_payment","docstatus"]&limit=5`);
console.log(JSON.stringify(byRef.data, null, 2));

// 2. All payment entries for this customer
console.log('\n== 2. All PEs for DHIYA FATHIMA SA ==');
const allPes = await api(`${BASE}/api/resource/Payment Entry?filters=[["party","=","${CUSTOMER}"]]&fields=["name","party","posting_date","paid_amount","reference_no","mode_of_payment","docstatus"]&limit=20&order_by=posting_date desc`);
console.log(JSON.stringify(allPes.data, null, 2));

// 3. Current status of Inst 1
console.log('\n== 3. Inst 1 (SINV-04088) current status ==');
const inv = (await api(`${BASE}/api/resource/Sales Invoice/ACC-SINV-2026-04088`)).data;
console.log('outstanding_amount:', inv.outstanding_amount);
console.log('grand_total:', inv.grand_total);
console.log('status:', inv.status);
console.log('docstatus:', inv.docstatus);

console.log('\n== DONE ==');
