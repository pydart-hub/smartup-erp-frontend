const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function finalVerify() {
  try {
    const resInv = await fetch(`${base}/Sales Invoice?filters=[["customer","=","Henock joseph"],["docstatus","!=",2]]&fields=["name","due_date","grand_total","outstanding_amount","status","amended_from"]&order_by=due_date asc`, { headers });
    const invData = await resInv.json();
    console.log('Final Active Invoices for Henock:', invData.data);

    let totalFee = 0;
    let totalOutstanding = 0;
    for (const inv of invData.data) {
      totalFee += inv.grand_total;
      totalOutstanding += inv.outstanding_amount;
    }
    console.log(`Summary -> Total Fee: ₹${totalFee}, Total Outstanding: ₹${totalOutstanding}, Total Paid: ₹${totalFee - totalOutstanding}`);

    const resPE = await fetch(`${base}/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","custom_fee_structure","custom_plan","custom_no_of_instalments"]`, { headers });
    const peData = await resPE.json();
    console.log('Program Enrollment:', peData.data[0]);
  } catch (e) {
    console.error(e);
  }
}

finalVerify();
