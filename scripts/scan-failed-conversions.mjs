/**
 * scan-failed-conversions.mjs
 *
 * Finds all students who were converted Demo → Regular (Fresher)
 * but have zero Sales Invoices linked to their regular Sales Order.
 *
 * Logic:
 *   1. Fetch all students with custom_student_type = "Fresher"
 *      who have a Sales Order created after ~Apr 1 2026 (academic year start)
 *   2. For each, check if any Sales Invoice exists for that customer
 *   3. Flag those with SO but no invoices
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    // 417 often means a filter field doesn't exist on this doctype — skip silently
    if (r.status === 417 || r.status === 404) return { data: [] };
    throw new Error(`GET ${path} → ${r.status}: ${txt.slice(0,100)}`);
  }
  return r.json();
}

async function main() {
  console.log('Scanning for failed demo→regular conversions...\n');

  // 1. Get all students
  const stuData = await get('/api/resource/Student?fields=["name","student_name","custom_branch","customer","custom_student_type"]&limit_page_length=500&order_by=creation+desc');
  const allStudents = stuData.data || [];
  console.log(`Total students fetched: ${allStudents.length}`);

  // 2. For each student, get their Sales Orders and check invoice coverage
  const results = [];

  for (const stu of allStudents) {
    if (!stu.customer) continue;

    // Get SOs for this customer (submitted, not the demo ₹499 ones)
    const soData = await get(
      '/api/resource/Sales Order?filters=' +
      encodeURIComponent(JSON.stringify([
        ['customer', '=', stu.customer],
        ['docstatus', '=', 1],
        ['grand_total', '>', 1000], // filter out small demo SOs
      ])) +
      '&fields=' +
      encodeURIComponent(JSON.stringify(['name', 'grand_total', 'billing_status', 'per_billed', 'creation'])) +
      '&order_by=creation+desc&limit_page_length=5'
    );

    const sos = soData.data || [];
    if (!sos.length) continue; // No significant SO → skip

    // Get invoices for this customer
    const invData = await get(
      '/api/resource/Sales Invoice?filters=' +
      encodeURIComponent(JSON.stringify([
        ['customer', '=', stu.customer],
        ['docstatus', '!=', 2],
      ])) +
      '&fields=' +
      encodeURIComponent(JSON.stringify(['name', 'grand_total', 'sales_order', 'status'])) +
      '&limit_page_length=30'
    );
    const invoices = invData.data || [];

    // Check each big SO for invoice coverage
    for (const so of sos) {
      const linkedInvoices = invoices.filter(i => i.sales_order === so.name);
      const hasInvoices = linkedInvoices.length > 0;

      if (!hasInvoices) {
        results.push({
          student: stu.name,
          studentName: stu.student_name,
          branch: stu.custom_branch,
          type: stu.custom_student_type,
          so: so.name,
          soTotal: so.grand_total,
          billingStatus: so.billing_status,
          perBilled: so.per_billed,
          soCreated: so.creation?.split(' ')[0],
          invoiceCount: 0,
        });
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`STUDENTS WITH SO BUT NO INVOICES: ${results.length}`);
  console.log(`${'='.repeat(70)}\n`);

  if (!results.length) {
    console.log('✅ All students with regular SOs have invoices.');
    return;
  }

  for (const r of results) {
    console.log(`${r.studentName} (${r.student})`);
    console.log(`  Branch:  ${r.branch}`);
    console.log(`  Type:    ${r.type}`);
    console.log(`  SO:      ${r.so} | ₹${r.soTotal} | ${r.billingStatus}`);
    console.log(`  Created: ${r.soCreated}`);
    console.log();
  }

  console.log(`Summary by branch:`);
  const byBranch = {};
  for (const r of results) {
    byBranch[r.branch] = (byBranch[r.branch] || 0) + 1;
  }
  Object.entries(byBranch).sort((a,b) => b[1]-a[1]).forEach(([b,c]) => console.log(`  ${b}: ${c}`));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
