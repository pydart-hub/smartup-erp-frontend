const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function cancelAndAmendInv2() {
  try {
    // We adjust Invoice 2 (ACC-SINV-2026-04422):
    // In Basic-6, Inst 1 is 3000 and Inst 2 is 3000.
    // However, on Inst 1 the student paid 4200 (extra 1200 paid).
    // So on Inst 2, the actual net bill to settle is: 3000 - 1200 (credit from Inst 1) = 1800.
    // Since 300 was already paid against Inst 2 (ACC-PAY-2026-07772),
    // Setting Inst 2 total to 1800 leaves remaining outstanding of 1800 - 300 = 1500!
    // Total course fee across all invoices:
    // Inst 1: 4200 (paid)
    // Inst 2: 1800 (300 paid, 1500 due)
    // Inst 3: 3000 (due)
    // Inst 4: 3000 (due)
    // Inst 5: 3000 (due)
    // Inst 6: 2400 (due)
    // Total = 4200 + 1800 + 3000 + 3000 + 3000 + 2400 = 17,400 exactly!
    // Total Paid = 4200 + 300 = 4500!
    // Total Outstanding = 1500 + 3000 + 3000 + 3000 + 2400 = 12,900!

    const inv2Name = 'ACC-SINV-2026-04422';
    console.log('Fetching and cancelling', inv2Name);

    // Cancel
    const cancelRes = await (await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: 'Sales Invoice', name: inv2Name })
    })).json();
    console.log('Cancel result:', cancelRes.message || cancelRes);

    const getDoc = await (await fetch(`${base}/Sales Invoice/${inv2Name}`, { headers })).json();

    const targetAmount = 1800;
    const newDoc = {
      ...getDoc.data,
      docstatus: 0,
      amended_from: inv2Name,
      status: 'Draft',
      items: getDoc.data.items.map(item => ({
        ...item,
        docstatus: 0,
        rate: targetAmount,
        amount: targetAmount,
        base_rate: targetAmount,
        base_amount: targetAmount,
        net_rate: targetAmount,
        net_amount: targetAmount,
        base_net_rate: targetAmount,
        base_net_amount: targetAmount,
        price_list_rate: 33300,
        discount_amount: 33300 - targetAmount
      })),
      remarks: 'Adjusted for Basic-6 fee structure (₹1,200 credited from Inst 1).'
    };
    delete newDoc.name;
    delete newDoc.creation;
    delete newDoc.modified;
    delete newDoc.modified_by;
    delete newDoc.owner;
    delete newDoc.payment_schedule;

    const createRes = await (await fetch(`${base}/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newDoc)
    })).json();
    console.log('Created amended doc:', createRes.data?.name);

    if (createRes.data?.name) {
      const submitRes = await (await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: createRes.data })
      })).json();
      console.log('Submitted doc:', submitRes.data?.name);
    }
  } catch (e) {
    console.error(e);
  }
}

cancelAndAmendInv2();
