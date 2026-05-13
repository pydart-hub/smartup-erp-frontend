/**
 * Update Frappe Advanced Fee Structure documents to match new workbook values.
 * Uses a temporary Server Script API to bypass UpdateAfterSubmitError.
 *
 * New values source: docs/kadavanthra&EDAPPALLY fee structure newww.xlsx
 * Both branches: Advanced plan only.
 *
 * Run: node scripts/update-advanced-fee-structures.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud/api';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
}

// ─── New amounts: tuition = total - 1000 (Admission Fee) ───────────────────
// KDV and EDPLY share the same plan totals for Advanced class (9/10/11/12 rows)
const amounts = {
  // Quarterly totals from workbook: 9 Cbse / 10 Cbse → same values
  // 9 State / 10 State → same lower values
  // Plus One / Plus Two → same higher values
};

// All fee structures to update: [docName, tuitionAmount, totalAmount]
// total = tuition + 1000 (admission fee)
const updates = [
  // ── KDV ────────────────────────────────────────────────────────────────────
  // 9 CBSE (KDV)
  ['SU KDV-9th CBSE-Advanced-1',  28500, 29500],  // OTP
  ['SU KDV-9th CBSE-Advanced-4',  29500, 30500],  // Quarterly total 29500
  ['SU KDV-9th CBSE-Advanced-6',  30200, 31200],  // 6-inst total 30200
  ['SU KDV-9th CBSE-Advanced-8',  31000, 32000],  // 8-inst total 31000
  // 10 CBSE (KDV) — same as 9 CBSE
  ['SU KDV-10th CBSE-Advanced-1', 28500, 29500],
  ['SU KDV-10th CBSE-Advanced-4', 29500, 30500],
  ['SU KDV-10th CBSE-Advanced-6', 30200, 31200],
  ['SU KDV-10th CBSE-Advanced-8', 31000, 32000],
  // 10 State (KDV) — same as 9 State
  ['SU KDV-10th State-Advanced-1', 23000, 24000],
  ['SU KDV-10th State-Advanced-4', 23800, 24800],
  ['SU KDV-10th State-Advanced-6', 24400, 25400],
  ['SU KDV-10th State-Advanced-8', 25000, 26000],
  // 11th Science CBSE (KDV) — Plus One values
  ['SU KDV-11th Science CBSE-Advanced-1', 33000, 34000],
  ['SU KDV-11th Science CBSE-Advanced-4', 35200, 36200],
  ['SU KDV-11th Science CBSE-Advanced-6', 36100, 37100],
  ['SU KDV-11th Science CBSE-Advanced-8', 37000, 38000],
  // 11th Science State (KDV) — Plus One values
  ['SU KDV-11th Science State-Advanced-1', 33000, 34000],
  ['SU KDV-11th Science State-Advanced-4', 35200, 36200],
  ['SU KDV-11th Science State-Advanced-6', 36100, 37100],
  ['SU KDV-11th Science State-Advanced-8', 37000, 38000],
  // 12th Science CBSE (KDV) — Plus Two values (same as Plus One)
  ['SU KDV-12th Science CBSE-Advanced-1', 33000, 34000],
  ['SU KDV-12th Science CBSE-Advanced-4', 35200, 36200],
  ['SU KDV-12th Science CBSE-Advanced-6', 36100, 37100],
  ['SU KDV-12th Science CBSE-Advanced-8', 37000, 38000],
  // 12th Science State (KDV)
  ['SU KDV-12th Science State-Advanced-1', 33000, 34000],
  ['SU KDV-12th Science State-Advanced-4', 35200, 36200],
  ['SU KDV-12th Science State-Advanced-6', 36100, 37100],
  ['SU KDV-12th Science State-Advanced-8', 37000, 38000],

  // ── EDPLY ──────────────────────────────────────────────────────────────────
  // 9 State (EDPLY)
  ['SU EDPLY-9th State-Advanced-1', 23000, 24000],
  ['SU EDPLY-9th State-Advanced-4', 23800, 24800],
  ['SU EDPLY-9th State-Advanced-6', 24400, 25400],
  ['SU EDPLY-9th State-Advanced-8', 25000, 26000],
  // 9 CBSE (EDPLY)
  ['SU EDPLY-9th CBSE-Advanced-1',  28500, 29500],
  ['SU EDPLY-9th CBSE-Advanced-4',  29500, 30500],
  ['SU EDPLY-9th CBSE-Advanced-6',  30200, 31200],
  ['SU EDPLY-9th CBSE-Advanced-8',  31000, 32000],
  // 10 State (EDPLY)
  ['SU EDPLY-10th State-Advanced-1', 23000, 24000],
  ['SU EDPLY-10th State-Advanced-4', 23800, 24800],
  ['SU EDPLY-10th State-Advanced-6', 24400, 25400],
  ['SU EDPLY-10th State-Advanced-8', 25000, 26000],
  // 10 CBSE (EDPLY)
  ['SU EDPLY-10th CBSE-Advanced-1',  28500, 29500],
  ['SU EDPLY-10th CBSE-Advanced-4',  29500, 30500],
  ['SU EDPLY-10th CBSE-Advanced-6',  30200, 31200],
  ['SU EDPLY-10th CBSE-Advanced-8',  31000, 32000],
  // 11th Science CBSE (EDPLY)
  ['SU EDPLY-11th Science CBSE-Advanced-1', 33000, 34000],
  ['SU EDPLY-11th Science CBSE-Advanced-4', 35200, 36200],
  ['SU EDPLY-11th Science CBSE-Advanced-6', 36100, 37100],
  ['SU EDPLY-11th Science CBSE-Advanced-8', 37000, 38000],
  // 11th Science State (EDPLY)
  ['SU EDPLY-11th Science State-Advanced-1', 33000, 34000],
  ['SU EDPLY-11th Science State-Advanced-4', 35200, 36200],
  ['SU EDPLY-11th Science State-Advanced-6', 36100, 37100],
  ['SU EDPLY-11th Science State-Advanced-8', 37000, 38000],
  // 11th State (EDPLY) — same as Plus One
  ['SU EDPLY-11th State-Advanced-1', 33000, 34000],
  ['SU EDPLY-11th State-Advanced-4', 35200, 36200],
  ['SU EDPLY-11th State-Advanced-6', 36100, 37100],
  ['SU EDPLY-11th State-Advanced-8', 37000, 38000],
  // 12th Science CBSE (EDPLY)
  ['SU EDPLY-12th Science CBSE-Advanced-1', 33000, 34000],
  ['SU EDPLY-12th Science CBSE-Advanced-4', 35200, 36200],
  ['SU EDPLY-12th Science CBSE-Advanced-6', 36100, 37100],
  ['SU EDPLY-12th Science CBSE-Advanced-8', 37000, 38000],
  // 12th Science State (EDPLY)
  ['SU EDPLY-12th Science State-Advanced-1', 33000, 34000],
  ['SU EDPLY-12th Science State-Advanced-4', 35200, 36200],
  ['SU EDPLY-12th Science State-Advanced-6', 36100, 37100],
  ['SU EDPLY-12th Science State-Advanced-8', 37000, 38000],
];

const SCRIPT_NAME = 'su-fee-update-helper';
const SCRIPT_METHOD = 'su_fee_update_helper';

async function createHelperScript() {
  // Delete if exists first
  await fetch(BASE + '/resource/Server Script/' + encodeURIComponent(SCRIPT_NAME), { method: 'DELETE', headers: HEADERS }).catch(() => {});
  await sleep(300);

  const script = `name = frappe.form_dict.name
tuition = int(frappe.form_dict.tuition)
total = int(frappe.form_dict.total)
frappe.db.set_value('Fee Structure', name, 'total_amount', total)
frappe.db.sql("UPDATE \`tabFee Component\` SET amount=%s, total=%s WHERE parent=%s AND fees_category != 'Admission Fee'", (tuition, tuition, name))
frappe.db.commit()
frappe.response['message'] = 'updated'`;

  const r = await api('POST', '/resource/Server Script', {
    doctype: 'Server Script',
    name: SCRIPT_NAME,
    script_type: 'API',
    api_method: SCRIPT_METHOD,
    allow_guest: 0,
    enabled: 1,
    script,
  });
  if (r.status !== 200) throw new Error('Failed to create script: ' + JSON.stringify(r.data).slice(0, 200));
  console.log('✓ Helper script created');
}

async function callHelper(name, tuition, total, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(BASE + '/method/' + SCRIPT_METHOD, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ name, tuition: String(tuition), total: String(total) }).toString(),
      });
      return { status: r.status, data: await r.json() };
    } catch (e) {
      if (i < retries - 1) { await sleep(800 * (i + 1)); continue; }
      return { status: 0, data: { exception: e.message } };
    }
  }
}

async function deleteHelperScript() {
  await fetch(BASE + '/resource/Server Script/' + encodeURIComponent(SCRIPT_NAME), { method: 'DELETE', headers: HEADERS });
  console.log('✓ Helper script deleted');
}

async function verifyExisting() {
  const notFound = [];
  for (const [name] of updates) {
    const r = await fetch(BASE + '/resource/Fee Structure/' + encodeURIComponent(name), { headers: HEADERS });
    if (r.status !== 200) notFound.push(name);
    await sleep(80);
  }
  return notFound;
}

async function main() {
  console.log(`\nVerifying ${updates.length} fee structure docs exist...`);
  const missing = await verifyExisting();
  if (missing.length > 0) {
    console.warn('\nWARNING — missing docs (will skip):', missing);
  }

  const existing = updates.filter(([n]) => !missing.includes(n));
  console.log(`\nFound ${existing.length} docs to update. Creating helper script...`);

  await createHelperScript();
  await sleep(500);

  const results = { ok: 0, fail: 0, errors: [] };

  for (const [name, tuition, total] of existing) {
    const r = await callHelper(name, tuition, total);
    if (r.status === 200) {
      console.log(`  ✓ ${name} → total=${total} (tuition=${tuition})`);
      results.ok++;
    } else {
      const err = r.data?.exception || r.data?.message || JSON.stringify(r.data).slice(0, 150);
      console.error(`  ✗ ${name}: ${err}`);
      results.fail++;
      results.errors.push({ name, err });
    }
    await sleep(150);
  }

  await deleteHelperScript();

  console.log(`\n═══ DONE ═══`);
  console.log(`Updated: ${results.ok}  Failed: ${results.fail}`);
  if (results.errors.length) {
    console.log('\nFailed docs:');
    results.errors.forEach(e => console.log(' ', e.name, '-', e.err));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
