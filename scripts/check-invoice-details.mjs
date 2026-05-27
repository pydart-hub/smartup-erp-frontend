// Check Sales Orders - try different approaches

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  // Try different customer filter approaches
  console.log('=== SO Search by GLANIA PHILIP ===');
  const so1 = await get(`/api/resource/Sales Order?filters=[["customer","=","GLANIA PHILIP"]]&limit=5`);
  console.log(JSON.stringify(so1, null, 2));

  console.log('\n=== SO Search like GLANIA ===');
  const so2 = await get(`/api/resource/Sales Order?filters=[["customer","like","%GLANIA%"]]&limit=5`);
  console.log(JSON.stringify(so2, null, 2));

  // Check if the invoices reference a SO
  console.log('\n=== Full detail of invoice ACC-SINV-2026-02507 ===');
  const inv = await get(`/api/resource/Sales Invoice/ACC-SINV-2026-02507`);
  const d = inv.data || {};
  // Print all fields that have values
  for (const k of Object.keys(d)) {
    if (!['owner','creation','modified','modified_by','idx','_liked_by'].includes(k)) {
      if (Array.isArray(d[k]) && d[k].length > 0) {
        console.log(`${k}:`);
        d[k].forEach(row => console.log('  ' + JSON.stringify(row)));
      } else if (!Array.isArray(d[k]) && d[k] !== null && d[k] !== '' && d[k] !== 0) {
        console.log(`${k}: ${d[k]}`);
      }
    }
  }

  // Also check Angel's invoice which has outstanding amount
  console.log('\n=== Full detail of invoice ACC-SINV-2026-02484 (Angel Mary) ===');
  const inv2 = await get(`/api/resource/Sales Invoice/ACC-SINV-2026-02484`);
  const d2 = inv2.data || {};
  for (const k of Object.keys(d2)) {
    if (!['owner','creation','modified','modified_by','idx','_liked_by'].includes(k)) {
      if (Array.isArray(d2[k]) && d2[k].length > 0) {
        console.log(`${k}:`);
        d2[k].forEach(row => console.log('  ' + JSON.stringify(row)));
      } else if (!Array.isArray(d2[k]) && d2[k] !== null && d2[k] !== '' && d2[k] !== 0) {
        console.log(`${k}: ${d2[k]}`);
      }
    }
  }
}

main().catch(console.error);
