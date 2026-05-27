// Check fee structures - both current and target Basic plans

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  // Fetch current fee structures referenced in program enrollments
  const currentFSIds = [
    'SU FKO-10th State-Advanced-4',
    'SU FKO-10th State-Advanced-1',
    'SU FKO-9th State-Advanced-4',
  ];

  console.log('=== CURRENT FEE STRUCTURES ===');
  for (const fsId of currentFSIds) {
    const fs = await get(`/api/resource/Fee Structure/${encodeURIComponent(fsId)}`);
    console.log(`\n[${fsId}]`);
    const d = fs.data || fs;
    if (d.name) {
      const skip = ['owner','creation','modified','modified_by','docstatus','idx'];
      for (const k of Object.keys(d)) {
        if (!skip.includes(k)) {
          if (Array.isArray(d[k])) {
            console.log(`  ${k}:`);
            d[k].forEach(row => {
              const rowKeys = Object.keys(row).filter(rk => !['name','owner','creation','modified','modified_by','docstatus','idx','parent','parentfield','parenttype','doctype'].includes(rk));
              console.log('    ' + rowKeys.map(rk => `${rk}=${row[rk]}`).join(' | '));
            });
          } else if (d[k] !== null && d[k] !== '') {
            console.log(`  ${k}: ${d[k]}`);
          }
        }
      }
    } else {
      console.log(JSON.stringify(d, null, 2));
    }
  }

  // Search for Basic fee structures for Fort Kochi
  console.log('\n\n=== ALL BASIC FEE STRUCTURES - FORT KOCHI ===');
  const basicFS = await get(`/api/resource/Fee Structure?filters=[["name","like","%SU FKO%"],["name","like","%Basic%"]]&limit=30`);
  console.log(JSON.stringify(basicFS.data, null, 2));

  // Also search for all Fort Kochi fee structures to see naming patterns
  console.log('\n\n=== ALL FORT KOCHI FEE STRUCTURES ===');
  const allFS = await get(`/api/resource/Fee Structure?filters=[["name","like","%SU FKO%"]]&limit=50`);
  console.log(JSON.stringify(allFS.data, null, 2));
}

main().catch(console.error);
