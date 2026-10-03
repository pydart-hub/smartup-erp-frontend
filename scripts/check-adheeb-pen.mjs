const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkPen() {
  const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-058"]]&fields=["*"]`, { headers });
  const pen = await penRes.json();
  console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));
}

checkPen().catch(console.error);
