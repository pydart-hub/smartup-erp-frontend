const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function test() {
  const peRes = await fetch(`${base}/api/resource/Program Enrollment?filters=[["student","=","STU-SU MMK-26-047"]]&fields=["name","program","student_batch_name","docstatus"]`, { headers });
  console.log('PE:', await peRes.json());
}
test();
