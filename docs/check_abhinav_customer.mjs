const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function inspectCustomerAndStudent() {
  // 1. Fetch Customer "Abhinav A"
  const custRes = await fetch(`${baseUrl}/api/resource/Customer/Abhinav%20A`, { headers });
  const custDoc = (await custRes.json()).data || {};
  console.log("Customer Abhinav A:", JSON.stringify(custDoc, null, 2));

  // 2. Fetch Sales Orders, Invoices, Payments linked to this Customer
  const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order?filters=[["customer","=","Abhinav A"]]`, { headers });
  console.log("Sales Orders for Abhinav A:", await soRes.json());

  const siRes = await fetch(`${baseUrl}/api/resource/Sales%20Invoice?filters=[["customer","=","Abhinav A"]]`, { headers });
  console.log("Sales Invoices for Abhinav A:", await siRes.json());

  const peRes = await fetch(`${baseUrl}/api/resource/Payment%20Entry?filters=[["party","=","Abhinav A"]]`, { headers });
  console.log("Payment Entries for Abhinav A:", await peRes.json());

  // 3. Why did Student query return 0? Let's check how Student doctype is queried
  const sListRes = await fetch(`${baseUrl}/api/resource/Student?limit_page_length=5`, { headers });
  console.log("Sample Student list:", await sListRes.json());

  // Search Student doctype with search_link or standard get
  const sSearch = await fetch(`${baseUrl}/api/resource/Student?fields=["name","first_name","last_name","student_name","title","custom_branch"]&limit_page_length=500`, { headers });
  const sSearchData = await sSearch.json();
  console.log(`Student total: ${sSearchData.data?.length}`);
  const matchingStudents = (sSearchData.data || []).filter(s => JSON.stringify(s).toLowerCase().includes('abhinav'));
  console.log("Matching Students:", matchingStudents);
}

inspectCustomerAndStudent();
