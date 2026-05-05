/**
 * setup_salary_payable_groups.mjs
 *
 * 1. Creates "Salary Payable - {ABBR}" as a GROUP account under
 *    "Accounts Payable - {ABBR}" for all 10 companies.
 * 2. Moves all existing employee-specific payable accounts (created by the
 *    current code) under the new group by patching parent_account.
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const H = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(BASE + '/api' + path, { headers: H });
  return r.json();
}
async function post(path, body) {
  const r = await fetch(BASE + '/api' + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return r.json();
}
async function put(path, body) {
  const r = await fetch(BASE + '/api' + path, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  return r.json();
}

// ─── Step 0: Load all companies ───────────────────────────────────────────────
const coRes = await get('/resource/Company?fields=["name","abbr"]&limit_page_length=50');
const companies = coRes.data; // [{ name, abbr }]
console.log(`Found ${companies.length} companies.\n`);

// ─── Step 1: Create "Salary Payable - {ABBR}" GROUP for each company ─────────
console.log('=== STEP 1: Create Salary Payable group accounts ===');
const salaryPayableMap = {}; // abbr → "Salary Payable - {ABBR}"

for (const co of companies) {
  const groupName = `Salary Payable - ${co.abbr}`;
  const parentAccount = `Accounts Payable - ${co.abbr}`;

  // Check if already exists
  const existing = await get(`/resource/Account/${encodeURIComponent(groupName)}`);
  if (existing.data) {
    console.log(`  SKIP  ${groupName} (already exists)`);
    salaryPayableMap[co.abbr] = groupName;
    continue;
  }

  const res = await post('/resource/Account', {
    account_name: 'Salary Payable',
    is_group: 1,
    root_type: 'Liability',
    parent_account: parentAccount,
    company: co.name,
  });

  if (res.data?.name) {
    console.log(`  OK    ${res.data.name}`);
    salaryPayableMap[co.abbr] = res.data.name;
  } else {
    console.log(`  FAIL  ${groupName}:`, JSON.stringify(res).slice(0, 200));
  }
}

// ─── Step 2: Find employee payable accounts sitting directly under Accounts Payable ───
console.log('\n=== STEP 2: Find & move existing employee payable accounts ===');

// Accounts to KEEP directly under Accounts Payable (non-employee)
const KEEP = ['creditors', 'payroll payable', 'phone payable', 'previous razorpay', 'salary payable'];

for (const co of companies) {
  const parentAccount = `Accounts Payable - ${co.abbr}`;
  const newParent = salaryPayableMap[co.abbr];

  if (!newParent) {
    console.log(`  SKIP company ${co.abbr} — no Salary Payable group`);
    continue;
  }

  // Get direct children
  const childRes = await get(
    `/resource/Account?fields=["name","account_type","is_group"]&filters=[["parent_account","=","${parentAccount}"],["is_group","=",0]]&limit_page_length=100`
  );
  const children = childRes.data ?? [];

  const toMove = children.filter(c => {
    const lower = c.name.toLowerCase();
    return !KEEP.some(k => lower.includes(k));
  });

  if (toMove.length === 0) {
    console.log(`  ${co.abbr}: nothing to move`);
    continue;
  }

  for (const acct of toMove) {
    const res = await put(`/resource/Account/${encodeURIComponent(acct.name)}`, {
      parent_account: newParent,
    });
    if (res.data?.name) {
      console.log(`  MOVED ${acct.name}  →  ${newParent}`);
    } else {
      console.log(`  FAIL  ${acct.name}:`, JSON.stringify(res).slice(0, 200));
    }
  }
}

// ─── Step 3: Verify final structure ───────────────────────────────────────────
console.log('\n=== STEP 3: Verify final structure ===');
for (const co of companies) {
  const spName = salaryPayableMap[co.abbr];
  if (!spName) continue;

  const childRes = await get(
    `/resource/Account?fields=["name","is_group"]&filters=[["parent_account","=","${spName}"]]&limit_page_length=50`
  );
  const kids = childRes.data ?? [];
  if (kids.length) {
    console.log(`  ${spName}`);
    kids.forEach(k => console.log(`    └── ${k.name} (group:${k.is_group})`));
  } else {
    console.log(`  ${spName}  (empty — no employees yet)`);
  }
}

console.log('\nDone.');
