const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function summarizeHenock() {
  try {
    const resInv = await fetch(`${base}/Sales Invoice?filters=[["customer","=","Henock joseph"],["docstatus","!=",2]]&fields=["name","due_date","grand_total","outstanding_amount","paid_amount","status"]&order_by=due_date asc`, { headers });
    const invData = await resInv.json();
    console.log('Invoices for Henock:', invData.data);

    const resPay = await fetch(`${base}/Payment Entry?filters=[["party","=","Henock joseph"],["docstatus","=",1]]&fields=["name","posting_date","paid_amount","mode_of_payment","remarks"]`, { headers });
    const payData = await resPay.json();
    console.log('Submitted Payments for Henock:', payData.data);

    const resPE = await fetch(`${base}/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["*"]`, { headers });
    const peData = await resPE.json();
    console.log('Program Enrollment:', peData.data[0]);
  } catch (e) {
    console.error(e);
  }
}

summarizeHenock();
