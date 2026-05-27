// Deep study - GLANIA PHILIP complete picture

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  const STUDENT_ID = 'STU-SU FKO-26-011';
  const STUDENT_NAME = 'GLANIA PHILIP';
  const SO_NAME = 'SAL-ORD-2026-00199';

  console.log('='.repeat(65));
  console.log('DEEP STUDY: GLANIA PHILIP (STU-SU FKO-26-011)');
  console.log('='.repeat(65));

  // 1. Full Sales Order
  console.log('\n========== SALES ORDER: SAL-ORD-2026-00199 ==========');
  const so = await get(`/api/resource/Sales Order/${SO_NAME}`);
  const soD = so.data || {};
  const soSkip = ['owner','creation','modified','modified_by','idx','_liked_by'];
  for (const k of Object.keys(soD)) {
    if (soSkip.includes(k)) continue;
    if (Array.isArray(soD[k]) && soD[k].length > 0) {
      console.log(`  [${k}]:`);
      soD[k].forEach(row => {
        const rk = Object.keys(row).filter(x => !soSkip.includes(x) && !['parent','parentfield','parenttype','doctype'].includes(x));
        console.log('    ' + rk.map(x => `${x}=${JSON.stringify(row[x])}`).join(' | '));
      });
    } else if (!Array.isArray(soD[k]) && soD[k] !== null && soD[k] !== '' && soD[k] !== 0 && soD[k] !== false) {
      console.log(`  ${k}: ${soD[k]}`);
    }
  }

  // 2. All 4 invoices with full item details
  const invoices = [
    'ACC-SINV-2026-02507',
    'ACC-SINV-2026-02508',
    'ACC-SINV-2026-02509',
    'ACC-SINV-2026-02510',
  ];

  for (const invName of invoices) {
    console.log(`\n========== INVOICE: ${invName} ==========`);
    const inv = await get(`/api/resource/Sales Invoice/${invName}`);
    const d = inv.data || {};
    const printFields = [
      'posting_date','due_date','grand_total','outstanding_amount','status','docstatus',
      'total','net_total','base_grand_total','customer','student',
    ];
    for (const f of printFields) {
      if (d[f] !== undefined && d[f] !== null && d[f] !== '') console.log(`  ${f}: ${d[f]}`);
    }
    if (d.items) {
      console.log('  [items]:');
      d.items.forEach(item => {
        const fields = ['item_code','item_name','description','qty','rate','amount','sales_order','so_detail','price_list_rate','discount_amount'];
        console.log('    ' + fields.map(f => `${f}=${JSON.stringify(item[f])}`).join(' | '));
      });
    }
    if (d.payment_schedule) {
      console.log('  [payment_schedule]:');
      d.payment_schedule.forEach(ps => {
        console.log(`    due_date=${ps.due_date} | payment_amount=${ps.payment_amount} | outstanding=${ps.outstanding} | paid_amount=${ps.paid_amount}`);
      });
    }
  }

  // 3. Payment entries against the paid invoice
  console.log('\n========== PAYMENT ENTRIES for GLANIA PHILIP ==========');
  const pe = await get(`/api/resource/Payment Entry?filters=[["party","=","${STUDENT_NAME}"]]&fields=["name","payment_type","party","party_name","paid_amount","received_amount","posting_date","reference_no","mode_of_payment","docstatus","remarks"]&limit=20`);
  console.log(JSON.stringify(pe.data, null, 2));

  // 4. Fetch a sample Basic-4 student's invoices to compare item structure
  console.log('\n========== SAMPLE BASIC-4 STUDENT INVOICE (NAYANA CS) ==========');
  const nayanaSI = await get(`/api/resource/Sales Invoice/ACC-SINV-2026-02472`);
  const nd = nayanaSI.data || {};
  const nPrint = ['posting_date','due_date','grand_total','outstanding_amount','status'];
  for (const f of nPrint) {
    if (nd[f] !== undefined) console.log(`  ${f}: ${nd[f]}`);
  }
  if (nd.items) {
    console.log('  [items]:');
    nd.items.forEach(item => {
      const fields = ['item_code','item_name','description','qty','rate','amount','sales_order','so_detail','price_list_rate','discount_amount'];
      console.log('    ' + fields.map(f => `${f}=${JSON.stringify(item[f])}`).join(' | '));
    });
  }

  // Also check Nayana's Q2 invoice
  console.log('\n--- NAYANA Q2 Invoice: ACC-SINV-2026-02473 ---');
  const nayana2 = await get(`/api/resource/Sales Invoice/ACC-SINV-2026-02473`);
  const nd2 = nayana2.data || {};
  for (const f of ['posting_date','due_date','grand_total','status']) {
    if (nd2[f] !== undefined) console.log(`  ${f}: ${nd2[f]}`);
  }
  if (nd2.items) {
    nd2.items.forEach(item => {
      const fields = ['item_code','description','qty','rate','amount','sales_order','so_detail','price_list_rate','discount_amount'];
      console.log('    ' + fields.map(f => `${f}=${JSON.stringify(item[f])}`).join(' | '));
    });
  }

  // 5. Nayana's Sales Order to compare
  console.log('\n========== NAYANA CS SALES ORDER (Basic-4 reference) ==========');
  const nayanaEnroll = await get(`/api/resource/Program Enrollment/PEN-10th-Fortkochi 26-27-008`);
  const neD = nayanaEnroll.data || {};
  console.log(`  custom_fee_structure: ${neD.custom_fee_structure}`);
  console.log(`  custom_plan: ${neD.custom_plan}`);
  console.log(`  custom_no_of_instalments: ${neD.custom_no_of_instalments}`);

  const nayanaSO = await get(`/api/resource/Sales Order?filters=[["customer","=","NAYANA CS"]]&limit=5`);
  if (nayanaSO.data && nayanaSO.data.length > 0) {
    const nso = await get(`/api/resource/Sales Order/${nayanaSO.data[0].name}`);
    const nsoD = nso.data || {};
    console.log(`\n  SO: ${nayanaSO.data[0].name}`);
    console.log(`  grand_total: ${nsoD.grand_total}`);
    console.log(`  custom_plan: ${nsoD.custom_plan}`);
    console.log(`  custom_no_of_instalments: ${nsoD.custom_no_of_instalments}`);
    if (nsoD.items) {
      nsoD.items.forEach(item => {
        console.log(`  item: name=${item.name} | item_code=${item.item_code} | qty=${item.qty} | rate=${item.rate} | amount=${item.amount} | billed_amt=${item.billed_amt}`);
      });
    }
  }
}

main().catch(console.error);
