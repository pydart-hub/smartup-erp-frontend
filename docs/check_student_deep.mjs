const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-010';

async function fetchDetails() {
  try {
    // 1. Student full doc
    const resStud = await fetch(`${base}/Student/${studentId}`, { headers });
    const studData = await resStud.json();
    console.log('--- STUDENT DOC ---');
    console.log(JSON.stringify(studData.data, null, 2));

    // 2. Program Enrollment
    const peFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
    const resPE = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["*"]`, { headers });
    const peData = await resPE.json();
    console.log('--- PROGRAM ENROLLMENT ---');
    console.log(JSON.stringify(peData.data, null, 2));

    // 3. Fees / Sales Invoice
    const feeFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
    const resFee = await fetch(`${base}/Fees?filters=${feeFilter}&fields=["*"]`, { headers });
    const feeData = await resFee.json();
    console.log('--- FEES ---');
    console.log(JSON.stringify(feeData.data, null, 2));

    // 4. Sales Invoice
    const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", studData.data.customer]]));
    const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]`, { headers });
    const invData = await resInv.json();
    console.log('--- SALES INVOICE ---');
    console.log(JSON.stringify(invData.data, null, 2));

    // 5. Payment Entry
    const pePayFilter = encodeURIComponent(JSON.stringify([["party", "=", studData.data.customer]]));
    const resPay = await fetch(`${base}/Payment Entry?filters=${pePayFilter}&fields=["*"]`, { headers });
    const payData = await resPay.json();
    console.log('--- PAYMENT ENTRY ---');
    console.log(JSON.stringify(payData.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

fetchDetails();
