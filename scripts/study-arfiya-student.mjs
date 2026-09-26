const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  let res = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-334`, { headers });
  let data = await res.json();
  console.log('STUDENT RECORD:', data.data);
}
run();
