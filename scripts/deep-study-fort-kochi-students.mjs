// uses built-in fetch (Node 18+)

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
    console.log(`STUDENT: ${s.name} (${s.id})`);
    console.log('='.repeat(60));

    // Course enrollments
    const enrollments = await get(
      `/api/resource/Course Enrollment?filters=[["student","=","${s.id}"]]&fields=["name","course","student","enrollment_date","custom_class","custom_fee_category","custom_payment_plan","custom_program","custom_annual_fee","custom_discount_applied"]&limit=20`
    );
    console.log('\n--- COURSE ENROLLMENTS ---');
    console.log(JSON.stringify(enrollments.data, null, 2));

    // Program enrollment
    const progEnroll = await get(
      `/api/resource/Program Enrollment?filters=[["student","=","${s.id}"]]&fields=["name","program","student","enrollment_date","custom_class","custom_fee_category","custom_payment_plan","custom_annual_fee","custom_total_fee","custom_amount_paid","custom_balance_due"]&limit=20`
    );
    console.log('\n--- PROGRAM ENROLLMENTS ---');
    console.log(JSON.stringify(progEnroll.data, null, 2));

    // Fee schedules
    const feeScheds = await get(
      `/api/resource/Fee Schedule?filters=[["student","=","${s.id}"]]&fields=["name","student","student_name","program","fee_schedule_date","total_amount","outstanding_amount","docstatus"]&limit=20`
    );
    console.log('\n--- FEE SCHEDULES ---');
    console.log(JSON.stringify(feeScheds.data, null, 2));

    // Sales invoices
    const invoices = await get(
      `/api/resource/Sales Invoice?filters=[["customer","=","${s.name}"]]&fields=["name","customer","posting_date","grand_total","outstanding_amount","status","custom_installment_number","custom_fee_category","custom_payment_plan","custom_class"]&limit=30`
    );
    console.log('\n--- SALES INVOICES ---');
    console.log(JSON.stringify(invoices.data, null, 2));

    // Fee structure (custom doctype)
    const feeStructure = await get(
      `/api/resource/Fee Structure?filters=[["student","=","${s.id}"]]&fields=["name","student","student_name","academic_year","fee_category","payment_plan","total_amount","docstatus"]&limit=10`
    );
    console.log('\n--- FEE STRUCTURE RECORDS ---');
    console.log(JSON.stringify(feeStructure.data, null, 2));
  }
}

main().catch(console.error);
