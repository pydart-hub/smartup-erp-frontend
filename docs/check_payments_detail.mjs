const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function checkAndAdjustInst1And2() {
  try {
    // 1. Fetch detailed payment entry docs
    const pay1 = await (await fetch(`${base}/Payment Entry/ACC-PAY-2026-04400`, { headers })).json();
    const pay2 = await (await fetch(`${base}/Payment Entry/ACC-PAY-2026-07771`, { headers })).json();
    const pay3 = await (await fetch(`${base}/Payment Entry/ACC-PAY-2026-07772`, { headers })).json();

    console.log('Pay 1 references:', pay1.data.references);
    console.log('Pay 2 references:', pay2.data.references);
    console.log('Pay 3 references:', pay3.data.references);

    // 2. Fetch invoice 1 and 2
    const inv1 = await (await fetch(`${base}/Sales Invoice/ACC-SINV-2026-04421`, { headers })).json();
    const inv2 = await (await fetch(`${base}/Sales Invoice/ACC-SINV-2026-04422`, { headers })).json();
    console.log('Inv 1:', { total: inv1.data.grand_total, outstanding: inv1.data.outstanding_amount });
    console.log('Inv 2:', { total: inv2.data.grand_total, outstanding: inv2.data.outstanding_amount });

    // Check all active invoices currently
    const allInvs = await (await fetch(`${base}/Sales Invoice?filters=[["customer","=","Henock joseph"],["docstatus","!=",2]]&fields=["name","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
    console.log('All active Invoices for Henock:', allInvs.data);
  } catch (e) {
    console.error(e);
  }
}

checkAndAdjustInst1And2();
