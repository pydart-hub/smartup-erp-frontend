const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function fetchPEAccounts() {
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","ADHEEB RILLAH K U"]]&fields=["name","paid_to","paid_from","mode_of_payment","paid_amount","posting_date","reference_no","docstatus"]&order_by=posting_date asc`, { headers })).json();
  console.log('Payment Entries accounts:', peRes.data);
}

fetchPEAccounts().catch(console.error);
