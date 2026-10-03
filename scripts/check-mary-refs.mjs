const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkReferences() {
  const peNames = [
    'ACC-PAY-2026-04209',
    'ACC-PAY-2026-05625',
    'ACC-PAY-2026-05626',
    'ACC-PAY-2026-06178-1',
    'ACC-PAY-2026-06179-1',
    'ACC-PAY-2026-06488-1',
    'ACC-PAY-2026-06489-2'
  ];
  for (const name of peNames) {
    const doc = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${name}`, { headers })).json();
    console.log(name, doc.data?.paid_amount, doc.data?.posting_date, doc.data?.references);
  }
}

checkReferences().catch(console.error);
