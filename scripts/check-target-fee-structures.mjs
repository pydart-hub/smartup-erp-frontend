// Fetch target Basic fee structures

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  const targets = [
    'SU FKO-10th State-Basic-4',  // Glania: 10th Basic quarterly
    'SU FKO-10th State-Basic-1',  // Angel Mary: 10th Basic OTP
    'SU FKO-9th State-Basic-4',   // Ayra: 9th Basic quarterly
  ];

  for (const fsId of targets) {
    const fs = await get(`/api/resource/Fee Structure/${encodeURIComponent(fsId)}`);
    const d = fs.data || {};
    console.log(`\n========== ${fsId} ==========`);
    const skip = ['owner','creation','modified','modified_by','idx'];
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
  }

  // Also check what the fee schedules look like for a student already on Basic 4-installment plan
  // to understand the installment structure
  console.log('\n\n=== Looking for existing Basic 4-installment program enrollments in Fort Kochi ===');
  const penList = await get(`/api/resource/Program Enrollment?filters=[["student_batch_name","=","Fortkochi 26-27"],["custom_fee_structure","like","%Basic-4%"]]&fields=["name","student","student_name","program","custom_fee_structure","custom_plan","custom_no_of_instalments"]&limit=10`);
  console.log(JSON.stringify(penList.data, null, 2));
  
  // Also check for any existing invoices for those students to see installment breakdown
  if (penList.data && penList.data.length > 0) {
    const sample = penList.data[0];
    console.log(`\n=== Sample invoices for ${sample.student_name} (${sample.name}) ===`);
    const invList = await get(`/api/resource/Sales Invoice?filters=[["customer","=","${sample.student_name}"]]&fields=["name","grand_total","outstanding_amount","status","posting_date","due_date"]&limit=10`);
    console.log(JSON.stringify(invList.data, null, 2));
  }
}

main().catch(console.error);
