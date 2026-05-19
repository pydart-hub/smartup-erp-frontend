import https from 'https';

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ json: () => JSON.parse(data), status: res.statusCode }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  Authorization: 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
};

async function api(path) {
  const res = await fetch(`${BASE}/api${path}`, { headers: HEADERS });
  return res.json();
}

const STU_ID = 'STU-SU FKO-26-091';

async function main() {
  console.log(`=== SANA FATHIMA TS — ${STU_ID} — Deep Study ===\n`);

  // 1. Full student doc
  console.log('--- 1. Full Student Document ---');
  const stuDoc = await api(`/resource/Student/${encodeURIComponent(STU_ID)}`);
  const s = stuDoc.data;
  console.log(JSON.stringify({
    name: s.name,
    student_name: s.student_name,
    custom_branch: s.custom_branch,
    enabled: s.enabled,
    custom_student_type: s.custom_student_type,
    custom_demo_converted: s.custom_demo_converted,
    custom_demo: s.custom_demo,
    student_email_id: s.student_email_id,
    custom_student_mobile_number: s.custom_student_mobile_number,
    joining_date: s.joining_date,
    custom_guardian_name: s.custom_guardian_name,
    custom_guardian_mobile: s.custom_guardian_mobile,
  }, null, 2));

  // 2. Program Enrollments
  console.log('\n--- 2. Program Enrollments ---');
  const peListRes = await api(`/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([["student","=",STU_ID]])}&fields=${encodeURIComponent(JSON.stringify(["name","student","student_name","program","custom_branch","academic_year","enrollment_date","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","custom_demo","docstatus"]))}&limit_page_length=20`);
  console.log(JSON.stringify(peListRes.data, null, 2));

  if (peListRes.data && peListRes.data.length > 0) {
    for (const pe of peListRes.data) {
      console.log(`\n--- PE Full Doc: ${pe.name} ---`);
      const peDoc = await api(`/resource/Program Enrollment/${encodeURIComponent(pe.name)}`);
      const p = peDoc.data;
      console.log(JSON.stringify({
        name: p.name,
        student: p.student,
        student_name: p.student_name,
        program: p.program,
        custom_branch: p.custom_branch,
        academic_year: p.academic_year,
        enrollment_date: p.enrollment_date,
        custom_fee_structure: p.custom_fee_structure,
        custom_no_of_instalments: p.custom_no_of_instalments,
        custom_billing_start_date: p.custom_billing_start_date,
        custom_demo: p.custom_demo,
        docstatus: p.docstatus,
        fees: p.fees,
        courses: p.courses,
      }, null, 2));
    }
  }

  // 3. Sales Orders
  console.log('\n--- 3. Sales Orders ---');
  const soRes = await api(`/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["customer","=",STU_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","custom_branch","delivery_status","per_billed"]))}&limit_page_length=20`);
  console.log(JSON.stringify(soRes.data, null, 2));

  if (soRes.data && soRes.data.length > 0) {
    for (const so of soRes.data) {
      console.log(`\n--- SO Full Doc: ${so.name} ---`);
      const soDoc = await api(`/resource/Sales Order/${encodeURIComponent(so.name)}`);
      const d = soDoc.data;
      console.log(JSON.stringify({
        name: d.name,
        customer: d.customer,
        customer_name: d.customer_name,
        status: d.status,
        grand_total: d.grand_total,
        advance_paid: d.advance_paid,
        per_billed: d.per_billed,
        transaction_date: d.transaction_date,
        custom_branch: d.custom_branch,
        custom_fee_structure: d.custom_fee_structure,
        custom_no_of_instalments: d.custom_no_of_instalments,
        custom_billing_start_date: d.custom_billing_start_date,
        custom_demo: d.custom_demo,
        items: d.items?.map(i => ({ item_code: i.item_code, item_name: i.item_name, qty: i.qty, rate: i.rate, amount: i.amount, billed_amt: i.billed_amt })),
        docstatus: d.docstatus,
      }, null, 2));
    }
  }

  // 4. Sales Invoices
  console.log('\n--- 4. Sales Invoices ---');
  const sinvRes = await api(`/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer","=",STU_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","customer","customer_name","status","grand_total","outstanding_amount","due_date","posting_date","custom_installment_number","custom_branch","docstatus"]))}&limit_page_length=50`);
  console.log(JSON.stringify(sinvRes.data, null, 2));

  // 5. Payment Entries
  console.log('\n--- 5. Payment Entries ---');
  const payRes = await api(`/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party","=",STU_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","paid_amount","payment_type","reference_no","posting_date","custom_branch","docstatus","paid_to","paid_from"]))}&limit_page_length=20`);
  console.log(JSON.stringify(payRes.data, null, 2));

  // 6. Fee Structure for Fort Kochi
  console.log('\n--- 6. Fort Kochi Fee Structures ---');
  const fsRes = await api(`/resource/Fee Structure?filters=${encodeURIComponent(JSON.stringify([["custom_branch","like","%Fort%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","custom_branch","program","academic_year","total_amount"]))}&limit_page_length=30`);
  console.log(JSON.stringify(fsRes.data, null, 2));

  // 7. Fee Structure for SU FKO specifically
  console.log('\n--- 7. SU FKO Fee Structures ---');
  const fsRes2 = await api(`/resource/Fee Structure?filters=${encodeURIComponent(JSON.stringify([["custom_branch","like","%FKO%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","custom_branch","program","academic_year","total_amount"]))}&limit_page_length=30`);
  console.log(JSON.stringify(fsRes2.data, null, 2));

  console.log('\n=== STUDY COMPLETE ===');
}

main().catch(console.error);
