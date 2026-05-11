/**
 * scan-failed-conversions2.mjs
 *
 * Batch-mode scan: fetch all submitted SOs (grand_total > 1000),
 * fetch all invoices, cross-reference locally.
 * No per-student loops → much faster.
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    if (r.status === 417 || r.status === 404) return { data: [] };
    throw new Error(`GET ${path} → ${r.status}: ${txt.slice(0,200)}`);
  }
  return r.json();
}

async function getAllPages(basePath, pageSize = 200) {
  let all = [];
  let start = 0;
  while (true) {
    const d = await get(`${basePath}&limit_start=${start}&limit_page_length=${pageSize}`);
    const rows = d.data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

async function main() {
  console.log('Scanning for failed demo→regular conversions (batch mode)...\n');

  // 1. All submitted SOs with grand_total > 1000
  console.log('Fetching all submitted Sales Orders (grand_total > 1000)...');
  const soFields = encodeURIComponent(JSON.stringify(['name', 'customer', 'grand_total', 'billing_status', 'per_billed', 'creation', 'student']));
  const soFilters = encodeURIComponent(JSON.stringify([['docstatus', '=', 1], ['grand_total', '>', 1000]]));
  const allSOs = await getAllPages(
    `/api/resource/Sales Order?filters=${soFilters}&fields=${soFields}&order_by=creation+desc`
  );
  console.log(`  Found ${allSOs.length} submitted SOs`);

  // 2. All Sales Invoices (not cancelled)
  console.log('Fetching all Sales Invoices...');
  const invFields = encodeURIComponent(JSON.stringify(['name', 'customer', 'sales_order', 'grand_total', 'status', 'docstatus']));
  const invFilters = encodeURIComponent(JSON.stringify([['docstatus', '!=', 2]]));
  const allInvoices = await getAllPages(
    `/api/resource/Sales Invoice?filters=${invFilters}&fields=${invFields}`
  );
  console.log(`  Found ${allInvoices.length} invoices`);

  // Build SO → invoices map
  const invoicesBySO = {};
  for (const inv of allInvoices) {
    if (!inv.sales_order) continue;
    if (!invoicesBySO[inv.sales_order]) invoicesBySO[inv.sales_order] = [];
    invoicesBySO[inv.sales_order].push(inv);
  }

  // 3. SOs with NO linked invoices AND Not Billed
  const sosMissing = allSOs.filter(so => {
    const linked = invoicesBySO[so.name] || [];
    return linked.length === 0 && (so.billing_status === 'Not Billed' || !so.per_billed);
  });

  console.log(`\nNot-billed SOs with zero linked invoices: ${sosMissing.length}`);

  // Billing stats
  const nbAll = allSOs.filter(s => s.billing_status === 'Not Billed').length;
  const pbAll = allSOs.filter(s => s.billing_status === 'Partly Billed').length;
  const fbAll = allSOs.filter(s => s.billing_status === 'Fully Billed').length;
  console.log(`Billing breakdown (all ${allSOs.length} SOs): Not Billed=${nbAll}, Partly=${pbAll}, Fully=${fbAll}`);

  if (!sosMissing.length) {
    console.log('\n✅ All not-billed SOs either have invoices or are expected to be empty.');
    return;
  }

  // 4. Enrich with student data
  console.log('\nFetching student data...');
  const stuFields = encodeURIComponent(JSON.stringify(['name', 'student_name', 'custom_branch', 'custom_student_type', 'customer']));
  const allStudents = await getAllPages(`/api/resource/Student?fields=${stuFields}`);
  const customerToStudent = {};
  for (const s of allStudents) {
    if (s.customer) customerToStudent[s.customer] = s;
  }

  const results = [];
  for (const so of sosMissing) {
    const stu = customerToStudent[so.customer] || {};
    results.push({
      soName: so.name,
      customer: so.customer,
      studentName: stu.student_name || '(no student link)',
      studentId: stu.name || '',
      branch: stu.custom_branch || '',
      type: stu.custom_student_type || '',
      soTotal: so.grand_total,
      billingStatus: so.billing_status,
      soCreated: so.creation?.split(' ')[0],
    });
  }

  results.sort((a,b) => (a.branch + a.studentName).localeCompare(b.branch + b.studentName));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`AFFECTED STUDENTS (SO but no invoices): ${results.length}`);
  console.log(`${'='.repeat(70)}\n`);

  for (const r of results) {
    console.log(`${r.studentName} (${r.studentId})`);
    console.log(`  Branch: ${r.branch} | Type: ${r.type}`);
    console.log(`  SO:     ${r.soName} | ₹${r.soTotal} | ${r.billingStatus}`);
    console.log(`  Date:   ${r.soCreated}`);
    console.log();
  }

  console.log(`Summary by branch:`);
  const byBranch = {};
  for (const r of results) {
    byBranch[r.branch || '(none)'] = (byBranch[r.branch || '(none)'] || 0) + 1;
  }
  Object.entries(byBranch).sort((a,b) => b[1]-a[1]).forEach(([b,c]) => console.log(`  ${b}: ${c}`));

  // Output machine-readable list for batch fix script
  console.log('\n--- JSON for batch fix ---');
  console.log(JSON.stringify(results.map(r => ({ soName: r.soName, studentId: r.studentId, branch: r.branch, soTotal: r.soTotal, type: r.type })), null, 2));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
