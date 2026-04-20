const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  return (await r.json()).data;
}

async function main() {
  // Any payment with ANGEL in name
  const pe = await q('/api/resource/Payment Entry?filters=[["party","like","%ANGEL%"],["payment_type","=","Receive"]]&fields=["name","posting_date","party","paid_amount","mode_of_payment","docstatus"]&limit=20');
  console.log('=== Payments with ANGEL ===');
  console.log(JSON.stringify(pe, null, 2));

  // Any payment from Apr 16 from company Moolamkuzhi
  const pe2 = await q('/api/resource/Payment Entry?filters=[["posting_date",">=","2026-04-16"],["posting_date","<=","2026-04-20"],["company","=","Smart Up Moolamkuzhi"],["payment_type","=","Receive"]]&fields=["name","posting_date","party","paid_amount","mode_of_payment","reference_no","docstatus"]&order_by=posting_date asc&limit=50');
  console.log('\n=== All Receive payments Apr 16-20 (MMK) ===');
  console.log(JSON.stringify(pe2, null, 2));
}

main().catch(console.error);
