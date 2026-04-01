const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH };

async function query() {
  // Check existing Client Scripts for Payment Entry
  const csRes = await fetch(
    `${FRAPPE_URL}/api/resource/Client Script?filters=[["dt","=","Payment Entry"]]&fields=["name","dt","script","enabled"]&limit_page_length=50`,
    { headers }
  );
  const cs = await csRes.json();
  console.log('=== Existing Client Scripts for Payment Entry ===');
  console.log(JSON.stringify(cs.data, null, 2));

  // For each Mode of Payment, get the accounts child table
  const mops = ['Cash', 'UPI', 'Razorpay', 'Bank Transfer', 'Cheque', 'Bank Draft', 'Wire Transfer', 'Credit Card'];
  for (const mop of mops) {
    const detRes = await fetch(
      `${FRAPPE_URL}/api/resource/Mode of Payment/${encodeURIComponent(mop)}?fields=["*"]`,
      { headers }
    );
    const det = await detRes.json();
    console.log(`\n=== Mode of Payment: ${mop} ===`);
    console.log('Type:', det.data.type);
    console.log('Accounts:', JSON.stringify(det.data.accounts || [], null, 2));
  }
}

query().catch(console.error);
