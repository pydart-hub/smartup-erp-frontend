const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: `token 03330270e330d49:9c2261ae11ac2d2` };

async function q(url) {
  const r = await fetch(BASE + url, { headers: HEADERS });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}: ${JSON.stringify(j)}`);
  return j.data;
}

async function main() {
  // Study an existing cash payment for MMK to mirror the structure
  const existing = await q('/api/resource/Payment Entry/ACC-PAY-2026-04365');
  console.log('=== EXISTING MMK CASH PAYMENT STRUCTURE ===');
  console.log(JSON.stringify({
    payment_type: existing.payment_type,
    mode_of_payment: existing.mode_of_payment,
    company: existing.company,
    posting_date: existing.posting_date,
    party_type: existing.party_type,
    party: existing.party,
    paid_from: existing.paid_from,
    paid_to: existing.paid_to,
    paid_from_account_currency: existing.paid_from_account_currency,
    paid_to_account_currency: existing.paid_to_account_currency,
    paid_amount: existing.paid_amount,
    received_amount: existing.received_amount,
    references: existing.references,
  }, null, 2));

  // Also get the receivable account for Moolamkuzhi
  const recvAcc = await q('/api/resource/Account?filters=[["company","=","Smart Up Moolamkuzhi"],["account_type","=","Receivable"],["is_group","=","0"]]&fields=["name","account_name"]&limit=5');
  console.log('\n=== RECEIVABLE ACCOUNTS (MMK) ===');
  console.log(JSON.stringify(recvAcc, null, 2));
}

main().catch(console.error);
