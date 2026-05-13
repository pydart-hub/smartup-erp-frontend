// Test whether frappe.client.set_value can update submitted Fee Structure total_amount
// frappe.db.set_value bypasses UpdateAfterSubmitError (it's low-level SQL, not doc.save())

const BASE = 'https://smartup.m.frappe.cloud/api';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
};

// Test with one doc first
const testDoc = 'SU EDPLY-9th CBSE-Advanced-1';
const newTotal = 29500; // new correct value (was 39400)

const r = await fetch(BASE + '/method/frappe.client.set_value', {
  method: 'POST',
  headers: HEADERS,
  body: new URLSearchParams({
    doctype: 'Fee Structure',
    name: testDoc,
    fieldname: 'total_amount',
    value: String(newTotal),
  }).toString(),
});

const j = await r.json();
console.log('Status:', r.status);
console.log('Response:', JSON.stringify(j).slice(0, 300));

// Verify by reading back
const verify = await fetch(
  BASE + '/resource/Fee Structure/' + encodeURIComponent(testDoc) + '?fields=["name","total_amount"]',
  { headers: { 'Authorization': HEADERS.Authorization, 'Accept': 'application/json' } }
).then(r => r.json());

console.log('Verified total_amount:', verify.data?.total_amount, '(expected:', newTotal, ')');
