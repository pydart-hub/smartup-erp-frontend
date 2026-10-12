const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkAllInvoices() {
  const customer = 'FAHANA MS';
  const siRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customer}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  for (const si of siRes.data || []) {
    const full = (await (await fetch(`${baseUrl}/api/resource/Sales Invoice/${si.name}`, { headers })).json()).data;
    console.log(si.name, 'posting:', full.posting_date, 'due:', full.due_date, 'grand:', full.grand_total, 'item_rate:', full.items?.[0]?.rate, 'so_detail:', full.items?.[0]?.so_detail);
  }
}

checkAllInvoices().catch(console.error);
