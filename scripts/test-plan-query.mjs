// Test what Frappe returns for the group_by plan count query
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const params = new URLSearchParams({
  fields: JSON.stringify(["custom_plan as plan", "count(name) as count"]),
  filters: JSON.stringify([["docstatus", "=", 1]]),
  group_by: "custom_plan",
  limit_page_length: "0",
});

const url = `${BASE}/api/resource/Program Enrollment?${params}`;
console.log('URL:', url);
const r = await fetch(url, { headers: { Authorization: AUTH } });
const json = await r.json();
console.log('\n=== GROUP BY RESULT ===');
console.log(JSON.stringify(json, null, 2));

// Also check direct simple query
const params2 = new URLSearchParams({
  fields: JSON.stringify(["custom_plan", "name"]),
  filters: JSON.stringify([["docstatus", "=", 1]]),
  limit_page_length: "10",
});
const r2 = await fetch(`${BASE}/api/resource/Program Enrollment?${params2}`, { headers: { Authorization: AUTH } });
const json2 = await r2.json();
console.log('\n=== SAMPLE RECORDS ===');
console.log(JSON.stringify(json2.data?.slice(0,5), null, 2));

// Also count total active enrollments
const params3 = new URLSearchParams({
  doctype: 'Program Enrollment',
  filters: JSON.stringify([["docstatus", "=", 1]]),
});
const r3 = await fetch(`${BASE}/api/method/frappe.client.get_count?doctype=Program Enrollment&filters=[["docstatus","=",1]]`, { headers: { Authorization: AUTH } });
const json3 = await r3.json();
console.log('\n=== TOTAL SUBMITTED PE COUNT ===');
console.log(JSON.stringify(json3, null, 2));
