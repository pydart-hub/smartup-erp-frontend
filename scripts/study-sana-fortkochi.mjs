const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function api(endpoint) {
  const url = BASE + endpoint;
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const text = await r.text();
    console.error(`[HTTP ${r.status}] ${url.slice(0,120)}\n${text.slice(0,300)}`);
    return [];
  }
  const j = await r.json();
  return j.data ?? j;
}

async function main() {
  // SANA FATHIMA TS is STU-SU FKO-26-091 (Fortkochi)
  const sid = 'STU-SU FKO-26-091';
  const studentName = 'SANA FATHIMA TS';

  // 1. Full student record
  console.log('=== 1. FULL STUDENT RECORD ===');
  const fullStudent = await api(`/api/resource/Student/${encodeURIComponent(sid)}`);
  console.log(JSON.stringify(fullStudent, null, 2));

  // 2. Program Enrollments (no custom_branch)
  console.log('\n=== 2. PROGRAM ENROLLMENTS ===');
  const pe = await api(
    `/api/resource/Program Enrollment?filters=[["student","=","${sid}"]]` +
    `&fields=["name","student","program","academic_year","academic_term","enrollment_date","fees_paid","docstatus"]&limit=20`
  );
  console.log(JSON.stringify(pe, null, 2));

  // 3. Sales Invoices - by student field
  console.log('\n=== 3. SALES INVOICES (by student field) ===');
  const inv1 = await api(
    `/api/resource/Sales Invoice?filters=[["student","=","${sid}"]]` +
    `&fields=["name","student","customer","customer_name","grand_total","outstanding_amount","status","docstatus","posting_date"]&limit=50`
  );
  console.log(JSON.stringify(inv1, null, 2));

  // 4. Sales Invoices - by customer_name
  console.log('\n=== 4. SALES INVOICES (by customer_name) ===');
  const inv2 = await api(
    `/api/resource/Sales Invoice?filters=[["customer_name","like","%${studentName}%"]]` +
    `&fields=["name","student","customer","customer_name","grand_total","outstanding_amount","status","docstatus","posting_date"]&limit=50`
  );
  console.log(JSON.stringify(inv2, null, 2));

  // 5. Drill into each invoice
  const allInvoices = [...(inv1 || []), ...(inv2 || [])];
  const uniqueInvNames = [...new Set(allInvoices.map(i => i.name))];
  console.log(`\n=== 5. INVOICE DETAILS (${uniqueInvNames.length} invoices) ===`);
  for (const invName of uniqueInvNames) {
    const inv = await api(`/api/resource/Sales Invoice/${encodeURIComponent(invName)}`);
    console.log(`\n--- ${invName} | Status: ${inv.status} | Docstatus: ${inv.docstatus} ---`);
    console.log(`  grand_total: ${inv.grand_total}`);
    console.log(`  outstanding_amount: ${inv.outstanding_amount}`);
    console.log(`  total_advance: ${inv.total_advance}`);
    console.log(`  posting_date: ${inv.posting_date}`);
    console.log(`  remarks: ${inv.remarks}`);
    console.log('  Items:');
    (inv.items || []).forEach(it => {
      console.log(`    - ${it.item_code} | qty: ${it.qty} | rate: ${it.rate} | amount: ${it.amount}`);
    });
    console.log('  Payment Schedule:');
    (inv.payment_schedule || []).forEach(ps => {
      console.log(`    - due: ${ps.due_date} | payment_amount: ${ps.payment_amount} | paid_amount: ${ps.paid_amount} | outstanding: ${ps.outstanding}`);
    });
  }

  // 6. Payment Entries
  console.log('\n=== 6. PAYMENT ENTRIES ===');
  const payments = await api(
    `/api/resource/Payment Entry?filters=[["party","=","${sid}"]]` +
    `&fields=["name","party","party_name","paid_amount","payment_type","posting_date","docstatus","mode_of_payment"]&limit=50`
  );
  console.log(JSON.stringify(payments, null, 2));

  // Also try by party_name
  console.log('\n=== 6b. PAYMENT ENTRIES (by party_name) ===');
  const payments2 = await api(
    `/api/resource/Payment Entry?filters=[["party_name","like","%${studentName}%"]]` +
    `&fields=["name","party","party_name","paid_amount","payment_type","posting_date","docstatus","mode_of_payment"]&limit=50`
  );
  console.log(JSON.stringify(payments2, null, 2));

  // 7. Fee Schedule (remove restricted fields)
  console.log('\n=== 7. FEE SCHEDULE ===');
  const feeSchedule = await api(
    `/api/resource/Fee Schedule?filters=[["student_name","like","%${studentName}%"]]` +
    `&fields=["name","student_name","program","total_amount","docstatus"]&limit=20`
  );
  console.log(JSON.stringify(feeSchedule, null, 2));
}

main().catch(err => console.error('FATAL:', err.message));
