/**
 * Creates SmartUp Budget Account Map doctype in Frappe and seeds it with
 * all current hardcoded account → category mappings.
 * Run once: node scripts/setup-account-map-doctype.mjs
 */
const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
};

const PREDEFINED_CATEGORIES = [
  "Head Office Expense", "EMI", "Maintenance", "Tab", "Projector",
  "Sticker", "Board", "A/C", "Projector Screen", "Sunpack Board",
  "Notice Banner", "Marketing",
];

const SEED_MAPPINGS = [
  { account: "HEADOFFICE EXPENSE - SU",        category: "Head Office Expense" },
  { account: "Head office salary - SU",         category: "Head Office Expense" },
  { account: "FOOD & REFRESHMENT - SU",         category: "Head Office Expense" },
  { account: "ELECTRICITY CHARGES - SU",        category: "Head Office Expense" },
  { account: "PHONE AND AC EMI - SU",           category: "EMI" },
  { account: "EMI B - SU",                      category: "EMI" },
  { account: "Maintenance Expense - SU",        category: "Maintenance" },
  { account: "Office Maintenance Expenses - SU",category: "Maintenance" },
  { account: "Tab - SU",                        category: "Tab" },
  { account: "Projector - SU",                  category: "Projector" },
  { account: "Sticker - SU",                    category: "Sticker" },
  { account: "Boards and fittings - SU",        category: "Notice Banner" },
  { account: "Air Conditioner - SU",            category: "A/C" },
  { account: "SUNPACK BOARD - SU",              category: "Sunpack Board" },
  { account: "Advertisement Expense - SU",      category: "Marketing" },
  { account: "Marketing Expenses - SU",         category: "Marketing" },
  { account: "Marketing Exp (inv) - SU",        category: "Marketing" },
  { account: "MARKETINF EXPENSE - SU",          category: "Marketing" },
];

async function createDoctype() {
  console.log('Creating SmartUp Budget Account Map doctype...');
  const res = await fetch(BASE + '/api/resource/DocType', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      doctype: 'DocType',
      name: 'SmartUp Budget Account Map',
      module: 'Custom',
      custom: 1,
      autoname: 'field:account',
      naming_rule: 'By fieldname',
      fields: [
        {
          fieldname: 'account',
          fieldtype: 'Data',
          label: 'Account Name',
          reqd: 1,
          in_list_view: 1,
          in_standard_filter: 1,
          unique: 1,
        },
        {
          fieldname: 'category',
          fieldtype: 'Select',
          label: 'Budget Category',
          options: PREDEFINED_CATEGORIES.join('\n'),
          reqd: 1,
          in_list_view: 1,
          in_standard_filter: 1,
        },
      ],
      permissions: [
        { role: 'System Manager', read: 1, write: 1, create: 1, delete: 1 },
      ],
    }),
  }).then(r => r.json());

  if (res.data?.name) {
    console.log('✅ Doctype created:', res.data.name);
    return true;
  } else if (res.exc_type === 'LinkExistsError' || res.exception?.includes('already exists') || res.message?.includes('already exists')) {
    console.log('⚠️  Doctype already exists — skipping creation, seeding records...');
    return true;
  } else {
    console.error('❌ Failed to create doctype:', JSON.stringify(res));
    return false;
  }
}

async function seedMappings() {
  console.log(`\nSeeding ${SEED_MAPPINGS.length} account mappings...`);

  for (const m of SEED_MAPPINGS) {
    // Check if already exists
    const existing = await fetch(BASE + '/api/resource/SmartUp Budget Account Map?' + new URLSearchParams({
      filters: JSON.stringify([['account', '=', m.account]]),
      fields: JSON.stringify(['name']),
      limit_page_length: '1',
    }), { headers: HEADERS }).then(r => r.json());

    if ((existing.data || []).length > 0) {
      console.log(`  skip  ${m.account} (exists)`);
      continue;
    }

    const res = await fetch(BASE + '/api/resource/SmartUp Budget Account Map', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        doctype: 'SmartUp Budget Account Map',
        account: m.account,
        category: m.category,
      }),
    }).then(r => r.json());

    if (res.data?.name) {
      console.log(`  ✅ ${m.account} → ${m.category}`);
    } else {
      console.error(`  ❌ ${m.account}:`, JSON.stringify(res).slice(0, 120));
    }
  }
}

async function main() {
  const ok = await createDoctype();
  if (!ok) process.exit(1);
  // Small delay for Frappe to register the doctype
  await new Promise(r => setTimeout(r, 2000));
  await seedMappings();
  console.log('\nDone.');
}

main().catch(console.error);
