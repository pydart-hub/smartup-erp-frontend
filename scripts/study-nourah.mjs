
const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    // 1. Fetch Student
    let res = await fetch(`${baseUrl}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["first_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let studentData = await res.json();
    console.log('=== STUDENT DETAILS ===');
    console.log(JSON.stringify(studentData.data, null, 2));

    // 2. Fetch Sales Orders
    let soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let soData = await soRes.json();
    console.log('=== SALES ORDERS ===');
    console.log(JSON.stringify(soData.data, null, 2));

    // For each SO, get full details
    if (soData.data) {
      for (let so of soData.data) {
        let singleSoRes = await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers });
        let singleSo = await singleSoRes.json();
        console.log(`=== SALES ORDER ITEMS/PAYMENTS (${so.name}) ===`);
        console.log(JSON.stringify(singleSo.data, null, 2));
      }
    }

    // 3. Fetch Sales Invoices
    let sinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let sinvData = await sinvRes.json();
    console.log('=== SALES INVOICES ===');
    console.log(JSON.stringify(sinvData.data, null, 2));

    if (sinvData.data) {
      for (let inv of sinvData.data) {
        let singleInvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${inv.name}`, { headers });
        let singleInv = await singleInvRes.json();
        console.log(`=== SALES INVOICE ITEMS (${inv.name}) ===`);
        console.log(JSON.stringify(singleInv.data, null, 2));
      }
    }

    // 4. Fetch Payment Entries
    let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let peData = await peRes.json();
    console.log('=== PAYMENT ENTRIES ===');
    console.log(JSON.stringify(peData.data, null, 2));

  } catch (e) {
    console.error('Error:', e);
  }
}

run();
