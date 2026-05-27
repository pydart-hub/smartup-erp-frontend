// Check Sales Orders for the 3 students

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

const students = [
  { id: 'STU-SU FKO-26-011', name: 'GLANIA PHILIP' },
  { id: 'STU-SU FKO-26-009', name: 'ANGEL MARY MARTIN' },
  { id: 'STU-SU FKO-26-002', name: 'AYRA RAHMATH' },
];

async function main() {
  for (const s of students) {
    console.log(`\n=== ${s.name} ===`);
    
    // Check Sales Orders
    const soList = await get(`/api/resource/Sales Order?filters=[["customer","=","${s.name}"]]&fields=["name","grand_total","advance_paid","per_billed","status","transaction_date","custom_fee_category","custom_plan","custom_class","custom_no_of_instalments","custom_fee_structure"]&limit=10`);
    console.log('Sales Orders:', JSON.stringify(soList.data, null, 2));

    // Get full detail of first SO if exists
    if (soList.data && soList.data.length > 0) {
      const soFull = await get(`/api/resource/Sales Order/${soList.data[0].name}`);
      const d = soFull.data || {};
      console.log(`\nFull SO [${soList.data[0].name}]:`);
      const skip = ['owner','creation','modified','modified_by','idx'];
      for (const k of Object.keys(d)) {
        if (!skip.includes(k)) {
          if (Array.isArray(d[k]) && d[k].length > 0) {
            console.log(`  ${k}:`);
            d[k].forEach(row => {
              const rowKeys = Object.keys(row).filter(rk => !['name','owner','creation','modified','modified_by','docstatus','idx','parent','parentfield','parenttype','doctype'].includes(rk));
              console.log('    ' + rowKeys.map(rk => `${rk}=${JSON.stringify(row[rk])}`).join(' | '));
            });
          } else if (!Array.isArray(d[k]) && d[k] !== null && d[k] !== '') {
            console.log(`  ${k}: ${d[k]}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
