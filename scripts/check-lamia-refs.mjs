const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkReferences() {
  const peNames = [
    'ACC-PAY-2026-04341',
    'ACC-PAY-2026-04351',
    'ACC-PAY-2026-04352',
    'ACC-PAY-2026-07202',
    'ACC-PAY-2026-07203'
  ];
  for (const name of peNames) {
    const doc = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${name}`, { headers })).json();
    console.log(name, doc.data?.paid_amount, doc.data?.posting_date, doc.data?.references);
  }
}

checkReferences().catch(console.error);
