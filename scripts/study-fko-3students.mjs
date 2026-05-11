/**
 * Study data for RIHAN VIJAY, YOHAN VIJAY, SHYAM JITH
 * - All Sales Orders
 * - All Sales Invoices (active + cancelled)
 * - All Payment Entries
 * - Program Enrollments
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };
const scriptName = 'study-fko-3students-' + Date.now();

const pyCode = `
students = [
    {'id': 'STU-SU FKO-26-076', 'name': 'SHYAM JITH'},
    {'id': 'STU-SU FKO-26-077', 'name': 'YOHAN VIJAY'},
    {'id': 'STU-SU FKO-26-078', 'name': 'RIHAN VIJAY'},
]

result = {}

for stu in students:
    sid = stu['id']
    data = {}
    
    # 1. All Sales Orders (any status)
    sos = frappe.db.sql("""
        SELECT name, transaction_date, grand_total, per_billed, status, docstatus,
               custom_plan, custom_no_of_instalments, custom_academic_year
        FROM \`tabSales Order\`
        WHERE student = %s
        ORDER BY transaction_date DESC
    """, (sid,), as_dict=True)
    data['sales_orders'] = sos
    
    # 2. All Sales Invoices linked to this student (any status)
    invoices = frappe.db.sql("""
        SELECT si.name, si.posting_date, si.grand_total, si.outstanding_amount,
               si.docstatus, si.status, sii.sales_order, sii.rate, sii.amount
        FROM \`tabSales Invoice\` si
        JOIN \`tabSales Invoice Item\` sii ON sii.parent = si.name
        WHERE si.student = %s
        ORDER BY si.posting_date, si.name
    """, (sid,), as_dict=True)
    data['invoices'] = invoices
    
    # 3. All Payment Entries linked to this student's SOs
    payments = frappe.db.sql("""
        SELECT pe.name, pe.posting_date, pe.paid_amount, pe.payment_type,
               pe.docstatus, pe.remarks
        FROM \`tabPayment Entry\` pe
        JOIN \`tabPayment Entry Reference\` per ON per.parent = pe.name
        JOIN \`tabSales Invoice\` si ON si.name = per.reference_name
        WHERE si.student = %s AND pe.docstatus != 2
        ORDER BY pe.posting_date DESC
        LIMIT 10
    """, (sid,), as_dict=True)
    data['payments'] = payments
    
    # 4. Program Enrollments
    enrollments = frappe.db.sql("""
        SELECT name, program, academic_year, custom_plan, custom_no_of_instalments,
               student_category, enrollment_date
        FROM \`tabProgram Enrollment\`
        WHERE student = %s
    """, (sid,), as_dict=True)
    data['enrollments'] = enrollments
    
    result[stu['name']] = data

frappe.response['message'] = result
`;

// Create server script
const r1 = await fetch(BASE + '/api/resource/Server Script', {
  method: 'POST', headers: h,
  body: JSON.stringify({ name: scriptName, script_type: 'API', api_method: scriptName, allow_guest: 0, disabled: 0, script: pyCode }),
});
const d1 = await r1.json();
const ssName = d1.data?.name || scriptName;

// Execute
const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
const d2 = await r2.json();
// Cleanup
await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });

if (!d2.message) {
  console.log('RAW response:', JSON.stringify(d2).slice(0, 500));
  process.exit(1);
}
const result = d2.message;

// Print structured output
for (const [stuName, data] of Object.entries(result)) {
  console.log('\n' + '='.repeat(70));
  console.log('STUDENT: ' + stuName);
  console.log('='.repeat(70));

  console.log('\n--- SALES ORDERS ---');
  for (const so of data.sales_orders) {
    console.log(`  ${so.name} | date=${so.transaction_date} | total=₹${so.grand_total} | billed=${so.per_billed}% | status=${so.status} | docstatus=${so.docstatus}`);
    console.log(`    plan=${so.custom_plan} | instalments=${so.custom_no_of_instalments} | program=${so.custom_program} | AY=${so.custom_academic_year}`);
  }

  console.log('\n--- INVOICES (all statuses) ---');
  let invoiceTotal = 0;
  for (const inv of data.invoices) {
    const statusLabel = inv.docstatus === 0 ? 'Draft' : inv.docstatus === 1 ? 'Submitted' : 'Cancelled';
    console.log(`  ${inv.name} | date=${inv.posting_date} | grand=₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | ${statusLabel} | SO=${inv.sales_order} | rate=${inv.rate}`);
    if (inv.docstatus === 1) invoiceTotal += inv.grand_total;
  }
  console.log(`  >> Active invoices total: ₹${invoiceTotal.toFixed(2)}`);

  console.log('\n--- PAYMENT ENTRIES ---');
  if (data.payments.length === 0) {
    console.log('  (none found)');
  }
  for (const pe of data.payments) {
    const statusLabel = pe.docstatus === 0 ? 'Draft' : pe.docstatus === 1 ? 'Submitted' : 'Cancelled';
    console.log(`  ${pe.name} | date=${pe.posting_date} | amount=₹${pe.paid_amount} | type=${pe.payment_type} | ${statusLabel}`);
    if (pe.remarks) console.log(`    remarks: ${pe.remarks.slice(0, 100)}`);
  }

  console.log('\n--- PROGRAM ENROLLMENTS ---');
  for (const pe of data.enrollments) {
    console.log(`  ${pe.name} | program=${pe.program} | AY=${pe.academic_year}`);
    console.log(`    plan=${pe.custom_plan} | instalments=${pe.custom_no_of_instalments} | category=${pe.student_category}`);
    console.log(`    customer=${pe.customer}`);
  }
}
