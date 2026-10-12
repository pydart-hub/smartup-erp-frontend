const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function fetchRetry(url, options = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.log(`Fetch retry ${i + 1}/${retries}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function main() {
  const studentId = 'STU-SU MMK-26-060';
  const customerName = 'MARY ALIYA P J';

  // 1. Student Doc
  const stuRes = await (await fetchRetry(`${baseUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, { headers })).json();
  console.log('=== STUDENT DETAILS ===');
  console.log({
    name: stuRes.data?.name,
    student_name: stuRes.data?.student_name,
    branch: stuRes.data?.custom_branch,
    srr_id: stuRes.data?.custom_srr_id,
    batch: stuRes.data?.custom_batch,
    course: stuRes.data?.custom_course
  });

  // 2. Program Enrollment
  const penRes = await (await fetchRetry(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${encodeURIComponent(studentId)}"]]&fields=["*"]`, { headers })).json();
  console.log('\n=== PROGRAM ENROLLMENT ===');
  console.log(JSON.stringify(penRes.data, null, 2));

  // 3. Sales Order
  const soRes = await (await fetchRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["*"]`, { headers })).json();
  console.log('\n=== SALES ORDERS ===');
  console.log(JSON.stringify(soRes.data, null, 2));

  // 4. Sales Invoices
  const invRes = await (await fetchRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('\n=== SALES INVOICES ===');
  console.log(JSON.stringify(invRes.data, null, 2));

  // 5. Payment Entries
  const peRes = await (await fetchRetry(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","mode_of_payment","paid_amount","paid_to","paid_from","reference_no","reference_date","docstatus","remarks"]&order_by=posting_date asc`, { headers })).json();
  console.log('\n=== PAYMENT ENTRIES ===');
  console.log(JSON.stringify(peRes.data, null, 2));

  // 6. Check Payment Entry References
  if (peRes.data && peRes.data.length > 0) {
    for (const pe of peRes.data) {
      const peDetail = await (await fetchRetry(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers })).json();
      console.log(`\n=== PE DETAILS FOR ${pe.name} ===`);
      console.log('References:', JSON.stringify(peDetail.data?.references, null, 2));
    }
  }

  // 7. Check Sales Order Details (items & payment schedule)
  if (soRes.data && soRes.data.length > 0) {
    for (const so of soRes.data) {
      const soDetail = await (await fetchRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(so.name)}`, { headers })).json();
      console.log(`\n=== SO DETAILS FOR ${so.name} ===`);
      console.log('Items:', JSON.stringify(soDetail.data?.items, null, 2));
      console.log('Payment Schedule:', JSON.stringify(soDetail.data?.payment_schedule, null, 2));
      console.log('Payment Terms Template:', soDetail.data?.payment_terms_template);
    }
  }

  // 8. Fee structures in Frappe matching 9th State / Moolamkuzhi
  const fsRes = await (await fetchRetry(`${baseUrl}/api/resource/Fee Structure?filters=[["name","like","%9%"],["name","like","%State%"]]&fields=["name","total_amount","program"]`, { headers })).json();
  console.log('\n=== FEE STRUCTURES (9th State) ===');
  console.log(JSON.stringify(fsRes.data, null, 2));

  // Also search Payment Terms Template
  const pttRes = await (await fetchRetry(`${baseUrl}/api/resource/Payment Terms Template?fields=["name"]&limit_page_length=100`, { headers })).json();
  console.log('\n=== PAYMENT TERMS TEMPLATES ===');
  const mmkTemplates = pttRes.data?.filter(t => t.name.toLowerCase().includes('moolamkuzhi') || t.name.toLowerCase().includes('mmk') || t.name.toLowerCase().includes('8') || t.name.toLowerCase().includes('21000') || t.name.toLowerCase().includes('9'));
  console.log(JSON.stringify(mmkTemplates, null, 2));
}

main().catch(console.error);
