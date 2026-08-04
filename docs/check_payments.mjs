async function main() {
  const FRAPPE_URL = "https://smartup.m.frappe.cloud";
  const API_KEY = "03330270e330d49";
  const API_SECRET = "9c2261ae11ac2d2";
  const AUTH = `token ${API_KEY}:${API_SECRET}`;

  // Find Baha Anas customer
  const studentUrl = `${FRAPPE_URL}/api/resource/Student/STU-SU CHL-26-244`;
  const studentRes = await fetch(studentUrl, { headers: { Authorization: AUTH } });
  const student = await studentRes.json();
  const customer = student.data.customer;
  console.log("Customer:", customer);

  // Find Payment Entries for this customer
  const peUrl = `${FRAPPE_URL}/api/resource/Payment Entry?filters=[["party","=","${customer}"],["posting_date",">=","2026-08-01"]]&fields=["name","party","paid_amount","posting_date","mode_of_payment"]`;
  const peRes = await fetch(peUrl, { headers: { Authorization: AUTH } });
  const peData = await peRes.json();
  console.log("Payment Entries:", JSON.stringify(peData, null, 2));
}

main().catch(console.error);
