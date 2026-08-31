const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function fetchHenock() {
  try {
    // 1. Search student
    const filter = encodeURIComponent(JSON.stringify([["first_name", "like", "%Henock%"]]));
    const res = await fetch(`${base}/Student?filters=${filter}&fields=["*"]`, { headers });
    const students = await res.json();
    console.log('--- STUDENT SEARCH RESULTS ---');
    console.log(JSON.stringify(students.data, null, 2));

    if (students.data && students.data.length > 0) {
      const student = students.data[0];
      const studentId = student.name;
      const customer = student.customer;

      // 2. Program Enrollment
      const peFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
      const resPE = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["*"]`, { headers });
      const peData = await resPE.json();
      console.log('--- PROGRAM ENROLLMENT ---');
      console.log(JSON.stringify(peData.data, null, 2));

      // 3. Sales Invoices
      const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", customer]]));
      const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]&order_by=due_date asc`, { headers });
      const invData = await resInv.json();
      console.log('--- SALES INVOICES ---');
      console.log(JSON.stringify(invData.data, null, 2));

      // 4. Payment Entries
      const payFilter = encodeURIComponent(JSON.stringify([["party", "=", customer]]));
      const resPay = await fetch(`${base}/Payment Entry?filters=${payFilter}&fields=["*"]`, { headers });
      const payData = await resPay.json();
      console.log('--- PAYMENT ENTRIES ---');
      console.log(JSON.stringify(payData.data, null, 2));

      // 5. Fee Structures in Thopumpadi for 10th State Advance
      const fsFilter = encodeURIComponent(JSON.stringify([["program", "like", "%10th%"]]));
      const resFS = await fetch(`${base}/Fee Structure?filters=${fsFilter}&fields=["*"]`, { headers });
      const fsData = await resFS.json();
      console.log('--- FEE STRUCTURES ---');
      console.log(JSON.stringify(fsData.data, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

fetchHenock();
