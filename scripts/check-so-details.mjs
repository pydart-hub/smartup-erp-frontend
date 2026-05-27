// Fetch full Sales Orders for all 3 students

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
    console.log(`STUDENT: ${s.name}`);
    console.log('='.repeat(60));

    const soList = await get(`/api/resource/Sales Order?filters=[["customer","=","${s.name}"]]&limit=10`);
    for (const soRef of (soList.data || [])) {
      const so = await get(`/api/resource/Sales Order/${soRef.name}`);
      const d = so.data || {};
      console.log(`\n[SO: ${soRef.name}]`);
      const printFields = [
        'transaction_date','status','docstatus','grand_total','advance_paid',
        'per_billed','billing_status','custom_fee_category','custom_plan',
        'custom_class','custom_no_of_instalments','custom_fee_structure',
        'custom_academic_year','custom_branch','company','customer',
        'advance_payment_status','per_delivered','delivery_status'
      ];
      for (const f of printFields) {
        if (d[f] !== undefined && d[f] !== null && d[f] !== '') {
          console.log(`  ${f}: ${d[f]}`);
        }
      }
      if (d.items && d.items.length > 0) {
        console.log('  items:');
        d.items.forEach(item => {
          console.log(`    name=${item.name} | item_code=${item.item_code} | qty=${item.qty} | rate=${item.rate} | amount=${item.amount} | billed_amt=${item.billed_amt}`);
        });
      }
      if (d.payment_schedule && d.payment_schedule.length > 0) {
        console.log('  payment_schedule:');
        d.payment_schedule.forEach(ps => {
          console.log(`    due=${ps.due_date} | payment_amount=${ps.payment_amount} | outstanding=${ps.outstanding}`);
        });
      }
    }
  }
}

main().catch(console.error);
