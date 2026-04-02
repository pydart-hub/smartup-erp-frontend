// READ-ONLY research: branch bank entity structure & expense JV flow
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function query(label, path) {
  console.log(`\n${'='.repeat(80)}\n=== ${label} ===\n${'='.repeat(80)}`);
  try {
    const url = `${BASE}${path}`;
    const res = await fetch(url, { headers: { Authorization: AUTH } });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
    return json;
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

async function main() {
  // 1. ALL bank accounts (without balance field that causes permission error)
  await query('Q1: ALL BANK ACCOUNTS',
    '/api/resource/Account?filters=[["account_type","=","Bank"],["is_group","=",0]]&fields=["name","account_name","company","parent_account"]&limit_page_length=100');

  // 2. ALL cash accounts
  await query('Q2: ALL CASH ACCOUNTS',
    '/api/resource/Account?filters=[["account_type","=","Cash"],["is_group","=",0]]&fields=["name","account_name","company"]&limit_page_length=50');

  // 3. Sample JVs from parent Smart Up
  for (const jv of ['ACC-JV-2026-00008','ACC-JV-2026-00012','ACC-JV-2026-00013','ACC-JV-2026-00003','ACC-JV-2026-00051']) {
    await query(`Q3: JV ${jv}`, `/api/resource/Journal Entry/${jv}`);
  }

  // 4. Kadavanthara expense accounts
  await query('Q4: KADAVANTHARA EXPENSE ACCOUNTS',
    '/api/resource/Account?filters=[["company","=","Smart Up Kadavanthara"],["root_type","=","Expense"],["is_group","=",0]]&fields=["name","account_name","parent_account"]&limit_page_length=100');

  // 5. Directors Loan in Kadavanthara
  await query('Q5: DIRECTORS LOAN - KADAVANTHARA',
    '/api/resource/Account?filters=[["company","=","Smart Up Kadavanthara"],["account_name","=","DIRECTORS LOAN"]]&fields=["name","account_name","account_type","root_type","parent_account"]');

  // 6-EXTRA: Existing KDV JVs
  await query('Q6-EXTRA: EXISTING KDV JVs',
    '/api/resource/Journal Entry?filters=[["company","=","Smart Up Kadavanthara"]]&fields=["name","posting_date","total_debit","user_remark","docstatus"]&limit_page_length=20');

  // 6c. All parent Smart Up bank accounts
  await query('Q6c: PARENT SMART UP BANK ACCOUNTS',
    '/api/resource/Account?filters=[["company","=","Smart Up"],["account_type","=","Bank"],["is_group","=",0]]&fields=["name","account_name","parent_account"]&limit_page_length=20');

  // 6d: Parent Smart Up DIRECTORS LOAN
  await query('Q6d: PARENT SMART UP DIRECTORS LOAN',
    '/api/resource/Account?filters=[["company","=","Smart Up"],["account_name","=","DIRECTORS LOAN"]]&fields=["name","account_name","account_type","root_type","parent_account"]');

  // 6e: All companies in the system
  await query('Q6e: ALL COMPANIES',
    '/api/resource/Company?fields=["name","company_name","abbr","parent_company","default_currency"]&limit_page_length=20');

  // 7. Cost centers for Kadavanthara
  await query('Q7: KADAVANTHARA COST CENTERS',
    '/api/resource/Cost Center?filters=[["company","=","Smart Up Kadavanthara"]]&fields=["name","cost_center_name","is_group"]&limit_page_length=20');

  // 8. Custom fields on Journal Entry
  await query('Q8: CUSTOM FIELDS ON JOURNAL ENTRY',
    '/api/resource/Custom Field?filters=[["dt","=","Journal Entry"]]&fields=["name","fieldname","label","fieldtype","options"]&limit_page_length=50');

  // 9. Custom fields on Journal Entry Account
  await query('Q9: CUSTOM FIELDS ON JOURNAL ENTRY ACCOUNT',
    '/api/resource/Custom Field?filters=[["dt","=","Journal Entry Account"]]&fields=["name","fieldname","label","fieldtype","options"]&limit_page_length=50');

  // 10. Kadavanthara bank group accounts
  await query('Q10: KADAVANTHARA BANK GROUP ACCOUNTS',
    '/api/resource/Account?filters=[["company","=","Smart Up Kadavanthara"],["parent_account","like","%Bank Accounts%"]]&fields=["name","account_name","account_type"]&limit_page_length=20');

  // 11. ALL non-group accounts in Kadavanthara
  await query('Q11: ALL NON-GROUP ACCOUNTS IN KADAVANTHARA',
    '/api/resource/Account?filters=[["company","=","Smart Up Kadavanthara"],["is_group","=",0]]&fields=["name","account_name","root_type","account_type","parent_account"]&limit_page_length=200&order_by=root_type asc,account_name asc');
}

main();
