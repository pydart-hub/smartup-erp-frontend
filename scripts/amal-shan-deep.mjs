const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function api(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) {
    const msg = j.exception || j._server_messages || JSON.stringify(j);
    throw new Error(msg);
  }
  return j;
}

async function main() {
  const studentId = 'STU-SU KDV-26-011';

  // Fee schedules
  console.log('=== Fee Schedules ===');
  try {
    const fees = await api(`/api/resource/Fees?filters=[["student","=","${studentId}"]]&fields=["name","student","program","academic_term","due_date","grand_total","outstanding_amount"]&limit=20`);
    console.log(JSON.stringify(fees.data, null, 2));

    // Get full detail of each fee record
    for (const f of (fees.data || [])) {
      console.log(`\n=== Fee Detail: ${f.name} ===`);
      try {
        const detail = await api(`/api/resource/Fees/${f.name}`);
        const d = detail.data;
        console.log(`  grand_total: ${d.grand_total}`);
        console.log(`  outstanding_amount: ${d.outstanding_amount}`);
        console.log(`  status: ${d.status}`);
        console.log(`  due_date: ${d.due_date}`);
        console.log(`  program: ${d.program}`);
        console.log(`  student_email: ${d.student_email}`);
        if (d.components) console.log(`  components:`, JSON.stringify(d.components, null, 4));
      } catch (e) { console.log('  Detail error:', e.message); }
    }
  } catch (e) { console.log('Fees error:', e.message); }

  // Check Payment Entries (party = student)
  console.log('\n=== Payment Entries (party = student) ===');
  try {
    const pe = await api(`/api/resource/Payment Entry?filters=[["party","=","${studentId}"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","reference_no","docstatus","posting_date"]&limit=20`);
    console.log(JSON.stringify(pe.data, null, 2));
  } catch (e) { console.log('PE error:', e.message); }

  // Search by Razorpay ID in all Payment Entries
  console.log('\n=== Payment Entry by Razorpay ID: pay_Sm5AAbdgSjRqFn ===');
  try {
    const rz = await api(`/api/resource/Payment Entry?filters=[["reference_no","=","pay_Sm5AAbdgSjRqFn"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","reference_no","docstatus","posting_date"]&limit=5`);
    console.log(JSON.stringify(rz.data, null, 2));
  } catch (e) { console.log('Razorpay PE search error:', e.message); }

  // Check Sales Invoice
  console.log('\n=== Sales Invoices for student ===');
  try {
    const si = await api(`/api/resource/Sales Invoice?filters=[["customer","=","${studentId}"]]&fields=["name","customer","customer_name","grand_total","outstanding_amount","docstatus","posting_date"]&limit=20`);
    console.log(JSON.stringify(si.data, null, 2));
  } catch (e) { console.log('SI error:', e.message); }

  // Check Journal Entry linked to Razorpay
  console.log('\n=== Journal Entry by Razorpay ID ===');
  try {
    const je = await api(`/api/resource/Journal Entry?filters=[["cheque_no","=","pay_Sm5AAbdgSjRqFn"]]&fields=["name","cheque_no","total_debit","docstatus","posting_date","user_remark"]&limit=5`);
    console.log(JSON.stringify(je.data, null, 2));
  } catch (e) { console.log('JE error:', e.message); }

  // Check Payment Request for the student
  console.log('\n=== Payment Requests ===');
  try {
    const pr = await api(`/api/resource/Payment Request?filters=[["party","=","${studentId}"]]&fields=["name","party","party_name","grand_total","status","docstatus","razorpay_payment_id"]&limit=10`);
    console.log(JSON.stringify(pr.data, null, 2));
  } catch (e) { console.log('PR error:', e.message); }

  // Look for custom Razorpay doctype
  console.log('\n=== Razorpay Settings (to understand setup) ===');
  try {
    const rzs = await api(`/api/resource/Razorpay Settings`);
    console.log(JSON.stringify(rzs.data, null, 2));
  } catch (e) { console.log('Razorpay Settings error:', e.message); }
}

main().catch(console.error);
