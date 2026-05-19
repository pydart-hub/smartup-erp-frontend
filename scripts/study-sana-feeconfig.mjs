const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  if (!r.ok) return { data: null };
  return r.json();
}

async function main() {
  // Try to get PLR 10th State fee structures using exact program name
  console.log('\n═══ Fee Structures: PLR 10th State (exact) ═══');
  const filters = encodeURIComponent(JSON.stringify([
    ["company", "=", "Smart Up Palluruthy"],
    ["program", "=", "10th State"],
    ["docstatus", "=", 1]
  ]));
  const fields = encodeURIComponent(JSON.stringify([
    "name", "program", "company", "custom_plan",
    "custom_no_of_instalments", "total_amount", "academic_year"
  ]));
  const fs = await fetchJSON(`${BASE}/api/resource/Fee Structure?filters=${filters}&fields=${fields}&limit=20`);
  console.log(JSON.stringify(fs, null, 2));

  // Get the specific fee structures we know about
  console.log('\n═══ Fee Structure: SU PLR-10th State-Basic-8 ═══');
  const fs8 = await fetchJSON(`${BASE}/api/resource/Fee Structure/SU PLR-10th State-Basic-8`);
  if (fs8.data) {
    console.log('name:', fs8.data.name);
    console.log('total_amount:', fs8.data.total_amount);
    console.log('custom_plan:', fs8.data.custom_plan);
    console.log('custom_no_of_instalments:', fs8.data.custom_no_of_instalments);
    console.log('fees:', JSON.stringify(fs8.data.fees, null, 2));
  }

  // Try the OTP fee structure
  console.log('\n═══ Fee Structure: SU PLR-10th State-Basic-1 ═══');
  const fs1 = await fetchJSON(`${BASE}/api/resource/Fee Structure/SU PLR-10th State-Basic-1`);
  if (fs1.data) {
    console.log('name:', fs1.data.name);
    console.log('total_amount:', fs1.data.total_amount);
    console.log('custom_plan:', fs1.data.custom_plan);
    console.log('custom_no_of_instalments:', fs1.data.custom_no_of_instalments);
    console.log('fees:', JSON.stringify(fs1.data.fees, null, 2));
  } else {
    console.log('(not found)');
  }

  // Get the SO details
  console.log('\n═══ Sales Order Details: SAL-ORD-2026-00688 ═══');
  const so = await fetchJSON(`${BASE}/api/resource/Sales Order/SAL-ORD-2026-00688`);
  if (so.data) {
    console.log('grand_total:', so.data.grand_total);
    console.log('status:', so.data.status);
    console.log('per_billed:', so.data.per_billed);
    console.log('custom_plan:', so.data.custom_plan);
    console.log('custom_no_of_instalments:', so.data.custom_no_of_instalments);
    console.log('items:');
    (so.data.items || []).forEach(i => {
      console.log('  qty:', i.qty, '| rate:', i.rate, '| amount:', i.amount, '| item_code:', i.item_code, '| billed_amt:', i.billed_amt, '| delivered_qty:', i.delivered_qty);
    });
  }

  // Check Invoice 2 details thoroughly
  console.log('\n═══ Invoice 2 Full Details: ACC-SINV-2026-07237 ═══');
  const inv2 = await fetchJSON(`${BASE}/api/resource/Sales Invoice/ACC-SINV-2026-07237`);
  if (inv2.data) {
    console.log('grand_total:', inv2.data.grand_total);
    console.log('outstanding_amount:', inv2.data.outstanding_amount);
    console.log('due_date:', inv2.data.due_date);
    console.log('docstatus:', inv2.data.docstatus);
    console.log('posting_date:', inv2.data.posting_date);
    console.log('created_by:', inv2.data.owner);
    console.log('is_return:', inv2.data.is_return);
  }
}

main().catch(console.error);
