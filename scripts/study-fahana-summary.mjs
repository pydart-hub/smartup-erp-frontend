const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function printSummary() {
  const studentId = 'STU-SU ERV-26-070';
  
  // Student Doc
  const sDoc = (await (await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers })).json()).data;
  console.log('--- STUDENT DOC ---');
  console.log(`Name: ${sDoc.name}`);
  console.log(`Student Name: ${sDoc.student_name}`);
  console.log(`Reg No: ${sDoc.custom_registration_no || sDoc.name}`);
  console.log(`Branch: ${sDoc.custom_branch}`);
  console.log(`Class: ${sDoc.custom_class}`);
  console.log(`Academic Year: ${sDoc.custom_academic_year}`);
  console.log(`Fee Structure: ${sDoc.custom_fee_structure}`);
  console.log(`Total Fee: ${sDoc.custom_total_fee}`);
  console.log(`Net Fee: ${sDoc.custom_net_fee}`);
  console.log(`Discount Amount: ${sDoc.custom_discount_amount}`);

  // Sales Orders
  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${studentId}"]]&fields=["name","grand_total","status","docstatus","per_billed"]`, { headers })).json();
  console.log('\n--- SALES ORDERS ---');
  for (const so of soRes.data || []) {
    console.log(`SO: ${so.name}, Total: ${so.grand_total}, Status: ${so.status}, Docstatus: ${so.docstatus}, Billed: ${so.per_billed}%`);
    const fullSo = (await (await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers })).json()).data;
    console.log('Payment Schedule in SO:');
    fullSo.payment_schedule?.forEach((ps, idx) => {
      console.log(`  Inst ${idx+1}: Due ${ps.due_date}, Amount: ₹${ps.payment_amount}, Paid: ₹${ps.paid_amount}, Outstanding: ₹${ps.outstanding}`);
    });
  }

  // Sales Invoices
  const siRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${studentId}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('\n--- SALES INVOICES ---');
  let totalGrand = 0, totalOut = 0;
  siRes.data?.forEach((si, idx) => {
    totalGrand += si.grand_total;
    totalOut += si.outstanding_amount;
    console.log(`  Inst ${idx+1} [${si.name}]: Due ${si.due_date}, Grand: ₹${si.grand_total}, Out: ₹${si.outstanding_amount}, Status: ${si.status}, Docstatus: ${si.docstatus}`);
  });
  console.log(`Total Invoiced: ₹${totalGrand}, Total Outstanding: ₹${totalOut}`);

  // Payment Entries
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${studentId}"]]&fields=["name","posting_date","paid_amount","mode_of_payment","docstatus","status","remarks","reference_no"]&order_by=posting_date asc`, { headers })).json();
  console.log('\n--- PAYMENT ENTRIES ---');
  let totalPaid = 0;
  for (const pe of peRes.data || []) {
    totalPaid += pe.paid_amount;
    const fullPe = (await (await fetch(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers })).json()).data;
    const alloc = fullPe.references?.map(r => `${r.reference_name} (₹${r.allocated_amount})`).join(', ');
    console.log(`  PE: ${pe.name} | Date: ${pe.posting_date} | Paid: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Ref: ${pe.reference_no} | Allocated: [${alloc}]`);
  }
  console.log(`Total Payments Paid: ₹${totalPaid}`);
}

printSummary().catch(console.error);
