const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function printStudent() {
  const r = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-089`, { headers });
  const d = await r.json();
  console.log(JSON.stringify(d.data, null, 2));
}

printStudent().catch(console.error);
