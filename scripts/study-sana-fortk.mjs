import https from 'https';
import http from 'http';

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ json: () => JSON.parse(data), text: () => data, status: res.statusCode }));
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
  const json = await res.json();
  return json;
}

async function main() {
  console.log('=== SANA FATHIMA TS — Fort Kochi Branch Study ===\n');

  // 1. Search for student
  console.log('--- 1. Student Search ---');
  const stuSearch = await api('/resource/Student?filters=[["student_name","like","%SANA FATHIMA%"]]&fields=["name","student_name","custom_branch","student_email_id","custom_student_mobile_number","enabled"]&limit_page_length=20');
  console.log(JSON.stringify(stuSearch.data, null, 2));

  if (!stuSearch.data || stuSearch.data.length === 0) {
    console.log('No student found. Trying partial...');
    const alt = await api('/resource/Student?filters=[["student_name","like","%SANA%"],["custom_branch","like","%Fort%"]]&fields=["name","student_name","custom_branch","enabled"]&limit_page_length=20');
    console.log(JSON.stringify(alt.data, null, 2));
    return;
  }

  const student = stuSearch.data.find(s => s.custom_branch?.toLowerCase().includes('fort') || s.student_name?.toLowerCase().includes('sana'));
  const stu = student || stuSearch.data[0];
  const stuId = stu.name;
  console.log(`\nFound: ${stuId} — ${stu.student_name} | Branch: ${stu.custom_branch}`);

  // 2. Full student doc
  console.log('\n--- 2. Full Student Document ---');
  const stuDoc = await api(`/resource/Student/${encodeURIComponent(stuId)}`);
  const s = stuDoc.data;
  console.log(JSON.stringify({
    name: s.name,
    student_name: s.student_name,
    custom_branch: s.custom_branch,
    enabled: s.enabled,
    custom_student_type: s.custom_student_type,
    custom_demo_converted: s.custom_demo_converted,
    student_email_id: s.student_email_id,
    custom_student_mobile_number: s.custom_student_mobile_number,
    joining_date: s.joining_date,
  }, null, 2));

  // 3. Program Enrollments
  console.log('\n--- 3. Program Enrollments ---');
  const peList = await api(`/resource/Program Enrollment?filters=[["student","=","${stuId}"]]&fields=["name","student","student_name","program","custom_branch","academic_year","enrollment_date","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","custom_demo","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(peList.data, null, 2));

  if (peList.data && peList.data.length > 0) {
    for (const pe of peList.data) {
      console.log(`\n--- PE Detail: ${pe.name} ---`);
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

  // 4. Sales Orders
  console.log('\n--- 4. Sales Orders ---');
  const soList = await api(`/resource/Sales Order?filters=[["customer","like","%${stuId}%"]]&fields=["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","custom_branch"]&limit_page_length=20`);
  console.log('By student ID:', JSON.stringify(soList.data, null, 2));

  // Try by name
  const soByName = await api(`/resource/Sales Order?filters=[["customer_name","like","%SANA FATHIMA%"]]&fields=["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","custom_branch"]&limit_page_length=20`);
  console.log('By customer name:', JSON.stringify(soByName.data, null, 2));

  // 5. Sales Invoices
  console.log('\n--- 5. Sales Invoices ---');
  const sinvList = await api(`/resource/Sales Invoice?filters=[["customer","like","%${stuId}%"]]&fields=["name","customer","customer_name","status","grand_total","outstanding_amount","due_date","posting_date","custom_installment_number","custom_branch"]&limit_page_length=50`);
  console.log('By student ID:', JSON.stringify(sinvList.data, null, 2));

  const sinvByName = await api(`/resource/Sales Invoice?filters=[["customer_name","like","%SANA FATHIMA%"],["custom_branch","like","%Fort%"]]&fields=["name","customer","customer_name","status","grand_total","outstanding_amount","due_date","posting_date","custom_installment_number","custom_branch"]&limit_page_length=50`);
  console.log('By name+branch:', JSON.stringify(sinvByName.data, null, 2));

  // 6. Payment Entries
  console.log('\n--- 6. Payment Entries ---');
  const peByParty = await api(`/resource/Payment Entry?filters=[["party","like","%${stuId}%"]]&fields=["name","party","party_name","paid_amount","payment_type","reference_no","posting_date","custom_branch","docstatus"]&limit_page_length=20`);
  console.log('By student ID:', JSON.stringify(peByParty.data, null, 2));

  const peByName2 = await api(`/resource/Payment Entry?filters=[["party_name","like","%SANA FATHIMA%"]]&fields=["name","party","party_name","paid_amount","payment_type","reference_no","posting_date","custom_branch","docstatus"]&limit_page_length=20`);
  console.log('By name:', JSON.stringify(peByName2.data, null, 2));

  // 7. Fee Schedule entries
  console.log('\n--- 7. Fee Schedule ---');
  const fsList = await api(`/resource/Fee Schedule?filters=[["student","=","${stuId}"]]&fields=["name","student","student_name","program","due_date","total_amount","outstanding_amount","status"]&limit_page_length=20`);
  console.log(JSON.stringify(fsList.data, null, 2));

  // 8. Check the fee structure for Fort Kochi
  console.log('\n--- 8. Fort Kochi Fee Structures ---');
  const feeList = await api('/resource/Fee Structure?filters=[["custom_branch","like","%Fort%"]]&fields=["name","custom_branch","program","academic_year","total_amount"]&limit_page_length=20');
  console.log(JSON.stringify(feeList.data, null, 2));

  console.log('\n=== STUDY COMPLETE ===');
}

main().catch(console.error);
