const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function updateSOInPlace() {
  // Update Sales Order fields
  const res = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00388`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      custom_plan: 'Basic',
      custom_no_of_instalments: '8'
    })
  });
  console.log('Update SO plan res:', res.status, await res.json());

  // Also check align script to see if SO total needs alignment
}

updateSOInPlace().catch(console.error);
