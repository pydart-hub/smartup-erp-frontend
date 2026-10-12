const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function test() {
  const p1 = await fetch(`${base}/api/resource/Payment Entry/ACC-PAY-2026-04703`, { headers });
  const p2 = await fetch(`${base}/api/resource/Payment Entry/ACC-PAY-2026-04825`, { headers });
  console.log('P1:', JSON.stringify(await p1.json(), null, 2));
  console.log('P2:', JSON.stringify(await p2.json(), null, 2));
}
test();
