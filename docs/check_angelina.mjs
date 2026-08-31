const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function fetchAngelina() {
  try {
    // 1. Search student
    const filter = encodeURIComponent(JSON.stringify([["name", "like", "%SU THP-26-003%"]]));
    const res = await fetch(`${base}/Student?filters=${filter}&fields=["*"]`, { headers });
    const students = await res.json();
    console.log('--- ANGELINA STUDENT DOC ---');
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
      const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", customer], ["docstatus", "!=", 2]]));
      const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]&order_by=due_date asc`, { headers });
      const invData = await resInv.json();
      console.log('--- SALES INVOICES ---');
      console.log(JSON.stringify(invData.data, null, 2));

      // 4. Payment Entries
      const payFilter = encodeURIComponent(JSON.stringify([["party", "=", customer], ["docstatus", "=", 1]]));
      const resPay = await fetch(`${base}/Payment Entry?filters=${payFilter}&fields=["*"]`, { headers });
      const payData = await resPay.json();
      console.log('--- PAYMENT ENTRIES ---');
      console.log(JSON.stringify(payData.data, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

fetchAngelina();
