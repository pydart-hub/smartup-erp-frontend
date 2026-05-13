const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const fixedScript = `if 'Advanced' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Advanced', update_modified=False)
elif 'Basic' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Basic', update_modified=False)
`;

(async () => {
  const r = await fetch(base + '/resource/Server Script/edply-set-plan-after-rename', {
    method: 'PUT', headers,
    body: JSON.stringify({ script: fixedScript })
  });
  const j = await r.json();
  console.log('Updated script:', j?.data?.name || j?.exception?.slice(0, 80));
})();
