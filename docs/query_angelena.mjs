const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const H = { 'Authorization': AUTH };

async function get(path) {
  const r = await fetch(BASE + path, { headers: H });
  return r.json();
}

const CUSTOMER = 'ANGELENA CHRISTINA';
const enc = encodeURIComponent;

// 1. Sales Orders - basic fields only
const soList = await get('/api/resource/Sales%20Order?filters=' + enc(JSON.stringify([["customer","=",CUSTOMER]])) + '&fields=' + enc(JSON.stringify(["name","customer","status","grand_total","per_billed"])) + '&limit=20');
console.log('=== SALES ORDERS ===');
console.log(JSON.stringify(soList, null, 2));

// 2. Sales Invoices - basic fields only
const invList = await get('/api/resource/Sales%20Invoice?filters=' + enc(JSON.stringify([["customer","=",CUSTOMER]])) + '&fields=' + enc(JSON.stringify(["name","customer","status","grand_total","outstanding_amount","due_date","posting_date"])) + '&limit=20');
console.log('\n=== SALES INVOICES ===');
console.log(JSON.stringify(invList, null, 2));

// 3. Full SO details
if (soList.data?.length) {
  for (const so of soList.data) {
    const soDetail = await get('/api/resource/Sales%20Order/' + encodeURIComponent(so.name));
    console.log('\n=== SO DETAIL:', so.name, '===');
    const d = soDetail.data;
    Object.entries(d || {}).forEach(([k,v]) => {
      if (typeof v !== 'object') console.log(k, '=', v);
    });
    console.log('items count:', d?.items?.length);
    console.log('items:', JSON.stringify(d?.items, null, 2));
  }
} else {
  console.log('\nNo Sales Orders found for customer name. Searching invoices differently...');
  const invList2 = await get('/api/resource/Sales%20Invoice?filters=' + enc(JSON.stringify([["customer","like","%ANGELENA%"]])) + '&fields=' + enc(JSON.stringify(["name","customer","status","grand_total"])) + '&limit=20');
  console.log(JSON.stringify(invList2, null, 2));
}
