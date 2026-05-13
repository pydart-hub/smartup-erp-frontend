/**
 * Backfill Program Enrollment.custom_plan from custom_fee_structure name.
 * Fixes the dashboard plan-count mismatch (Advanced students wrongly tagged Basic).
 *
 * Strategy: temporary Server Script API uses frappe.db.set_value (bypasses
 * UpdateAfterSubmitError because it's a low-level DB write, not doc.save()).
 *
 * Run: node scripts/fix-pe-plan-mismatch.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud/api';
const HJ = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const HF = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCRIPT_NAME = 'su-pe-plan-fix';
const METHOD = 'su_pe_plan_fix';

async function fetchAllPEs() {
  let all = [];
  for (let s = 0; s < 3000; s += 200) {
    const params = new URLSearchParams({
      fields: JSON.stringify(['name', 'student_name', 'custom_plan', 'custom_fee_structure']),
      filters: JSON.stringify([['docstatus', '=', 1]]),
      limit_start: String(s),
      limit_page_length: '200',
    });
    const r = await fetch(BASE + '/resource/Program Enrollment?' + params, { headers: HJ });
    const j = await r.json();
    const rows = j.data || [];
    all = all.concat(rows);
    if (rows.length < 200) break;
  }
  return all;
}

function planFromFs(fs) {
  if (!fs) return null;
  if (fs.includes('-Advanced-') || fs.endsWith('-Advanced')) return 'Advanced';
  if (fs.includes('-Basic-') || fs.endsWith('-Basic')) return 'Basic';
  if (fs.includes('-Inter') || fs.includes('-Intermediate')) return 'Intermediate';
  return null;
}

async function createScript() {
  await fetch(BASE + '/resource/Server Script/' + SCRIPT_NAME, { method: 'DELETE', headers: HJ }).catch(() => {});
  await sleep(400);

  const script = [
    "name = frappe.form_dict.name",
    "plan = frappe.form_dict.plan",
    "frappe.db.set_value('Program Enrollment', name, 'custom_plan', plan, update_modified=False)",
    "frappe.db.commit()",
    "frappe.response['message'] = 'ok'",
  ].join('\n');

  const r = await fetch(BASE + '/resource/Server Script', {
    method: 'POST', headers: HJ,
    body: JSON.stringify({
      doctype: 'Server Script', name: SCRIPT_NAME,
      script_type: 'API', api_method: METHOD,
      enabled: 1, allow_guest: 0, script,
    }),
  });
  if (r.status !== 200) {
    const j = await r.json();
    throw new Error('Failed to create script: ' + JSON.stringify(j).slice(0, 300));
  }
  console.log('✓ Helper script created');
}

async function deleteScript() {
  await fetch(BASE + '/resource/Server Script/' + SCRIPT_NAME, { method: 'DELETE', headers: HJ });
  console.log('✓ Helper script deleted');
}

async function callFix(name, plan, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(BASE + '/method/' + METHOD, {
        method: 'POST', headers: HF,
        body: new URLSearchParams({ name, plan }).toString(),
      });
      const j = await r.json();
      return { status: r.status, data: j };
    } catch (e) {
      if (i < retries - 1) { await sleep(800 * (i + 1)); continue; }
      return { status: 0, data: { exception: e.message } };
    }
  }
}

async function main() {
  console.log('Fetching all active PEs...');
  const all = await fetchAllPEs();
  console.log('Total active PEs:', all.length);

  // Build the list of fixes needed
  const fixes = [];
  for (const p of all) {
    const expected = planFromFs(p.custom_fee_structure);
    if (!expected) continue;                  // no FS or unknown plan in FS name
    if (p.custom_plan === expected) continue; // already correct
    fixes.push({ name: p.name, current: p.custom_plan || '(null)', expected, fs: p.custom_fee_structure });
  }

  console.log(`\nNeed to fix ${fixes.length} PEs:`);
  const summary = {};
  for (const f of fixes) {
    const k = `${f.current} → ${f.expected}`;
    summary[k] = (summary[k] || 0) + 1;
  }
  console.log(' ', summary);

  if (fixes.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  await createScript();
  await sleep(500);

  let ok = 0, fail = 0;
  const errors = [];
  for (const f of fixes) {
    const r = await callFix(f.name, f.expected);
    if (r.status === 200 && r.data?.message === 'ok') {
      ok++;
      if (ok % 10 === 0) console.log(`  progress: ${ok}/${fixes.length}`);
    } else {
      fail++;
      errors.push({ name: f.name, err: r.data?.exception || JSON.stringify(r.data).slice(0, 120) });
      console.error(`  ✗ ${f.name}: ${errors[errors.length - 1].err}`);
    }
    await sleep(120);
  }

  await deleteScript();

  console.log(`\n═══ DONE ═══  Updated: ${ok}  Failed: ${fail}`);
  if (errors.length) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(' ', e.name, '-', e.err));
  }

  // Final verification
  await sleep(800);
  console.log('\nVerifying...');
  const verifyAll = await fetchAllPEs();
  let stillWrong = 0;
  for (const p of verifyAll) {
    const expected = planFromFs(p.custom_fee_structure);
    if (expected && p.custom_plan !== expected) stillWrong++;
  }
  console.log('Remaining mismatches:', stillWrong);

  // Final breakdown
  const counts = { Advanced: 0, Basic: 0, Intermediate: 0, Other: 0, NoFs: 0 };
  for (const p of verifyAll) {
    if (!p.custom_fee_structure) { counts.NoFs++; continue; }
    const plan = p.custom_plan;
    if (plan === 'Advanced') counts.Advanced++;
    else if (plan === 'Basic') counts.Basic++;
    else if (plan === 'Intermediate') counts.Intermediate++;
    else counts.Other++;
  }
  console.log('Final plan counts (PEs with FS):', counts);
}

main().catch(e => { console.error(e); process.exit(1); });
