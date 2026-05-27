#!/usr/bin/env node
/**
 * Deep study: MILKA T SUNIL - Kadavanthra branch
 * Current: 4-installment plan, paid first installment ₹2000
 * Goal: Understand current state before changing to 8-installment plan
 */

import https from 'https';

const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const isResource = path.startsWith('/resource') || path.startsWith('/method');
    const fullPath = isResource ? `/api${path}` : `/api/resource${path}`;

    const options = {
      hostname: 'smartup.m.frappe.cloud',
      path: fullPath,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function makeResourceRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const options = {
      hostname: 'smartup.m.frappe.cloud',
      path: `/api/resource${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('DEEP STUDY: MILKA T SUNIL - INSTALLMENT PLAN CHANGE');
  console.log('='.repeat(60));

  // ── STEP 1: Find student ──────────────────────────────────────
  console.log('\n📋 STEP 1: Finding student MILKA T SUNIL...');
  const studentSearch = await makeResourceRequest('GET',
    '/Customer?filters=[["customer_name","like","%MILKA%"]]&fields=["name","customer_name"]&limit_page_length=10'
  );
  console.log('Customer search results:', JSON.stringify(studentSearch.data, null, 2));

  // Also try via Student doctype
  const studentSearch2 = await makeResourceRequest('GET',
    '/Student?filters=[["student_name","like","%MILKA%"]]&fields=["name","student_name","student_mobile_number"]&limit_page_length=10'
  );
  console.log('\nStudent search results:', JSON.stringify(studentSearch2.data, null, 2));

  if (!studentSearch2.data || studentSearch2.data.length === 0) {
    console.log('\n⚠️  No Student found. Trying Program Enrollment...');
    const peSearch = await makeResourceRequest('GET',
      '/Program%20Enrollment?filters=[["student_name","like","%MILKA%"]]&fields=["name","student","student_name","program","company","custom_plan","custom_no_of_instalments","academic_year"]&limit_page_length=10'
    );
    console.log('Program Enrollment search:', JSON.stringify(peSearch.data, null, 2));
    return;
  }

  const student = studentSearch2.data[0];
  const studentId = student.name;
  console.log(`\n✅ Found: ${student.student_name} (${studentId})`);

  // ── STEP 2: Program Enrollment ────────────────────────────────
  console.log('\n📋 STEP 2: Fetching Program Enrollment(s)...');
  const enrollments = await makeResourceRequest('GET',
    `/Program%20Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","student","student_name","program","company","custom_plan","custom_no_of_instalments","academic_year","docstatus","enrollment_date"]&limit_page_length=10`
  );
  console.log('Program Enrollments:', JSON.stringify(enrollments.data, null, 2));

  if (!enrollments.data || enrollments.data.length === 0) {
    console.log('⚠️  No enrollments found for student.');
    return;
  }

  for (const enr of enrollments.data) {
    console.log(`\n── Enrollment: ${enr.name} ──`);
    console.log(`   Student: ${enr.student_name}`);
    console.log(`   Program: ${enr.program}`);
    console.log(`   Company: ${enr.company}`);
    console.log(`   Plan: ${enr.custom_plan}`);
    console.log(`   Instalments: ${enr.custom_no_of_instalments}`);
    console.log(`   Academic Year: ${enr.academic_year}`);
    console.log(`   Docstatus: ${enr.docstatus}`);
    console.log(`   Enrollment Date: ${enr.enrollment_date}`);

    // ── STEP 3: Sales Invoices for this student ───────────────
    console.log(`\n📋 STEP 3: Sales Invoices for ${studentId}...`);
    const invoices = await makeResourceRequest('GET',
      `/Sales Invoice?filters=[["customer","=","${studentId}"]]&fields=["name","customer","customer_name","grand_total","outstanding_amount","due_date","posting_date","docstatus","status","company","is_return","amended_from"]&order_by=posting_date asc&limit_page_length=0`
    );
    console.log(`\nSales Invoices (${invoices.data?.length || 0} found):`);
    for (const inv of (invoices.data || [])) {
      console.log(`  ${inv.name}: ₹${inv.grand_total} | Outstanding: ₹${inv.outstanding_amount} | Due: ${inv.due_date} | Status: ${inv.status} | Docstatus: ${inv.docstatus}`);
    }

    // ── STEP 4: Payment Entries for this student ──────────────
    console.log(`\n📋 STEP 4: Payment Entries for ${studentId}...`);
    const payments = await makeResourceRequest('GET',
      `/Payment Entry?filters=[["party","=","${studentId}"],["payment_type","=","Receive"],["docstatus","=","1"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","posting_date","reference_no","docstatus"]&order_by=posting_date asc&limit_page_length=0`
    );
    console.log(`\nPayment Entries (${payments.data?.length || 0} found):`);
    for (const pe of (payments.data || [])) {
      console.log(`  ${pe.name}: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Date: ${pe.posting_date}`);
    }

    // ── STEP 5: Fee Structure details ────────────────────────
    console.log(`\n📋 STEP 5: Fee Structures for Kadavanthra with 4-inst plan...`);
    const feeStructures = await makeResourceRequest('GET',
      `/Fee Structure?filters=[["company","like","%Kadavanthra%"],["custom_no_of_instalments","=","4"],["docstatus","=","1"]]&fields=["name","program","company","custom_plan","custom_no_of_instalments","total_amount","academic_year","docstatus"]&limit_page_length=50`
    );
    console.log(`Fee Structures (4-inst):`);
    for (const fs of (feeStructures.data || [])) {
      console.log(`  ${fs.name}: ${fs.program} | Plan: ${fs.custom_plan} | Total: ₹${fs.total_amount} | AY: ${fs.academic_year}`);
    }

    console.log(`\n📋 Fee Structures for Kadavanthra with 8-inst plan...`);
    const feeStructures8 = await makeResourceRequest('GET',
      `/Fee Structure?filters=[["company","like","%Kadavanthra%"],["custom_no_of_instalments","=","8"],["docstatus","=","1"]]&fields=["name","program","company","custom_plan","custom_no_of_instalments","total_amount","academic_year","docstatus"]&limit_page_length=50`
    );
    console.log(`Fee Structures (8-inst):`);
    for (const fs of (feeStructures8.data || [])) {
      console.log(`  ${fs.name}: ${fs.program} | Plan: ${fs.custom_plan} | Total: ₹${fs.total_amount} | AY: ${fs.academic_year}`);
    }
  }

  // ── STEP 6: Check invoice items (to understand fee structure used) ─
  if (enrollments.data?.length > 0) {
    const studentId2 = enrollments.data[0]?.student || studentId;
    console.log('\n📋 STEP 6: Invoice items detail for first invoice...');
    const invoices2 = await makeResourceRequest('GET',
      `/Sales Invoice?filters=[["customer","=","${studentId2}"]]&fields=["name","grand_total","outstanding_amount","due_date","docstatus","status"]&order_by=posting_date asc&limit_page_length=1`
    );
    if (invoices2.data?.length > 0) {
      const firstInv = invoices2.data[0];
      const invDetail = await makeResourceRequest('GET', `/Sales Invoice/${firstInv.name}`);
      console.log('First Invoice Detail:', JSON.stringify({
        name: invDetail.data?.name,
        grand_total: invDetail.data?.grand_total,
        outstanding_amount: invDetail.data?.outstanding_amount,
        items: invDetail.data?.items,
        custom_fee_structure: invDetail.data?.custom_fee_structure,
        custom_no_of_instalments: invDetail.data?.custom_no_of_instalments,
        custom_plan: invDetail.data?.custom_plan,
      }, null, 2));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('STUDY COMPLETE');
  console.log('='.repeat(60));
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
