import https from 'https';

function rawGet(path) {
  const safePath = path.replace(/ /g, '%20');
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'smartup.m.frappe.cloud',
      path: safePath,
      method: 'GET',
      headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ _raw: data.slice(0, 500) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const STU_ID = 'STU-SU FKO-26-091';
const PE_ID = 'PEN-9th-Fortkochi 26-27-091';

async function main() {
  console.log('=== SANA FATHIMA TS — Final Deep Study ===\n');

  // 1. Full PE doc
  console.log('--- 1. Full PE Document ---');
  const peDoc = await rawGet(`/api/resource/Program Enrollment/${PE_ID}`);
  const p = peDoc.data;
  if (!p) { console.log('ERROR:', JSON.stringify(peDoc)); return; }
  console.log(JSON.stringify({
    name: p.name,
    student: p.student,
    student_name: p.student_name,
    program: p.program,
    academic_year: p.academic_year,
    enrollment_date: p.enrollment_date,
    custom_fee_structure: p.custom_fee_structure,
    custom_no_of_instalments: p.custom_no_of_instalments,
    custom_billing_start_date: p.custom_billing_start_date,
    custom_demo: p.custom_demo,
    docstatus: p.docstatus,
    fees: p.fees,
    courses: p.courses?.length,
  }, null, 2));

  // Print ALL custom fields from PE
  console.log('\nAll custom fields:');
  for (const [k, v] of Object.entries(p)) {
    if (k.startsWith('custom_') && v !== null && v !== undefined && v !== '') {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }
  }

  // 2. Sales Order
  console.log('\n--- 2. Sales Orders ---');
  const so = await rawGet(`/api/resource/Sales Order?filters=[["customer","=","${STU_ID}"]]&fields=["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","docstatus","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date"]&limit_page_length=20`);
  console.log(JSON.stringify(so.data, null, 2));
  if (so.exception) console.log('Exception:', so.exc_type, so._server_messages);

  if (so.data && so.data.length > 0) {
    for (const s of so.data) {
      console.log(`\n--- SO Full Doc: ${s.name} ---`);
      const soDoc = await rawGet(`/api/resource/Sales Order/${s.name}`);
      const d = soDoc.data;
      if (d) {
        console.log(JSON.stringify({
          name: d.name,
          status: d.status,
          grand_total: d.grand_total,
          advance_paid: d.advance_paid,
          per_billed: d.per_billed,
          transaction_date: d.transaction_date,
          docstatus: d.docstatus,
          custom_fee_structure: d.custom_fee_structure,
          custom_no_of_instalments: d.custom_no_of_instalments,
          custom_billing_start_date: d.custom_billing_start_date,
          custom_demo: d.custom_demo,
          items: d.items?.map(i => ({
            item_code: i.item_code,
            item_name: i.item_name,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            billed_amt: i.billed_amt,
          })),
        }, null, 2));
      }
    }
  }

  // 3. Sales Invoices
  console.log('\n--- 3. Sales Invoices ---');
  const sinv = await rawGet(`/api/resource/Sales Invoice?filters=[["customer","=","${STU_ID}"]]&fields=["name","customer","customer_name","status","grand_total","outstanding_amount","due_date","posting_date","custom_installment_number","docstatus"]&limit_page_length=50`);
  console.log('Count:', sinv.data?.length);
  console.log(JSON.stringify(sinv.data, null, 2));
  if (sinv.exception) console.log('Exception:', sinv.exc_type);

  // 4. Payment Entries
  console.log('\n--- 4. Payment Entries ---');
  const pay = await rawGet(`/api/resource/Payment Entry?filters=[["party","=","${STU_ID}"]]&fields=["name","party","party_name","paid_amount","payment_type","reference_no","posting_date","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(pay.data, null, 2));
  if (pay.exception) console.log('Exception:', pay.exc_type);

  // 5. Fee Structures for FKO/9th
  console.log('\n--- 5. 9th State Fee Structures ---');
  const fs9 = await rawGet(`/api/resource/Fee Structure?filters=[["program","=","9th State"]]&fields=["name","program","academic_year","total_amount"]&limit_page_length=50`);
  console.log(JSON.stringify(fs9.data, null, 2));
  if (fs9.exception) console.log('Exception:', fs9.exc_type);

  // 6. All FKO fee structures (search by name)
  console.log('\n--- 6. SU FKO Fee Structures (by name) ---');
  const fsFKO = await rawGet(`/api/resource/Fee Structure?filters=[["name","like","SU FKO%"]]&fields=["name","program","academic_year","total_amount"]&limit_page_length=100`);
  console.log('Count:', fsFKO.data?.length);
  console.log(JSON.stringify(fsFKO.data, null, 2));
  if (fsFKO.exception) console.log('Exception:', fsFKO.exc_type);

  // 7. Neighbor students' PEs - to understand their structure
  console.log('\n--- 7. Neighbor PEs (090, 092) ---');
  const pe90 = await rawGet(`/api/resource/Program Enrollment?filters=[["student","=","STU-SU FKO-26-090"]]&fields=["name","student","student_name","program","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","docstatus","academic_year"]&limit_page_length=5`);
  console.log('090:', JSON.stringify(pe90.data, null, 2));

  const pe92 = await rawGet(`/api/resource/Program Enrollment?filters=[["student","=","STU-SU FKO-26-092"]]&fields=["name","student","student_name","program","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","docstatus","academic_year"]&limit_page_length=5`);
  console.log('092:', JSON.stringify(pe92.data, null, 2));

  // 8. SO for neighbor students
  console.log('\n--- 8. SO for neighbors (090, 092) ---');
  const so90 = await rawGet(`/api/resource/Sales Order?filters=[["customer","=","STU-SU FKO-26-090"]]&fields=["name","status","grand_total","transaction_date","docstatus"]&limit_page_length=5`);
  console.log('SO 090:', JSON.stringify(so90.data, null, 2));

  const so92 = await rawGet(`/api/resource/Sales Order?filters=[["customer","=","STU-SU FKO-26-092"]]&fields=["name","status","grand_total","transaction_date","docstatus"]&limit_page_length=5`);
  console.log('SO 092:', JSON.stringify(so92.data, null, 2));

  // 9. SINV for neighbors
  console.log('\n--- 9. SINV for 090 ---');
  const sinv90 = await rawGet(`/api/resource/Sales Invoice?filters=[["customer","=","STU-SU FKO-26-090"]]&fields=["name","status","grand_total","outstanding_amount","due_date","posting_date","docstatus"]&limit_page_length=10`);
  console.log('SINV 090:', JSON.stringify(sinv90.data, null, 2));

  console.log('\n=== FINAL STUDY COMPLETE ===');
}

main().catch(console.error);
