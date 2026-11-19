import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  return res.json();
}

async function checkAccounting() {
  // Check GL entries for Aaron Thomas
  const gl = await fetchJSON(`${baseUrl}/api/resource/GL Entry?filters=[["party","=","Aaron Thomas"]]&fields=["name","posting_date","account","against","debit","credit","voucher_type","voucher_no","against_voucher"]&order_by=posting_date asc&limit_page_length=50`);
  console.log('GL Entries count:', gl.data?.length);
  for (const entry of gl.data || []) {
    if (entry.voucher_no.includes('11342') || entry.voucher_no.includes('11367') || entry.against_voucher?.includes('11051') || entry.against_voucher?.includes('11052')) {
      console.log('Relevant GL:', entry);
    }
  }

  // Check Sales Order billing status
  const so = await fetchJSON(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01526`);
  console.log('\nSales Order SAL-ORD-2026-01526:', {
    name: so.data.name,
    grand_total: so.data.grand_total,
    per_billed: so.data.per_billed,
    status: so.data.status
  });

  // Check all 8 invoices for Aaron Thomas
  const invs = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","Aaron Thomas"]]&fields=["name","due_date","grand_total","outstanding_amount","status"]&order_by=due_date asc`);
  console.log('\nAll Invoices:');
  console.table(invs.data);
}

checkAccounting().catch(console.error);
