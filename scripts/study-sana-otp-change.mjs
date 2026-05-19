const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const text = await r.text();
    console.error(`[SKIP] HTTP ${r.status}: ${text.slice(0,200)}`);
    return { data: null };
  }
  return r.json();
}

async function main() {

  // ═══════════════════════════════════════════════════════
  // STEP 1: Find the cancelled invoice ACC-SINV-2026-04772
  //         It was referenced in cancelled PE-04429
  //         Let's look for it in cancelled invoices
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 1: Search for the original cancelled invoice ═══');
  // Try fetching with amended/cancelled docstatus=2
  const cancelledInv = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima Ismail"],["docstatus","=","2"]]&fields=["name","posting_date","grand_total","status","docstatus","remarks"]&limit=20');
  console.log('Cancelled invoices:', JSON.stringify(cancelledInv, null, 2));

  // Also check all docstatuses
  const allInv = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima Ismail"]]&fields=["name","posting_date","grand_total","outstanding_amount","status","docstatus","remarks"]&limit=20&include_cancelled=true');
  console.log('All invoices (inc cancelled):', JSON.stringify(allInv, null, 2));

  // ═══════════════════════════════════════════════════════
  // STEP 2: Look at SIMILAR students in PLR - 10th State
  //         to understand the standard installment plan
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 2: PLR 10th State - Find students with installment plans ═══');
  // Get some PLR students' invoices to compare fee amounts
  const plrStudents10 = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["company","=","Smart Up Palluruthy"],["item_code","=","10th State Tuition Fee"]]&fields=["name","customer_name","posting_date","grand_total","outstanding_amount","status"]&order_by=posting_date asc&limit=30');
  console.log(JSON.stringify(plrStudents10, null, 2));

  // ═══════════════════════════════════════════════════════
  // STEP 3: Understand what item codes PLR uses for fees
  //         to see admission fee vs tuition fee
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 3: All PLR invoice items in April 2026 ═══');
  const plrItems = await fetchJSON(BASE + '/api/resource/Sales Invoice Item?filters=[["parent","like","ACC-SINV-2026-05659"]]&fields=["item_code","item_name","rate","amount","description","parent"]&limit=20');
  console.log('Invoice items for SINV-05659:', JSON.stringify(plrItems, null, 2));

  const plrItems2 = await fetchJSON(BASE + '/api/resource/Sales Invoice Item?filters=[["parent","=","ACC-SINV-2026-07237"]]&fields=["item_code","item_name","rate","amount","description","parent"]&limit=20');
  console.log('Invoice items for SINV-07237:', JSON.stringify(plrItems2, null, 2));

  // ═══════════════════════════════════════════════════════
  // STEP 4: Look at another PLR 10th State student to
  //         understand the full installment plan structure
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 4: Other PLR 10th State student invoices (compare structure) ═══');
  // Find another PLR 10th student - take Sana Fathima K M (STU-SU PLR-26-054) nearby
  const peer1 = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima K M"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","remarks"]&limit=20');
  console.log('Sana Fathima K M invoices:', JSON.stringify(peer1, null, 2));

  // Sana Mehreen S (PLR-26-007)
  const peer2 = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Mehreen S"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status"]&limit=20');
  console.log('Sana Mehreen S invoices:', JSON.stringify(peer2, null, 2));

  // ═══════════════════════════════════════════════════════
  // STEP 5: Custom Fee Plan doctype - try different names
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 5: Fee Plan doctypes ═══');
  const planNames = ['Student Fee Plan', 'Fee Payment Plan', 'Installment Plan', 'Fee Collection'];
  for (const pn of planNames) {
    const r = await fetchJSON(BASE + '/api/resource/' + encodeURIComponent(pn) + '?limit=1&fields=["name"]');
    if (r.data !== null) console.log('EXISTS:', pn, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════
  // STEP 6: Check admission fee item for PLR
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 6: Admission Fee items ═══');
  const admFee = await fetchJSON(BASE + '/api/resource/Item?filters=[["item_name","like","%Admission%"],["item_group","=","Fee Component"]]&fields=["name","item_name","item_code"]&limit=20');
  console.log(JSON.stringify(admFee, null, 2));

  // ═══════════════════════════════════════════════════════
  // STEP 7: What did invoice SINV-05659 look like 
  //         FULLY (all fields incl item description)
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 7: Full SINV-05659 items detail ═══');
  const inv1 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-05659');
  if (inv1.data) {
    console.log('Title:', inv1.data.title);
    console.log('Remarks:', inv1.data.remarks);
    console.log('Items full:');
    (inv1.data.items || []).forEach(i => {
      console.log('  -', JSON.stringify({
        item_code: i.item_code, item_name: i.item_name,
        description: i.description, qty: i.qty,
        rate: i.rate, amount: i.amount,
        income_account: i.income_account
      }));
    });
    console.log('Payment schedule:', JSON.stringify(inv1.data.payment_schedule, null, 2));
  }

  console.log('\n═══ STEP 7b: Full SINV-07237 items detail ═══');
  const inv2 = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-07237');
  if (inv2.data) {
    console.log('Title:', inv2.data.title);
    console.log('Remarks:', inv2.data.remarks);
    console.log('Items full:');
    (inv2.data.items || []).forEach(i => {
      console.log('  -', JSON.stringify({
        item_code: i.item_code, item_name: i.item_name,
        description: i.description, qty: i.qty,
        rate: i.rate, amount: i.amount
      }));
    });
    console.log('Payment schedule:', JSON.stringify(inv2.data.payment_schedule, null, 2));
    console.log('Custom fields:', Object.fromEntries(Object.entries(inv2.data).filter(([k]) => k.startsWith('custom_'))));
  }

  // ═══════════════════════════════════════════════════════
  // STEP 8: Cancelled payment entry ACC-PAY-2026-04429 full
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 8: Cancelled PE-04429 full detail ═══');
  const pe0 = await fetchJSON(BASE + '/api/resource/Payment Entry/ACC-PAY-2026-04429');
  if (pe0.data) {
    console.log('docstatus:', pe0.data.docstatus, '(2=Cancelled)');
    console.log('paid_amount:', pe0.data.paid_amount);
    console.log('mode_of_payment:', pe0.data.mode_of_payment);
    console.log('posting_date:', pe0.data.posting_date);
    console.log('reference_no:', pe0.data.reference_no);
    console.log('remarks:', pe0.data.remarks);
    console.log('references:', JSON.stringify(pe0.data.references, null, 2));
  }

  // ═══════════════════════════════════════════════════════
  // STEP 9: Check item prices for installment-related items
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STEP 9: All Fee Component items for 10th ═══');
  const feeItems = await fetchJSON(BASE + '/api/resource/Item?filters=[["item_group","=","Fee Component"],["item_name","like","%10th%"]]&fields=["name","item_name","item_code","standard_rate"]&limit=30');
  console.log(JSON.stringify(feeItems, null, 2));
}

main().catch(console.error);
