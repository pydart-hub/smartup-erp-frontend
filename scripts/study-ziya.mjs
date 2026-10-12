import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  "Authorization": `token ${key}:${secret}`,
  "Content-Type": "application/json"
};

async function run() {
  const stuRes = await fetch(`${url}/api/resource/Student?filters=[["first_name","like","%ZIYA%"]]&fields=["name","first_name","student_name","custom_branch"]`, { headers });
  const students = await stuRes.json();
  console.log("Students matching ZIYA:", JSON.stringify(students, null, 2));

  let student = students.data?.find(s => s.name === "STU-SU ERV-26-063");
  if (!student) {
    console.log("Student not found!");
    return;
  }
  const studentId = student.name;
  console.log("Using student:", studentId, student.student_name);

  // 2. Search Sales Order
  const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["custom_student","=","${studentId}"],["docstatus","!=",2]]&fields=["name","docstatus","grand_total","rounded_total","transaction_date","customer"]`, { headers });
  const soList = await soRes.json();
  console.log("Sales Orders:", JSON.stringify(soList.data, null, 2));

  // 3. Search Sales Invoices
  const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["custom_student","=","${studentId}"],["docstatus","!=",2]]&fields=["name","docstatus","grand_total","outstanding_amount","due_date","posting_date","remarks"]&order_by=due_date asc,posting_date asc`, { headers });
  const invList = await invRes.json();
  console.log("Invoices count:", invList.data?.length);
  console.log("Invoices:", JSON.stringify(invList.data, null, 2));

  // 4. Search Payment Entries
  const peRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["party","=","${studentId}"],["docstatus","!=",2]]&fields=["name","docstatus","paid_amount","posting_date","mode_of_payment","reference_no","paid_to"]&order_by=posting_date asc`, { headers });
  const peList = await peRes.json();
  console.log("Payment Entries count:", peList.data?.length);
  console.log("Payment Entries:", JSON.stringify(peList.data, null, 2));

  for (const pe of (peList.data || [])) {
    const detailRes = await fetch(`${url}/api/resource/Payment Entry/${pe.name}`, { headers });
    const detail = await detailRes.json();
    console.log(`\nPE ${pe.name} (${pe.mode_of_payment}, ₹${pe.paid_amount}, ${pe.posting_date}) references:`, JSON.stringify(detail.data.references, null, 2));
  }
}

run().catch(console.error);
