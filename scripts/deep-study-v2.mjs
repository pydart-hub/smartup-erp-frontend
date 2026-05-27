// Deep study - get full program enrollments and all invoices

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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`STUDENT: ${s.name} (${s.id})`);
    console.log('='.repeat(60));

    // Get program enrollments list
    const penList = await get(`/api/resource/Program Enrollment?filters=[["student","=","${s.id}"]]&limit=10`);
    for (const pen of (penList.data || [])) {
      const penFull = await get(`/api/resource/Program Enrollment/${pen.name}`);
      console.log(`\n[PROGRAM ENROLLMENT: ${pen.name}]`);
      const d = penFull.data || {};
      // Print key fields
      const keys = Object.keys(d).filter(k => !['owner','creation','modified','modified_by','docstatus','idx','__last_sync_on'].includes(k));
      for (const k of keys) {
        if (d[k] !== null && d[k] !== '' && d[k] !== 0 && !Array.isArray(d[k])) {
          console.log(`  ${k}: ${d[k]}`);
        }
      }
      // Print child tables
      for (const k of keys) {
        if (Array.isArray(d[k]) && d[k].length > 0) {
          console.log(`  [${k}]:`);
          d[k].forEach(row => {
            const rowKeys = Object.keys(row).filter(rk => !['name','owner','creation','modified','modified_by','docstatus','idx','parent','parentfield','parenttype','doctype'].includes(rk));
            console.log('    ' + rowKeys.map(rk => `${rk}=${row[rk]}`).join(' | '));
          });
        }
      }
    }

    // Get all sales invoices
    const invList = await get(`/api/resource/Sales Invoice?filters=[["customer","=","${s.name}"]]&limit=30`);
    console.log(`\n[ALL SALES INVOICES] (${(invList.data || []).length} found)`);
    
    for (const inv of (invList.data || [])) {
      const invFull = await get(`/api/resource/Sales Invoice/${inv.name}`);
      const d = invFull.data || {};
      console.log(`\n  Invoice: ${inv.name}`);
      const printFields = ['posting_date','due_date','grand_total','outstanding_amount','status','docstatus',
        'custom_installment_number','custom_payment_plan','custom_fee_category','custom_class',
        'custom_installment_label','custom_quarter','custom_installment_type'];
      for (const f of printFields) {
        if (d[f] !== undefined && d[f] !== null && d[f] !== '') {
          console.log(`    ${f}: ${d[f]}`);
        }
      }
      // Print items
      if (d.items && d.items.length > 0) {
        console.log('    items:');
        d.items.forEach(item => {
          console.log(`      item_code=${item.item_code} | item_name=${item.item_name} | qty=${item.qty} | rate=${item.rate} | amount=${item.amount}`);
        });
      }
    }
  }
}

main().catch(console.error);
