const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    let soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","transaction_date","grand_total","status","docstatus","creation","modified"]))}`, { headers });
    let soData = await soRes.json();
    console.log('=== SALES ORDERS SHORT ===');
    console.dir(soData, { depth: null });

    for (let so of soData.data) {
      let singleSoRes = await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers });
      let singleSo = await singleSoRes.json();
      console.log(`\n--- SO ${so.name} DETAILS ---`);
      console.log('Grand Total:', singleSo.data.grand_total);
      console.log('Status:', singleSo.data.status, 'Docstatus:', singleSo.data.docstatus);
      console.log('Items:', singleSo.data.items.map(i => ({ code: i.item_code, qty: i.qty, rate: i.rate, amount: i.amount, disc: i.discount_amount })));
      console.log('Payment Schedule:', singleSo.data.payment_schedule);
    }

  } catch(e) {
    console.error(e);
  }
}
run();
