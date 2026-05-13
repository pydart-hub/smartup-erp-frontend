/**
 * Test cancel → delete → create with same name for one Fee Structure doc.
 * If Frappe honors the provided `name` field during creation, we can do full bulk update.
 */

const BASE = 'https://smartup.m.frappe.cloud/api';
const H = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TEST_DOC = 'SU EDPLY-9th CBSE-Advanced-1';

// Step 1: Fetch the current doc to preserve all fields
const { data: doc } = await fetch(BASE + '/resource/Fee Structure/' + encodeURIComponent(TEST_DOC), { headers: H }).then(r => r.json());
console.log('Got doc:', doc.name, 'total_amount:', doc.total_amount, 'docstatus:', doc.docstatus);
console.log('Components:', (doc.components || []).map(c => `${c.fees_category}: ${c.amount}`).join(', '));

// Step 2: Cancel the doc
console.log('\nCancelling...');
const cr = await fetch(BASE + '/resource/Fee Structure/' + encodeURIComponent(TEST_DOC), {
  method: 'PUT', headers: H,
  body: JSON.stringify({ docstatus: 2 }),
}).then(r => r.json());
console.log('Cancel result:', cr.exception ? 'ERROR: ' + cr.exception.slice(0, 200) : 'OK docstatus=' + cr.data?.docstatus);

if (cr.exception) process.exit(1);

await sleep(500);

// Step 3: Delete the cancelled doc
console.log('\nDeleting...');
const dr = await fetch(BASE + '/resource/Fee Structure/' + encodeURIComponent(TEST_DOC), { method: 'DELETE', headers: H }).then(r => r.json());
console.log('Delete result:', JSON.stringify(dr).slice(0, 200));

await sleep(500);

// Step 4: Recreate with same name and new values
console.log('\nRecreating with name:', TEST_DOC);
const newDoc = {
  doctype: 'Fee Structure',
  name: TEST_DOC,        // Explicitly provide name
  naming_series: 'EDU-FST-.YYYY.-',
  company: doc.company,
  program: doc.program,
  academic_year: doc.academic_year,
  receivable_account: doc.receivable_account,
  cost_center: doc.cost_center,
  custom_branch_abbr: doc.custom_branch_abbr,
  custom_plan: doc.custom_plan,
  custom_no_of_instalments: doc.custom_no_of_instalments,
  components: [
    { fees_category: '9th CBSE Tuition Fee', item: '9th CBSE Tuition Fee', amount: 28500 },
    { fees_category: 'Admission Fee', item: 'Admission Fee', amount: 1000 },
  ],
  docstatus: 1,  // Directly submit it
};

const cr2 = await fetch(BASE + '/resource/Fee Structure', { method: 'POST', headers: H, body: JSON.stringify(newDoc) }).then(r => r.json());
console.log('Create status:', cr2.data?.name, 'total:', cr2.data?.total_amount);
if (cr2.exception) console.log('Create error:', cr2.exception.slice(0, 300));
