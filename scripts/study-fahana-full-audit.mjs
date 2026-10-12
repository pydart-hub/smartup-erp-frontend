const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function fullInspection() {
  const customer = 'FAHANA MS';
  const studentId = 'STU-SU ERV-26-070';

  console.log('====================================================');
  console.log(`STUDENT: ${customer} (${studentId})`);
  console.log('====================================================\n');

  // Program Enrollment
  const peRes = await (await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","program","academic_year","student_batch_name"]`, { headers })).json();
  console.log('Program Enrollment:', peRes.data);

  // Sales Orders
  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${customer}"]]&fields=["name","grand_total","status","docstatus","per_billed"]`, { headers })).json();
  console.log('\nSales Orders:');
  for (const so of soRes.data || []) {
    console.log(`- SO: ${so.name}, Total: ₹${so.grand_total}, Status: ${so.status}, Docstatus: ${so.docstatus}, Billed: ${so.per_billed}%`);
    const fullSo = (await (await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers })).json()).data;
    console.log('  Payment Schedule in SO:');
    fullSo.payment_schedule?.forEach((ps, i) => {
      console.log(`    Inst ${i+1}: ${ps.payment_term} | Due: ${ps.due_date} | Amount: ₹${ps.payment_amount} | Paid: ₹${ps.paid_amount} | Out: ₹${ps.outstanding}`);
    });
  }

  // Sales Invoices
  const siRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customer}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('\nSales Invoices (Installments):');
  let totalGrand = 0, totalOut = 0;
  siRes.data?.forEach((si, i) => {
    totalGrand += si.grand_total;
    totalOut += si.outstanding_amount;
    console.log(`  Inst ${i+1} [${si.name}]: Due: ${si.due_date} | Total: ₹${si.grand_total} | Out: ₹${si.outstanding_amount} | Status: ${si.status} | Docstatus: ${si.docstatus}`);
  });
  console.log(`TOTAL INVOICED: ₹${totalGrand} | TOTAL OUTSTANDING: ₹${totalOut}`);

  // Payment Entries
  const payRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customer}"]]&fields=["name","posting_date","paid_amount","mode_of_payment","docstatus","status","remarks","reference_no"]&order_by=posting_date asc`, { headers })).json();
  console.log('\nPayment Entries:');
  let totalPaid = 0;
  for (const pay of payRes.data || []) {
    totalPaid += pay.paid_amount;
    const fullPay = (await (await fetch(`${baseUrl}/api/resource/Payment Entry/${pay.name}`, { headers })).json()).data;
    const alloc = fullPay.references?.map(r => `${r.reference_name}: ₹${r.allocated_amount} (due ${r.due_date}, total ₹${r.total_amount})`).join(', ');
    console.log(`  ${pay.name} | Date: ${pay.posting_date} | Amount: ₹${pay.paid_amount} | Mode: ${pay.mode_of_payment} | Ref: ${pay.reference_no}`);
    console.log(`    Allocated: ${alloc}`);
  }
  console.log(`TOTAL PAID: ₹${totalPaid}`);
}

fullInspection().catch(console.error);
