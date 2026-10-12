const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function printStudentDetails() {
  const studentId = 'STU-SU ERV-26-070';
  const sDoc = (await (await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers })).json()).data;
  console.log('Keys on student:', Object.keys(sDoc).filter(k => k.startsWith('custom_') || k.includes('name') || k.includes('fee') || k.includes('program')));
  console.log('Customer field:', sDoc.customer);

  // Check Sales Invoices where custom_student or customer is STU-SU ERV-26-070
  // Or check all invoices where title or remarks or customer matches FAHANA
  const siRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["title","like","%FAHANA%"]]&fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('\nSales invoices with title like FAHANA:');
  console.log(siRes.data);

  if (!siRes.data || siRes.data.length === 0) {
    const siRes2 = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer_name","like","%FAHANA%"]]&fields=["name","customer","customer_name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
    console.log('\nSales invoices with customer_name like FAHANA:');
    console.log(siRes2.data);
  }
}

printStudentDetails().catch(console.error);
