/**
 * fix-sana-pe-update.mjs
 * 
 * Update Sana's Program Enrollment: custom_no_of_instalments "8" → "1"
 * Using same multi-field set_value pattern as fix_plans_method.mjs
 * (custom_fee_structure is submit-locked, so we skip it)
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const PE_NAME = 'PEN-10th-Palluruthy 26-27-061';

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: AUTH,
};

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { headers: HEADERS, ...opts });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  console.log('Updating PE custom_no_of_instalments → "1"...');

  // Use multi-field fieldname dict (same as reference script)
  const res = await fetchJSON(
    `${BASE}/api/method/frappe.client.set_value`,
    {
      method: 'POST',
      body: JSON.stringify({
        doctype: 'Program Enrollment',
        name: PE_NAME,
        fieldname: {
          custom_no_of_instalments: '1',
        },
      }),
    }
  );

  const updated = res.message;
  console.log('custom_no_of_instalments after:', updated?.custom_no_of_instalments);
  console.log('custom_plan after:', updated?.custom_plan);
  console.log('custom_fee_structure after:', updated?.custom_fee_structure);
  console.log('\n✓ PE update complete.');
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
