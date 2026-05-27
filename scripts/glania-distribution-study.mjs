// Study the payment distribution logic for Glania's conversion
// Paid ₹8300 → first fill Q1 (5900), then remaining 2400 fills part of Q2

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  console.log('='.repeat(65));
  console.log('PAYMENT DISTRIBUTION STUDY: GLANIA PHILIP');
  console.log('='.repeat(65));

  // 1. Full payment entry detail
  console.log('\n========== PAYMENT ENTRY: ACC-PAY-2026-04005 ==========');
  const pe = await get('/api/resource/Payment Entry/ACC-PAY-2026-04005');
  const ped = pe.data || {};
  const skip = ['owner','creation','modified','modified_by','idx','_liked_by'];
  for (const k of Object.keys(ped)) {
    if (skip.includes(k)) continue;
    if (Array.isArray(ped[k]) && ped[k].length > 0) {
      console.log(`  [${k}]:`);
      ped[k].forEach(row => {
        const rks = Object.keys(row).filter(x => !skip.includes(x) && !['parent','parentfield','parenttype','doctype'].includes(x));
        console.log('    ' + rks.map(x => `${x}=${JSON.stringify(row[x])}`).join(' | '));
      });
    } else if (!Array.isArray(ped[k]) && ped[k] !== null && ped[k] !== '' && ped[k] !== 0 && ped[k] !== false) {
      console.log(`  ${k}: ${ped[k]}`);
    }
  }

  // 2. Check payment distribution calculation
  console.log('\n========== DISTRIBUTION CALCULATION ==========');
  const PAID = 8300;
  const BASIC_Q1 = 5900;
  const BASIC_Q2 = 4200;
  const BASIC_Q3 = 4200;
  const BASIC_Q4 = 2600;
  const BASIC_TOTAL = BASIC_Q1 + BASIC_Q2 + BASIC_Q3 + BASIC_Q4;

  const q1_covered = Math.min(PAID, BASIC_Q1);        // 5900
  const excess = PAID - q1_covered;                    // 2400
  const q2_remaining = BASIC_Q2 - excess;              // 1800

  console.log(`  Total Paid:           ₹${PAID}`);
  console.log(`  Basic Q1 amount:      ₹${BASIC_Q1}`);
  console.log(`  → Q1 covered:         ₹${q1_covered} (FULLY PAID)`);
  console.log(`  → Excess from Q1:     ₹${excess}`);
  console.log(`  Basic Q2 amount:      ₹${BASIC_Q2}`);
  console.log(`  → Q2 pre-covered:     ₹${excess}`);
  console.log(`  → Q2 still due:       ₹${q2_remaining}`);
  console.log(`  Basic Q3 amount:      ₹${BASIC_Q3} (still due)`);
  console.log(`  Basic Q4 amount:      ₹${BASIC_Q4} (still due)`);
  console.log(`  Basic Total:          ₹${BASIC_TOTAL}`);
  console.log(`  Total accounted:      ₹${q1_covered} + ₹${q2_remaining} + ₹${BASIC_Q3} + ₹${BASIC_Q4} + ₹${excess} (excess absorbed) = ₹${PAID + q2_remaining + BASIC_Q3 + BASIC_Q4}`);
  console.log(`  CHECK: Paid ${PAID} + New invoices (${q2_remaining}+${BASIC_Q3}+${BASIC_Q4}) = ₹${PAID + q2_remaining + BASIC_Q3 + BASIC_Q4} (should be ${BASIC_TOTAL})`);

  // 3. Look at what can/cannot be cancelled
  console.log('\n========== INVOICE CANCELLABILITY CHECK ==========');
  const toCheck = [
    { name: 'ACC-SINV-2026-02507', label: 'Q1 (PAID)' },
    { name: 'ACC-SINV-2026-02508', label: 'Q2 (Unpaid)' },
    { name: 'ACC-SINV-2026-02509', label: 'Q3 (Unpaid)' },
    { name: 'ACC-SINV-2026-02510', label: 'Q4 (Unpaid)' },
  ];
  for (const inv of toCheck) {
    const data = await get(`/api/resource/Sales Invoice/${inv.name}`);
    const d = data.data || {};
    console.log(`  ${inv.name} [${inv.label}]: grand_total=₹${d.grand_total} | outstanding=₹${d.outstanding_amount} | status=${d.status} | docstatus=${d.docstatus}`);
  }

  // 4. Check if Q1 invoice has any linked returns or credit notes
  console.log('\n========== LINKED DOCS TO Q1 INVOICE ==========');
  const linked = await get(`/api/method/frappe.desk.form.load.get_docinfo?doctype=Sales Invoice&name=ACC-SINV-2026-02507`);
  const ld = linked.message || linked;
  if (ld.linked_docs) {
    console.log('linked_docs:', JSON.stringify(ld.linked_docs, null, 2));
  } else {
    console.log('(checking returns via returns filter)');
  }

  // Check for return invoices
  const returns = await get(`/api/resource/Sales Invoice?filters=[["return_against","=","ACC-SINV-2026-02507"]]&limit=5`);
  console.log('  Return invoices:', JSON.stringify(returns.data, null, 2));

  // 5. What the new SO should look like (Basic-4 reference)
  console.log('\n========== REFERENCE: NAYANA CS SO (Basic-4, same program) ==========');
  const nso = await get('/api/resource/Sales Order/SAL-ORD-2026-00192');
  const nsoD = nso.data || {};
  console.log(`  grand_total: ₹${nsoD.grand_total}`);
  console.log(`  custom_plan: ${nsoD.custom_plan}`);
  console.log(`  custom_no_of_instalments: ${nsoD.custom_no_of_instalments}`);
  if (nsoD.items) {
    nsoD.items.forEach(item => {
      console.log(`  item: item_code=${item.item_code} | qty=${item.qty} | rate=${item.rate} | amount=${item.amount} | price_list_rate=${item.price_list_rate} | discount_amount=${item.discount_amount}`);
    });
  }
}

main().catch(console.error);
