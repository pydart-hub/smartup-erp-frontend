import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const AUTH = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function main() {
  const r = await fetch(`${BASE}/api/resource/Error Log?filters=[["title","=","Mary PE2 error"]]&fields=["name","error"]&limit=5`, { headers: h });
  const d = await r.json();
  console.log('Error logs:', d.data);

  const r2 = await fetch(`${BASE}/api/resource/Payment Entry/ACC-PAY-2026-06665`, { headers: h });
  const d2 = await r2.json();
  console.log('ACC-PAY-2026-06665 status:', d2.data?.docstatus, d2.data?.paid_amount, d2.data?.status);
}

main().catch(console.error);
