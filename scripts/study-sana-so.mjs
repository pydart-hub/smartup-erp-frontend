const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const text = await r.text();
    console.error(`[SKIP] HTTP ${r.status}: ${text.slice(0,150)}`);
    return { data: null };
  }
  return r.json();
}

async function main() {

  // 1. Sales Orders for Sana Fathima Ismail
  console.log('\n═══ 1. SALES ORDERS ═══');
  const so = await fetchJSON(BASE + '/api/resource/Sales Order?filters=[["customer_name","=","Sana Fathima Ismail"]]&fields=["name","customer","customer_name","transaction_date","grand_total","status","per_billed","advance_paid","custom_plan","custom_no_of_instalments","custom_academic_year","docstatus"]&limit=20');
  console.log(JSON.stringify(so, null, 2));

  // 2. What is Invoice 1 SO link?
  console.log('\n═══ 2. Invoice 1 SO link ═══');
  const inv1 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-05659');
  console.log('sales_order (inv1):', inv1.data?.sales_order);
  console.log('so_detail (inv1):', JSON.stringify(inv1.data?.items?.[0]?.sales_order, null, 2));
  const inv1ItemSO = inv1.data?.items?.[0];
  console.log('item sales_order:', inv1ItemSO?.sales_order, '| sales_order_item:', inv1ItemSO?.so_detail);

  // 3. What is Invoice 2 SO link?
  console.log('\n═══ 3. Invoice 2 SO link ═══');
  const inv2 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-07237');
  console.log('sales_order (inv2):', inv2.data?.sales_order);
  const inv2Item = inv2.data?.items?.[0];
  console.log('item sales_order:', inv2Item?.sales_order, '| so_detail:', inv2Item?.so_detail);

  // 4. Program Enrollment for Sana - check custom_plan fields
  console.log('\n═══ 4. PROGRAM ENROLLMENT FIELDS ═══');
  const pe = await fetchJSON(BASE + '/api/resource/Program Enrollment/PEN-10th-Palluruthy 26-27-061');
  const peD = pe.data;
  if (peD) {
    const customFields = Object.fromEntries(Object.entries(peD).filter(([k]) => k.startsWith('custom_') || k === 'student_category'));
    console.log('custom fields:', JSON.stringify(customFields, null, 2));
    console.log('docstatus:', peD.docstatus, '| program:', peD.program, '| academic_year:', peD.academic_year);
  }

  // 5. Fee Structure for PLR 10th State (all plans)
  console.log('\n═══ 5. FEE STRUCTURES: PLR 10th State ═══');
  const fs = await fetchJSON(BASE + '/api/resource/Fee Structure?filters=[["company","=","Smart Up Palluruthy"],["program","like","%10th%"]]&fields=["name","program","company","custom_plan","custom_no_of_instalments","total_amount","academic_year","docstatus"]&limit=20');
  console.log(JSON.stringify(fs, null, 2));

  // 6. Check if PE has a Sales Order linked
  console.log('\n═══ 6. Sales Orders by student ID ═══');
  const so2 = await fetchJSON(BASE + '/api/resource/Sales Order?filters=[["student","=","STU-SU PLR-26-061"]]&fields=["name","customer","customer_name","transaction_date","grand_total","status","per_billed","custom_plan","custom_no_of_instalments","docstatus"]&limit=20');
  console.log(JSON.stringify(so2, null, 2));

  // 7. Check fee config API response for PLR 10th State Basic
  console.log('\n═══ 7. Items in inv1 and inv2 (full) ═══');
  console.log('INV1 items:');
  (inv1.data?.items || []).forEach(i => {
    console.log('  item_code:', i.item_code, '| desc:', i.description, '| rate:', i.rate, '| so_detail:', i.so_detail, '| sales_order:', i.sales_order);
  });
  console.log('INV2 items:');
  (inv2.data?.items || []).forEach(i => {
    console.log('  item_code:', i.item_code, '| desc:', i.description, '| rate:', i.rate, '| so_detail:', i.so_detail, '| sales_order:', i.sales_order);
  });
}

main().catch(console.error);
