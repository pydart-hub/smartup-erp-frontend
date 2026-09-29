const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function search() {
  console.log('1. Searching Customer with name REICHAL:');
  let cRes = await fetch(`${baseUrl}/api/resource/Customer?filters=[["customer_name","like","%REICHAL%"]]&fields=["name","customer_name"]`, { headers });
  console.log('Customer:', await cRes.json());

  console.log('2. Searching Sales Invoices with title REICHAL:');
  let invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["title","like","%REICHAL%"]]&fields=["name","title","customer","grand_total","outstanding_amount","posting_date","docstatus"]`, { headers });
  console.log('Sales Invoice by title:', await invRes.json());

  console.log('3. Searching Sales Invoices with 089:');
  let invRes2 = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["title","like","%089%"]]&fields=["name","title","customer","grand_total","outstanding_amount","posting_date","docstatus"]`, { headers });
  console.log('Sales Invoice by 089:', await invRes2.json());

  console.log('4. Trying Student get direct if ID pattern matches STU-SU CHL:');
  let stRes = await fetch(`${baseUrl}/api/resource/Student?filters=[["title","like","%REICHAL%"]]&fields=["*"]`, { headers });
  console.log('Student by title:', await stRes.json());
}
search().catch(console.error);
