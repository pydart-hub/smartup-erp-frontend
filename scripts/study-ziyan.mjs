/**
 * study-ziyan.mjs
 * Deep study: Mohammed Ziyan, 10th State, Palluruthy branch
 * - Student master
 * - Program Enrollment
 * - Sales Orders
 * - Sales Invoices (all, including cancelled)
 * - Payment Entries
 * - Fee Structure
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { Authorization: AUTH };

async function fetchJSON(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    const t = await r.text();
    console.error(`[SKIP] HTTP ${r.status}: ${t.slice(0, 120)}`);
    return { data: null };
  }
  return r.json();
}

async function main() {

  // ── 1. Find student ───────────────────────────────────────────────
  console.log('\n═══ 1. STUDENT SEARCH ═══');
  const search = await fetchJSON(
    BASE + '/api/resource/Student?filters=' + encodeURIComponent(JSON.stringify([
      ['student_name', 'like', '%Ziyan%'],
      ['custom_branch', '=', 'Smart Up Palluruthy'],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','student_name','first_name','last_name','gender',
      'date_of_birth','custom_branch','custom_srr_id','custom_student_type',
      'enabled','customer','student_email_id','student_mobile_number',
      'joining_date','custom_discontinuation_date','guardians',
    ])) +
    '&limit=10'
  );
  const students = search.data || [];
  console.log('Found students:', students.length);
  students.forEach(s => {
    console.log(`  ${s.name} | ${s.student_name} | type=${s.custom_student_type} | enabled=${s.enabled} | customer=${s.customer}`);
  });

  if (!students.length) {
    // Try broader search
    console.log('\nBroader search (any branch)...');
    const s2 = await fetchJSON(
      BASE + '/api/resource/Student?filters=' + encodeURIComponent(JSON.stringify([
        ['student_name', 'like', '%Ziyan%'],
      ])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','custom_branch','custom_student_type','enabled','customer'])) +
      '&limit=10'
    );
    console.log(JSON.stringify(s2.data, null, 2));
    return;
  }

  const student = students[0];
  const STUDENT_ID = student.name;
  const CUSTOMER = student.customer;

  console.log('\n─── Student Master ───');
  console.log(JSON.stringify(student, null, 2));

  // ── 2. Program Enrollment ─────────────────────────────────────────
  console.log('\n═══ 2. PROGRAM ENROLLMENT ═══');
  const pe = await fetchJSON(
    BASE + '/api/resource/Program Enrollment?filters=' + encodeURIComponent(JSON.stringify([
      ['student', '=', STUDENT_ID],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','student','student_name','program','academic_year',
      'enrollment_date','student_batch_name','docstatus',
      'custom_fee_structure','custom_plan','custom_no_of_instalments',
      'student_category',
    ])) +
    '&limit=10&order_by=creation desc'
  );
  console.log(JSON.stringify(pe.data, null, 2));

  const activePE = (pe.data || []).find(p => p.docstatus !== 2) || pe.data?.[0];
  const PE_NAME = activePE?.name;

  // ── 3. Sales Orders ───────────────────────────────────────────────
  console.log('\n═══ 3. SALES ORDERS ═══');
  const soByCustomer = await fetchJSON(
    BASE + '/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([
      ['customer', '=', CUSTOMER],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','customer','customer_name','transaction_date','grand_total',
      'status','per_billed','advance_paid','custom_plan',
      'custom_no_of_instalments','custom_academic_year','docstatus',
    ])) +
    '&limit=20&order_by=transaction_date desc'
  );
  console.log(JSON.stringify(soByCustomer.data, null, 2));

  const allSOs = soByCustomer.data || [];
  const activeSO = allSOs.find(so => so.docstatus === 1) || allSOs[0];
  const SO_NAME = activeSO?.name;

  // ── 4. Sales Invoices (all, incl. cancelled) ─────────────────────
  console.log('\n═══ 4. SALES INVOICES (ALL) ═══');
  const invoicesByCustomer = await fetchJSON(
    BASE + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([
      ['customer', '=', CUSTOMER],
      ['is_return', '=', 0],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','customer','customer_name','posting_date','due_date',
      'grand_total','outstanding_amount','status','docstatus',
      'is_return','sales_order','payment_schedule',
    ])) +
    '&limit=30&order_by=posting_date asc'
  );
  const allInvoices = invoicesByCustomer.data || [];
  console.log(`Total invoices found: ${allInvoices.length}`);
  allInvoices.forEach(inv => {
    const status = inv.docstatus === 2 ? 'CANCELLED' : inv.status;
    console.log(`  ${inv.name} | posted=${inv.posting_date} | due=${inv.due_date} | total=₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | status=${status}`);
  });

  // Full detail on each submitted invoice (items + payment schedule)
  console.log('\n─── Invoice Item Details ───');
  for (const inv of allInvoices) {
    if (inv.docstatus === 2) {
      console.log(`\n[CANCELLED] ${inv.name} — total=₹${inv.grand_total}`);
      continue;
    }
    const detail = await fetchJSON(`${BASE}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
    const d = detail.data;
    if (!d) continue;
    console.log(`\n${inv.name}:`);
    console.log(`  posting_date   : ${d.posting_date}`);
    console.log(`  due_date       : ${d.due_date}`);
    console.log(`  grand_total    : ₹${d.grand_total}`);
    console.log(`  outstanding_amt: ₹${d.outstanding_amount}`);
    console.log(`  status         : ${d.status}`);
    console.log(`  sales_order    : ${d.sales_order || 'none'}`);
    if (d.items) {
      d.items.forEach(i => {
        console.log(`  item: ${i.item_code} | desc: ${i.description} | rate: ₹${i.rate} | qty: ${i.qty} | sales_order: ${i.sales_order}`);
      });
    }
    if (d.payment_schedule) {
      d.payment_schedule.forEach(p => {
        console.log(`  schedule: due=${p.due_date} | amt=₹${p.payment_amount} | outstanding=₹${p.outstanding}`);
      });
    }
  }

  // ── 5. Payment Entries ────────────────────────────────────────────
  console.log('\n═══ 5. PAYMENT ENTRIES ═══');
  const pe2 = await fetchJSON(
    BASE + '/api/resource/Payment Entry?filters=' + encodeURIComponent(JSON.stringify([
      ['party', '=', CUSTOMER],
      ['party_type', '=', 'Customer'],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','party','party_name','paid_amount','payment_type',
      'mode_of_payment','posting_date','docstatus','reference_no',
      'remarks',
    ])) +
    '&limit=30&order_by=posting_date asc'
  );
  const payments = pe2.data || [];
  console.log(`Total payments: ${payments.length}`);
  payments.forEach(p => {
    const status = p.docstatus === 2 ? 'CANCELLED' : p.docstatus === 1 ? 'SUBMITTED' : 'DRAFT';
    console.log(`  ${p.name} | date=${p.posting_date} | amt=₹${p.paid_amount} | mode=${p.mode_of_payment} | ${status} | ref=${p.reference_no || p.remarks || '—'}`);
  });

  // ── 6. Fee Structure detail ───────────────────────────────────────
  if (activePE?.custom_fee_structure) {
    console.log('\n═══ 6. FEE STRUCTURE ═══');
    const fsd = await fetchJSON(`${BASE}/api/resource/Fee Structure/${encodeURIComponent(activePE.custom_fee_structure)}`);
    if (fsd.data) {
      console.log('name:', fsd.data.name);
      console.log('total_amount:', fsd.data.total_amount);
      console.log('custom_plan:', fsd.data.custom_plan);
      console.log('custom_no_of_instalments:', fsd.data.custom_no_of_instalments);
    }
  }

  // ── 7. Student Group ──────────────────────────────────────────────
  console.log('\n═══ 7. STUDENT GROUP ═══');
  console.log(`batch from PE: ${activePE?.student_batch_name}`);

  // ── 8. Summary ───────────────────────────────────────────────────
  console.log('\n═══ SUMMARY ═══');
  const submitted = allInvoices.filter(i => i.docstatus === 1);
  const cancelled = allInvoices.filter(i => i.docstatus === 2);
  const totalBilled = submitted.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalOutstanding = submitted.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
  const totalCollected = totalBilled - totalOutstanding;
  const totalPaid = payments.filter(p => p.docstatus === 1).reduce((s, p) => s + (p.paid_amount || 0), 0);
  console.log(`Student ID       : ${STUDENT_ID}`);
  console.log(`Plan             : ${activePE?.custom_plan} / ${activePE?.custom_no_of_instalments} instalments`);
  console.log(`Fee Structure    : ${activePE?.custom_fee_structure}`);
  console.log(`Active invoices  : ${submitted.length}`);
  console.log(`Cancelled inv    : ${cancelled.length}`);
  console.log(`Total billed     : ₹${totalBilled}`);
  console.log(`Total collected  : ₹${totalCollected}`);
  console.log(`Total outstanding: ₹${totalOutstanding}`);
  console.log(`Total paid (PE)  : ₹${totalPaid}`);
}

main().catch(console.error);
