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

  // ─── Sana Fathima K M: installment plan - look at all invoice details ───
  console.log('\n═══ Sana Fathima K M - invoice items (installment student, same program) ═══');
  const inv1 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-04632');
  const inv8 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-04852');
  if (inv1.data) {
    console.log('SINV-04632 item:', inv1.data.items?.[0]?.item_name, '| rate:', inv1.data.items?.[0]?.rate, '| description:', inv1.data.items?.[0]?.description);
    console.log('  custom fields:', Object.fromEntries(Object.entries(inv1.data).filter(([k]) => k.startsWith('custom_'))));
    console.log('  payment_schedule due_dates:', inv1.data.payment_schedule?.map(p=>({due:p.due_date, amt:p.payment_amount})));
  }
  if (inv8.data) {
    console.log('SINV-04852 (overdue):', inv8.data.items?.[0]?.item_name, '| rate:', inv8.data.items?.[0]?.rate, '| description:', inv8.data.items?.[0]?.description);
    console.log('  posting_date:', inv8.data.posting_date, '| due_date:', inv8.data.due_date, '| status:', inv8.data.status);
  }

  // ─── Check ALL installment invoices for Sana Fathima K M ───
  console.log('\n═══ Sana Fathima K M - ALL invoice items ═══');
  const invoicesKM = ['ACC-SINV-2026-04632','ACC-SINV-2026-04633','ACC-SINV-2026-04634','ACC-SINV-2026-04635','ACC-SINV-2026-04636','ACC-SINV-2026-04637','ACC-SINV-2026-04638'];
  for (const id of invoicesKM) {
    const inv = await fetchJSON(BASE + '/api/resource/Sales Invoice/' + id);
    if (inv.data) {
      const item = inv.data.items?.[0];
      console.log(id, '| due:', inv.data.due_date, '| item:', item?.item_name, '| rate:', item?.rate, '| desc:', item?.description?.slice(0,60));
    }
  }

  // ─── Admission Fee item price ───
  console.log('\n═══ Admission Fee item price ═══');
  const admPrice = await fetchJSON(BASE + '/api/resource/Item Price?filters=[["item_code","=","Admission Fee"]]&fields=["name","item_code","price_list","price_list_rate","customer"]&limit=20');
  console.log(JSON.stringify(admPrice, null, 2));

  // ─── 10th State installment fee items ───
  console.log('\n═══ 10th State Monthly Fee item price ═══');
  // Try searching for item names like "10th State Monthly" or "Installment"
  const monthlyItems = await fetchJSON(BASE + '/api/resource/Item?filters=[["item_group","=","Fee Component"]]&fields=["name","item_name","item_code"]&limit=50');
  console.log(JSON.stringify(monthlyItems, null, 2));

  // ─── Item price for Sana Fathima K M items ───
  console.log('\n═══ Item from first installment invoice of KM ═══');
  const invKM1 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-04632');
  const itemCode = invKM1.data?.items?.[0]?.item_code;
  console.log('Item code in KM invoice:', itemCode);
  if (itemCode) {
    const price = await fetchJSON(BASE + '/api/resource/Item Price?filters=[["item_code","=","' + itemCode + '"]]&fields=["name","item_code","price_list","price_list_rate","selling"]&limit=10');
    console.log('Price list:', JSON.stringify(price, null, 2));
  }

  // ─── What is 10th State annual total if installment? ───
  console.log('\n═══ Sana Fathima K M - Full installment plan total ═══');
  const sanaKMAll = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima K M"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status"]&limit=20');
  let totalKM = 0;
  (sanaKMAll.data || []).forEach(i => { totalKM += i.grand_total; console.log('  ', i.name, '| due:', i.due_date, '| total:', i.grand_total, '| status:', i.status); });
  console.log('GRAND TOTAL (installment plan):', totalKM);

  // ─── OTP amount vs installment comparison ───
  console.log('\n═══ Sana Mehreen S - Full installment plan total ═══');
  const sanaM = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Mehreen S"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status"]&limit=20');
  let totalM = 0;
  (sanaM.data || []).forEach(i => { totalM += i.grand_total; console.log('  ', i.name, '| due:', i.due_date, '| total:', i.grand_total, '| status:', i.status); });
  console.log('GRAND TOTAL (installment plan, Sana Mehreen):', totalM);
}

main().catch(console.error);
