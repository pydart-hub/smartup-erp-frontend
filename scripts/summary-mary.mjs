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
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function printSummary() {
  const customerName = 'MARY ALIYA P J';
  const studentId = 'STU-SU MMK-26-060';

  // 1. Invoices
  const invRes = await (await fetchRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customerName}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('=== SALES INVOICES (' + invRes.data.length + ') ===');
  for (const inv of invRes.data) {
    console.log(`${inv.name} | Date: ${inv.posting_date} | Due: ${inv.due_date} | Total: ₹${inv.grand_total} | Out: ₹${inv.outstanding_amount} | Status: ${inv.status} | Docstatus: ${inv.docstatus}`);
  }

  // 2. Payments
  const peRes = await (await fetchRetry(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"]]&fields=["name","posting_date","mode_of_payment","paid_amount","paid_to","paid_from","reference_no","reference_date","docstatus","remarks"]&order_by=posting_date asc`, { headers })).json();
  console.log('\n=== PAYMENT ENTRIES (' + peRes.data.length + ') ===');
  for (const pe of peRes.data) {
    console.log(`${pe.name} | Date: ${pe.posting_date} | Amount: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Status: ${pe.docstatus === 1 ? 'Submitted' : 'Draft/Cancelled'} | Ref: ${pe.reference_no} | Remarks: ${pe.remarks}`);
    
    // Check allocation references
    const detail = await (await fetchRetry(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers })).json();
    for (const ref of (detail.data?.references || [])) {
      console.log(`   -> Allocated to ${ref.reference_doctype} ${ref.reference_name}: Allocated Amount = ₹${ref.allocated_amount}`);
    }
  }

  // 3. Sales Order
  const soRes = await (await fetchRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${customerName}"]]&fields=["name","status","grand_total","rounded_total","delivery_status","billing_status"]`, { headers })).json();
  console.log('\n=== SALES ORDERS (' + soRes.data.length + ') ===');
  for (const so of soRes.data) {
    console.log(`${so.name} | Total: ₹${so.grand_total} | Status: ${so.status} | Billing: ${so.billing_status}`);
    const soDetail = await (await fetchRetry(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers })).json();
    console.log('  Items:');
    for (const it of (soDetail.data?.items || [])) {
      console.log(`    ${it.item_code} - ${it.item_name}: Qty ${it.qty} x ₹${it.rate} = ₹${it.amount}`);
    }
    console.log('  Payment Schedule:');
    for (const ps of (soDetail.data?.payment_schedule || [])) {
      console.log(`    Idx ${ps.idx} | Due: ${ps.due_date} | Amount: ₹${ps.payment_amount}`);
    }
  }

  // 4. Program Enrollment
  const penRes = await (await fetchRetry(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","program","academic_year","custom_fee_structure","custom_batch","custom_branch"]`, { headers })).json();
  console.log('\n=== PROGRAM ENROLLMENT ===');
  console.log(penRes.data);

  // 5. Check Fee Structures for Moolamkuzhi / MMK
  const fsMmk = await (await fetchRetry(`${baseUrl}/api/resource/Fee Structure?filters=[["name","like","%MMK%"]]&fields=["name","total_amount","program"]`, { headers })).json();
  console.log('\n=== FEE STRUCTURES (MMK) ===');
  console.log(fsMmk.data);
}

printSummary().catch(console.error);
