const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function checkLatestPE() {
  try {
    const resPE = await fetch(`${base}/Program Enrollment?filters=[["student","=","${studentId}"],["docstatus","!=",2]]&fields=["name","custom_fee_structure","custom_plan","custom_no_of_instalments","docstatus"]`, { headers });
    const peData = await resPE.json();
    console.log('Active Program Enrollment:', peData.data);
  } catch (e) {
    console.error(e);
  }
}

checkLatestPE();
