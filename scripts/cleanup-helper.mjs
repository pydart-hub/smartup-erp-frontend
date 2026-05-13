// Delete the temporary Server Script helper
const BASE = 'https://smartup.m.frappe.cloud/api';
const H = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Accept': 'application/json' };

const r = await fetch(BASE + '/resource/Server Script/su-fee-update-helper', { method: 'DELETE', headers: H });
console.log('Deleted helper script:', r.status, await r.text().then(t => t.slice(0,100)));
