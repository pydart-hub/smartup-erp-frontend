const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Check existing scripts for valid script_type
async function checkExisting() {
  const r = await fetch(base + '/resource/Server Script?limit=5', { headers });
  const j = await r.json();
  const scripts = j?.data || [];
  for (const s of scripts) {
    const r2 = await fetch(base + '/resource/Server Script/' + encodeURIComponent(s.name), { headers });
    const d = (await r2.json()).data;
    console.log(s.name, '| script_type:', d?.script_type, '| api_method:', d?.api_method);
  }
}

checkExisting().catch(e => console.log('check error:', e.message));
