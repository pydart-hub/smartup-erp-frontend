const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

const ACCOUNT_CATEGORY_MAP = {
  "HEADOFFICE EXPENSE - SU":          "Head Office Expense",
  "Head office salary - SU":          "Head Office Expense",
  "FOOD & REFRESHMENT - SU":          "Head Office Expense",
  "ELECTRICITY CHARGES - SU":         "Head Office Expense",
  "PHONE AND AC EMI - SU":            "EMI",
  "EMI B - SU":                       "EMI",
  "Maintenance Expense - SU":         "Maintenance",
  "Office Maintenance Expenses - SU": "Maintenance",
  "Projector - SU":                   "Projector",
  "Sticker - SU":                     "Sticker",
  "Boards and fittings - SU":         "Notice Banner",  // FIXED
  "Air Conditioner - SU":             "A/C",
  "SUNPACK BOARD - SU":               "Sunpack Board",
  "Advertisement Expense - SU":       "Marketing",
  "Marketing Expenses - SU":          "Marketing",
  "Marketing Exp (inv) - SU":         "Marketing",
  "MARKETINF EXPENSE - SU":           "Marketing",
};

const PREDEFINED_CATEGORIES = [
  "Head Office Expense","EMI","Maintenance","Tab","Projector",
  "Sticker","Board","A/C","Projector Screen","Sunpack Board","Notice Banner","Marketing"
];

async function main() {
  // 1. GL actuals
  const url = BASE + '/api/resource/GL Entry?' + new URLSearchParams({
    filters: JSON.stringify([
      ["GL Entry","company","=","Smart Up"],
      ["GL Entry","is_cancelled","=","0"],
      ["GL Entry","posting_date",">=","2026-04-01"],
      ["GL Entry","posting_date","<=","2027-03-31"],
    ]),
    fields: JSON.stringify(["account","debit","credit"]),
    limit_page_length: "9999"
  });
  const entries = (await fetch(url, { headers: HEADERS }).then(r => r.json())).data || [];

  const catActuals = {};
  for (const e of entries) {
    const net = (e.debit||0) - (e.credit||0);
    if (net <= 0) continue;
    const cat = ACCOUNT_CATEGORY_MAP[e.account];
    if (!cat) continue;
    catActuals[cat] = (catActuals[cat]||0) + net;
  }

  console.log('=== FINAL BUDGET CATEGORY ACTUALS ===');
  for (const cat of PREDEFINED_CATEGORIES) {
    const amt = catActuals[cat] || 0;
    const hasAccount = Object.values(ACCOUNT_CATEGORY_MAP).includes(cat);
    const flag = amt > 0 ? '' : (hasAccount ? '(account exists, ₹0)' : '(NO GL ACCOUNT YET)');
    console.log(`  ${cat.padEnd(22)}: ₹${(amt/100000).toFixed(2)}L  ${flag}`);
  }

  // 2. Test: can we save a budget for "Tab" (zero-actual category)?
  console.log('\n=== TEST: Save budget for Tab (zero-actual category) ===');
  const postRes = await fetch(BASE + '/api/resource/SmartUp Expense Budget', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ doctype: 'SmartUp Expense Budget', fiscal_year: '2026-2027', category: 'Tab', budget_amount: 550000 })
  }).then(r => r.json());
  
  if (postRes.data?.name) {
    const docName = postRes.data.name;
    console.log('  Created:', docName, '→ budget_amount = ₹5,50,000');

    // Verify it appears in list
    const listRes = await fetch(BASE + '/api/resource/SmartUp Expense Budget?' + new URLSearchParams({
      filters: JSON.stringify([["fiscal_year","=","2026-2027"],["category","=","Tab"]]),
      fields: JSON.stringify(["name","category","budget_amount","fiscal_year"]),
    }), { headers: HEADERS }).then(r => r.json());
    console.log('  Verified in list:', JSON.stringify(listRes.data?.[0]));

    // Clean up test record
    await fetch(BASE + '/api/resource/SmartUp Expense Budget/' + encodeURIComponent(docName), {
      method: 'DELETE', headers: HEADERS
    });
    console.log('  Cleaned up test record.');
  } else {
    console.log('  FAILED:', JSON.stringify(postRes));
  }
}

main().catch(console.error);
