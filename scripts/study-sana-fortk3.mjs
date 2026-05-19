import https from 'https';

function apiFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

function buildUrl(doctype, filters, fields, limit) {
  const f = encodeURIComponent(JSON.stringify(filters));
  const fl = encodeURIComponent(JSON.stringify(fields));
  const lim = limit || 50;
  return `${BASE}/api/resource/${encodeURIComponent(doctype)}?filters=${f}&fields=${fl}&limit_page_length=${lim}`;
}

async function getList(doctype, filters, fields, limit) {
  const url = buildUrl(doctype, filters, fields, limit);
  const res = await apiFetch(url, { headers: { Authorization: AUTH } });
  return res.data || [];
}

async function getDoc(doctype, name) {
  const url = `${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  const res = await apiFetch(url, { headers: { Authorization: AUTH } });
  return res.data;
}

const STU_ID = 'STU-SU FKO-26-091';

async function main() {
  console.log('=== SANA FATHIMA TS — STU-SU FKO-26-091 — Deep Study ===\n');

  // 1. Full student doc
  console.log('--- 1. Student Document ---');
  const s = await getDoc('Student', STU_ID);
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
  const peList = await getList('Program Enrollment',
    [['student', '=', STU_ID]],
    ['name', 'student', 'student_name', 'program', 'custom_branch', 'academic_year',
     'enrollment_date', 'custom_fee_structure', 'custom_no_of_instalments',
     'custom_billing_start_date', 'custom_demo', 'docstatus']
  );
  console.log(JSON.stringify(peList, null, 2));

  for (const pe of peList) {
    console.log('\n--- PE Full Doc:', pe.name, '---');
    const p = await getDoc('Program Enrollment', pe.name);
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
    }, null, 2));
  }

  // 3. Sales Orders
  console.log('\n--- 3. Sales Orders ---');
  const soList = await getList('Sales Order',
    [['customer', '=', STU_ID]],
    ['name', 'customer', 'customer_name', 'status', 'grand_total', 'advance_paid',
     'transaction_date', 'custom_branch', 'per_billed', 'docstatus']
  );
  console.log(JSON.stringify(soList, null, 2));

  for (const so of soList) {
    console.log('\n--- SO Full Doc:', so.name, '---');
    const d = await getDoc('Sales Order', so.name);
    console.log(JSON.stringify({
      name: d.name,
      customer: d.customer,
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
      docstatus: d.docstatus,
      items: d.items && d.items.map(i => ({
        item_code: i.item_code,
        item_name: i.item_name,
        qty: i.qty,
        rate: i.rate,
        amount: i.amount,
        billed_amt: i.billed_amt,
        delivered_qty: i.delivered_qty,
      })),
    }, null, 2));
  }

  // 4. Sales Invoices
  console.log('\n--- 4. Sales Invoices ---');
  const sinvList = await getList('Sales Invoice',
    [['customer', '=', STU_ID]],
    ['name', 'customer', 'customer_name', 'status', 'grand_total', 'outstanding_amount',
     'due_date', 'posting_date', 'custom_installment_number', 'custom_branch', 'docstatus']
  );
  console.log('Count:', sinvList.length);
  console.log(JSON.stringify(sinvList, null, 2));

  // 5. Payment Entries
  console.log('\n--- 5. Payment Entries ---');
  const payList = await getList('Payment Entry',
    [['party', '=', STU_ID]],
    ['name', 'party', 'party_name', 'paid_amount', 'payment_type', 'reference_no',
     'posting_date', 'custom_branch', 'docstatus', 'paid_to', 'paid_from']
  );
  console.log('Count:', payList.length);
  console.log(JSON.stringify(payList, null, 2));

  // 6. Fort Kochi Fee Structures
  console.log('\n--- 6. Fort Kochi / SU FKO Fee Structures ---');
  const fsList = await getList('Fee Structure',
    [['custom_branch', 'like', '%FKO%']],
    ['name', 'custom_branch', 'program', 'academic_year', 'total_amount'],
    50
  );
  console.log(JSON.stringify(fsList, null, 2));

  const fsList2 = await getList('Fee Structure',
    [['custom_branch', 'like', '%Fort%']],
    ['name', 'custom_branch', 'program', 'academic_year', 'total_amount'],
    50
  );
  console.log('Fort search:', JSON.stringify(fsList2, null, 2));

  console.log('\n=== STUDY COMPLETE ===');
}

main().catch(console.error);
