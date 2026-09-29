const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

// Students converted with revised fee totals
const convertedStudents = [
  { name: 'RIZWANA S A', expectedTotal: 20500 },
  { name: 'ANN MARY', expectedTotal: 19600 },
  { name: 'ALAINA GODWIN', expectedTotal: 19300 },
  { name: 'MOHAMMED NAHAN NAJEEB', expectedTotal: 16910 },
  { name: 'JUVAIRIYA P M', expectedTotal: 16000 },
  { name: 'ABHIRAMI NS', expectedTotal: 17800 },
  { name: 'MOHAMMED ZAYAN V Z', expectedTotal: 18700 },
  { name: 'MANHA NASIM', expectedTotal: 21400 },
  { name: 'REICHAL DANY', expectedTotal: 16500 },
  { name: 'REBECCA DANY', expectedTotal: 16500 },
  { name: 'RAHEL DANI', expectedTotal: 15500 }
];

async function syncBackendData() {
  console.log('=== SYNCING BACKEND DATA FOR CONVERTED STUDENTS ===\n');

  for (const st of convertedStudents) {
    console.log(`\n----------------------------------------------------`);
    console.log(`STUDENT: ${st.name} (Agreed Total: ₹${st.expectedTotal})`);

    // 1. Fetch Sales Order
    const soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${st.name}"],["docstatus","=",1]]&fields=["name","grand_total","per_billed","items","payment_schedule"]`, { headers });
    const soList = (await soRes.json()).data || [];

    if (soList.length > 0) {
      const soName = soList[0].name;
      const fullSoRes = await fetch(`${baseUrl}/api/resource/Sales Order/${soName}`, { headers });
      const fullSo = (await fullSoRes.json()).data;

      console.log(`Found SO ${soName} (Current Grand Total: ₹${fullSo.grand_total})`);

      if (Math.abs(fullSo.grand_total - st.expectedTotal) > 1) {
        console.log(`Updating SO ${soName} grand_total from ₹${fullSo.grand_total} to ₹${st.expectedTotal}...`);

        // Update SO item row and SO totals via frappe.client.set_value
        const soItem = fullSo.items?.[0];
        if (soItem) {
          const itemRate = fullSo.items.length > 1 ? st.expectedTotal / fullSo.items.length : st.expectedTotal;
          await fetch(`${baseUrl}/api/method/frappe.client.set_value`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              doctype: 'Sales Order Item',
              name: soItem.name,
              fieldname: {
                rate: itemRate,
                amount: st.expectedTotal,
                base_rate: itemRate,
                base_amount: st.expectedTotal,
                net_rate: itemRate,
                net_amount: st.expectedTotal,
                base_net_rate: itemRate,
                base_net_amount: st.expectedTotal
              }
            })
          });
        }

        // Update SO header fields
        await fetch(`${baseUrl}/api/method/frappe.client.set_value`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            doctype: 'Sales Order',
            name: soName,
            fieldname: {
              total: st.expectedTotal,
              base_total: st.expectedTotal,
              net_total: st.expectedTotal,
              base_net_total: st.expectedTotal,
              grand_total: st.expectedTotal,
              base_grand_total: st.expectedTotal,
              rounded_total: st.expectedTotal,
              base_rounded_total: st.expectedTotal,
              per_billed: 100
            }
          })
        });

        // Update SO payment schedule if exists
        const soPs = fullSo.payment_schedule?.[0];
        if (soPs) {
          await fetch(`${baseUrl}/api/method/frappe.client.set_value`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              doctype: 'Payment Schedule',
              name: soPs.name,
              fieldname: {
                payment_amount: st.expectedTotal,
                base_payment_amount: st.expectedTotal,
                outstanding: 0
              }
            })
          });
        }
        console.log(`✅ SO ${soName} successfully updated to ₹${st.expectedTotal} & 100% billed.`);
      } else {
        console.log(`SO ${soName} is already matched at ₹${fullSo.grand_total}.`);
      }
    }

    // 2. Fetch all active Sales Invoices for student
    const invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${st.name}"],["docstatus","=",1]]&fields=["name","grand_total","outstanding_amount","status"]`, { headers });
    const invList = (await invRes.json()).data || [];

    for (const inv of invList) {
      if (inv.outstanding_amount === 0) {
        // Fully paid invoice -> check payment_schedule child table
        const fullInvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${inv.name}`, { headers });
        const fullInv = (await fullInvRes.json()).data;
        const psList = fullInv?.payment_schedule || [];

        for (const ps of psList) {
          if (ps.outstanding > 0 || ps.paid_amount < ps.payment_amount) {
            console.log(`Syncing payment_schedule for invoice ${inv.name} (Row: ${ps.name}, amount: ₹${ps.payment_amount})`);
            await fetch(`${baseUrl}/api/method/frappe.client.set_value`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                doctype: 'Payment Schedule',
                name: ps.name,
                fieldname: {
                  paid_amount: ps.payment_amount,
                  base_paid_amount: ps.payment_amount,
                  outstanding: 0,
                  base_outstanding: 0
                }
              })
            });
            console.log(` -> Synced ${ps.name} to paid_amount: ₹${ps.payment_amount}, outstanding: 0`);
          }
        }
      }
    }
  }

  console.log('\n=== BACKEND SYNC COMPLETE ===');
}

syncBackendData().catch(console.error);
