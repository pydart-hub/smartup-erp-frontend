const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-010';

async function fetchInvoices() {
  try {
    const invNames = [
      "ACC-SINV-2026-02925",
      "ACC-SINV-2026-02926",
      "ACC-SINV-2026-02927",
      "ACC-SINV-2026-02928"
    ];

    for (const name of invNames) {
      const res = await fetch(`${base}/Sales Invoice/${name}`, { headers });
      const doc = await res.json();
      console.log(`=== Invoice: ${name} ===`);
      console.log(`Due Date: ${doc.data.due_date}, Grand Total: ${doc.data.grand_total}, Outstanding: ${doc.data.outstanding_amount}, Status: ${doc.data.status}`);
      console.log('Items:', doc.data.items?.map(i => ({ item_code: i.item_code, item_name: i.item_name, rate: i.rate, amount: i.amount })));
    }
  } catch (e) {
    console.error(e);
  }
}

fetchInvoices();
