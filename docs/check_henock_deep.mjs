const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function fetchHenockDeep() {
  try {
    const resStud = await fetch(`${base}/Student/${studentId}`, { headers });
    const studData = await resStud.json();
    console.log('--- HENOCK STUDENT DOC ---');
    console.log(JSON.stringify(studData.data, null, 2));

    const peFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
    const resPE = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["*"]`, { headers });
    const peData = await resPE.json();
    console.log('--- HENOCK PROGRAM ENROLLMENT ---');
    console.log(JSON.stringify(peData.data, null, 2));

    const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", studData.data.customer]]));
    const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]&order_by=due_date asc`, { headers });
    const invData = await resInv.json();
    console.log('--- HENOCK SALES INVOICES ---');
    console.log(JSON.stringify(invData.data, null, 2));

    const payFilter = encodeURIComponent(JSON.stringify([["party", "=", studData.data.customer]]));
    const resPay = await fetch(`${base}/Payment Entry?filters=${payFilter}&fields=["*"]`, { headers });
    const payData = await resPay.json();
    console.log('--- HENOCK PAYMENT ENTRIES ---');
    console.log(JSON.stringify(payData.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

fetchHenockDeep();
