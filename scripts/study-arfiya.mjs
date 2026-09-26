const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    console.log('=== STUDYING ARFIYA T A (SRR 334) ===\n');

    // 1. Student Record
    let studentRes = await fetch(`${baseUrl}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["first_name","like","%Arfiya%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let studentData = await studentRes.json();
    
    if (!studentData.data || studentData.data.length === 0) {
      studentRes = await fetch(`${baseUrl}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["custom_srr_id","=","334"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
      studentData = await studentRes.json();
    }

    console.log('--- STUDENT DETAILS ---');
    console.log(JSON.stringify(studentData.data, null, 2));

    // 2. Sales Orders
    let soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Arfiya%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let soData = await soRes.json();
    console.log('\n--- SALES ORDERS ---');
    console.log(JSON.stringify(soData.data, null, 2));

    if (soData.data) {
      for (let so of soData.data) {
        let singleSoRes = await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers });
        let singleSo = await singleSoRes.json();
        console.log(`\n--- SO ${so.name} DETAILS ---`);
        console.log('Grand Total:', singleSo.data.grand_total, 'Status:', singleSo.data.status, 'Docstatus:', singleSo.data.docstatus);
        console.log('Items:', singleSo.data.items.map(i => ({ code: i.item_code, name: i.item_name, qty: i.qty, rate: i.rate, amount: i.amount, discount: i.discount_amount })));
      }
    }

    // 3. Sales Invoices
    let sinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Arfiya%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let sinvData = await sinvRes.json();
    console.log('\n--- SALES INVOICES ---');
    console.log(JSON.stringify(sinvData.data, null, 2));

    if (sinvData.data) {
      for (let inv of sinvData.data) {
        let singleInvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${inv.name}`, { headers });
        let singleInv = await singleInvRes.json();
        console.log(`\n--- INVOICE ${inv.name} DETAILS ---`);
        console.log('Posting Date:', singleInv.data.posting_date, 'Grand Total:', singleInv.data.grand_total, 'Outstanding:', singleInv.data.outstanding_amount, 'Status:', singleInv.data.status, 'Docstatus:', singleInv.data.docstatus);
      }
    }

    // 4. Payment Entries
    let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party_name","like","%Arfiya%"]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`, { headers });
    let peData = await peRes.json();
    console.log('\n--- PAYMENT ENTRIES ---');
    console.log(JSON.stringify(peData.data, null, 2));

  } catch (e) {
    console.error(e);
  }
}

run();
