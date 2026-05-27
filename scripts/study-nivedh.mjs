/**
 * Deep study: NIVEDH KRISHNA fee structure
 * Branch: Kadavanthra (Smart Up Kadavanthara), 12th
 */

const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };

async function main() {
  // 1. Find student by name
  const params = new URLSearchParams({
    filters: JSON.stringify([['student_name', 'like', '%nivedh%']]),
    fields: JSON.stringify(['name', 'student_name', 'customer', 'enabled', 'custom_discontinuation_date']),
    limit_page_length: '10',
  });
  const rStu = await fetch(`${FRAPPE_URL}/api/resource/Student?${params}`, { headers });
  const stuList = (await rStu.json()).data;
  console.log('=== Students matching "nivedh" ===');
  console.log(JSON.stringify(stuList, null, 2));

  if (!stuList?.length) {
    console.log('Not found. Trying "krishna"...');
    const p2 = new URLSearchParams({
      filters: JSON.stringify([['student_name', 'like', '%nivedh krishna%']]),
      fields: JSON.stringify(['name', 'student_name', 'customer']),
      limit_page_length: '10',
    });
    const r2 = await fetch(`${FRAPPE_URL}/api/resource/Student?${p2}`, { headers });
    const l2 = (await r2.json()).data;
    console.log(JSON.stringify(l2, null, 2));
    return;
  }

  // Use first match
  const student = stuList[0];
  const STUDENT_ID = student.name;
  const CUSTOMER = student.customer;
  console.log(`\nUsing: ${STUDENT_ID} / ${CUSTOMER}`);

  // 2. Full student doc
  const rFull = await fetch(`${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(STUDENT_ID)}`, { headers });
  const fullStu = (await rFull.json()).data;
  console.log('\n=== Student Full Doc ===');
  console.log(JSON.stringify({
    name: fullStu.name,
    student_name: fullStu.student_name,
    customer: fullStu.customer,
    enabled: fullStu.enabled,
    program: fullStu.program,
    custom_discontinuation_date: fullStu.custom_discontinuation_date,
    guardians: fullStu.guardians?.map(g => ({ guardian: g.guardian, guardian_name: g.guardian_name })),
  }, null, 2));

  // 3. Sales Orders
  const soParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    fields: JSON.stringify(['name', 'student', 'student_name', 'company', 'status', 'grand_total', 'advance_paid', 'billing_status']),
    limit_page_length: '10',
  });
  const rSO = await fetch(`${FRAPPE_URL}/api/resource/Sales Order?${soParams}`, { headers });
  const soList = (await rSO.json()).data;
  console.log('\n=== Sales Orders ===');
  console.log(JSON.stringify(soList, null, 2));

  // 4. Sales Invoices
  const invParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    fields: JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'posting_date', 'due_date', 'student', 'docstatus']),
    order_by: 'posting_date asc, name asc',
    limit_page_length: '20',
  });
  const rInv = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice?${invParams}`, { headers });
  const invList = (await rInv.json()).data;
  console.log('\n=== Sales Invoices ===');
  console.log(JSON.stringify(invList, null, 2));

  // 5. For each invoice, get payment entries
  if (invList?.length) {
    console.log('\n=== Payment Entries per Invoice ===');
    for (const inv of invList) {
      const peParams = new URLSearchParams({
        filters: JSON.stringify([['Payment Entry Reference', 'reference_name', '=', inv.name]]),
        fields: JSON.stringify(['name', 'paid_amount', 'reference_no', 'mode_of_payment', 'posting_date', 'docstatus']),
        order_by: 'creation desc',
        limit_page_length: '5',
      });
      const rPE = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry?${peParams}`, { headers });
      const peList = (await rPE.json()).data;
      if (peList?.length) {
        console.log(`\n  Invoice ${inv.name} (total: ${inv.grand_total}, outstanding: ${inv.outstanding_amount}):`);
        for (const pe of peList) {
          console.log(`    PE ${pe.name}: paid=${pe.paid_amount}, mode=${pe.mode_of_payment}, ref=${pe.reference_no}, date=${pe.posting_date}, docstatus=${pe.docstatus}`);
        }
      } else {
        console.log(`\n  Invoice ${inv.name} (total: ${inv.grand_total}, outstanding: ${inv.outstanding_amount}): NO PAYMENT ENTRIES`);
      }
    }
  }

  // 6. Summary
  console.log('\n=== FEE SUMMARY ===');
  if (invList?.length) {
    const totalFee = invList.reduce((s, i) => s + (i.grand_total || 0), 0);
    const totalOutstanding = invList.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
    const totalPaid = totalFee - totalOutstanding;
    console.log(`Total invoiced: ₹${totalFee}`);
    console.log(`Total paid:     ₹${totalPaid}`);
    console.log(`Outstanding:    ₹${totalOutstanding}`);
    console.log(`Instalment count: ${invList.length}`);
    invList.forEach((inv, i) => {
      const paid = (inv.grand_total || 0) - (inv.outstanding_amount || 0);
      console.log(`  [${i+1}] ${inv.name}: ₹${inv.grand_total} | paid: ₹${paid} | outstanding: ₹${inv.outstanding_amount} | status: ${inv.status}`);
    });
  }
}

main().catch(console.error);
