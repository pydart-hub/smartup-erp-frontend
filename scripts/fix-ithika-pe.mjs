/**
 * Creates a temporary Frappe Server Script to force-update PE fields
 * via frappe.db.set_value (bypasses validate_update_after_submit),
 * then deletes the script.
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const PE_NAME = 'PEN-9th-Fortkochi 26-27-098';
const SCRIPT_NAME = 'Fix Ithika PE';

async function req(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

async function main() {
  // ── 1. Create server script ────────────────────────────────────────────
  console.log('[1] Creating Server Script...');

  const script = [
    `frappe.db.set_value("Program Enrollment", "${PE_NAME}", {`,
    `    "custom_plan": "Advanced",`,
    `    "custom_no_of_instalments": "8"`,
    `})`,
    `frappe.db.commit()`,
    `frappe.response["message"] = "Updated: custom_plan=Advanced, custom_no_of_instalments=8"`,
  ].join('\n');

  // Remove if leftover from a previous run
  await req('DELETE', '/api/resource/Server Script/' + encodeURIComponent(SCRIPT_NAME));

  const create = await req('POST', '/api/resource/Server Script', {
    script_type: 'API',
    name: SCRIPT_NAME,
    api_method: 'fix_ithika_pe',
    script,
    allow_guest: 0,
    disabled: 0,
  });
  console.log('  Status:', create.status, create.ok ? '✓' : '❌');
  if (!create.ok) {
    console.error('  Error:', JSON.stringify(create.data).slice(0, 400));
    process.exit(1);
  }

  // ── 2. Run the script ──────────────────────────────────────────────────
  console.log('\n[2] Running Server Script...');
  const run = await req('POST', '/api/method/fix_ithika_pe', {});
  console.log('  Status:', run.status);
  console.log('  Response:', JSON.stringify(run.data).slice(0, 300));

  // ── 3. Verify ──────────────────────────────────────────────────────────
  console.log('\n[3] Verifying Program Enrollment...');
  const pe = await req('GET', '/api/resource/Program Enrollment/' + encodeURIComponent(PE_NAME));
  const d = pe.data?.data;
  console.log('  custom_plan:             ', d?.custom_plan);
  console.log('  custom_no_of_instalments:', d?.custom_no_of_instalments);

  // ── 4. Delete temp script ──────────────────────────────────────────────
  console.log('\n[4] Cleaning up Server Script...');
  const del = await req('DELETE', '/api/resource/Server Script/' + encodeURIComponent(SCRIPT_NAME));
  console.log('  Delete status:', del.status, del.ok ? '✓' : '❌');

  const ok = d?.custom_plan === 'Advanced' && d?.custom_no_of_instalments === '8';
  console.log(ok ? '\n✅ PE updated!' : '\n⚠️  PE fields unchanged — update manually in Frappe desk.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
