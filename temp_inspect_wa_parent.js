const BASE='https://smartup.m.frappe.cloud';
const AUTH='token 03330270e330d49:9c2261ae11ac2d2';
fetch(`${BASE}/api/resource/DocType/Work%20Assignment`, {
  headers: { Authorization: AUTH, Accept: 'application/json' },
})
  .then(r => r.text())
  .then(t => { console.log(t); })
  .catch(e => { console.error(e); process.exit(1); });
