// Verify Glania conversion
const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function go() {
  // All invoices
  const r = await fetch(base + '/api/resource/Sales Invoice?filters=[["customer","=","GLANIA PHILIP"]]&fields=["name","grand_total","outstanding_amount","status","docstatus","due_date"]&limit=20', {headers:h});
  const d = await r.json();
  
  console.log('\n=== ALL GLANIA INVOICES ===');
  d.data.forEach(i => {
    const mark = i.docstatus === 2 ? '❌CANCELLED' : (i.status === 'Paid' ? '✅PAID' : '⏳'+i.status.toUpperCase());
    console.log(`  ${i.name} | ₹${i.grand_total} | ${mark} | due=${i.due_date}`);
  });
  
  const active = d.data.filter(i => i.docstatus !== 2);
  const total = active.reduce((s,i) => s + i.grand_total, 0);
  console.log(`\n  Active Total: ₹${total} (expected ₹16,900) ${total === 16900 ? '✅' : '⚠'}`);

  // New Program Enrollment
  const pe = await fetch(base + '/api/resource/Program Enrollment/PEN-10th-Fortkochi%2026-27-011-1', {headers:h});
  const ped = await pe.json();
  const p = ped.data;
  console.log('\n=== NEW PROGRAM ENROLLMENT ===');
  console.log(`  Name:             ${p.name}`);
  console.log(`  Plan:             ${p.custom_plan}`);
  console.log(`  Fee Structure:    ${p.custom_fee_structure}`);
  console.log(`  Instalments:      ${p.custom_no_of_instalments}`);
  console.log(`  Amended from:     ${p.amended_from}`);
  console.log(`  docstatus:        ${p.docstatus} (1=submitted)`);
}

go().catch(console.error);
