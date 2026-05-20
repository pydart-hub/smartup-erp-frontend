const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const api = async (url) => {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
};

async function main() {
  // Get full invoice ACC-SINV-2026-06771 to find company
  console.log('=== Invoice ACC-SINV-2026-06771 (₹10,300) ===');
  const inv = (await api(`${BASE}/api/resource/Sales Invoice/ACC-SINV-2026-06771`)).data;
  console.log(JSON.stringify({
    name: inv.name,
    company: inv.company,
    customer: inv.customer,
    grand_total: inv.grand_total,
    outstanding_amount: inv.outstanding_amount,
    docstatus: inv.docstatus,
    status: inv.status,
    items: inv.items?.map(i => ({ item_name: i.item_name, amount: i.amount })),
  }, null, 2));

  const COMPANY = inv.company;
  console.log('\nCompany:', COMPANY);

  // Receivable account for this company
  console.log('\n=== Receivable Accounts ===');
  const recv = (await api(`${BASE}/api/resource/Account?filters=[["company","=","${COMPANY}"],["account_type","=","Receivable"]]&fields=["name","account_type","company"]&limit=5`)).data;
  console.log(JSON.stringify(recv, null, 2));

  // Razorpay Mode of Payment accounts
  console.log('\n=== Razorpay MOP Accounts ===');
  const mop = (await api(`${BASE}/api/resource/Mode of Payment/Razorpay`)).data;
  const rzAccount = mop.accounts?.find(a => a.company === COMPANY)?.default_account;
  console.log('Razorpay accounts:', JSON.stringify(mop.accounts?.map(a => ({ company: a.company, account: a.default_account })), null, 2));
  console.log('For company', COMPANY, ':', rzAccount);
}

main().catch(console.error);
