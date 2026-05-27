const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

const peName = 'PEN-10th--056';

// Fetch fresh document with latest modified timestamp
const current = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = current?.data;
console.log('Current docstatus:', doc?.docstatus, '| modified:', doc?.modified);

// Submit by passing the full doc
const sub = await req('POST', '/api/method/frappe.client.submit', {
  doc: doc
});
console.log('Submit exception:', sub?.exception ?? 'none');
console.log('Submit docstatus:', sub?.message?.docstatus);
console.log('Submit name:', sub?.message?.name);
