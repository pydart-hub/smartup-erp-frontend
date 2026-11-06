import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const baseUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function checkPEDocs() {
  const peList = [
    'ACC-PAY-2026-03917',
    'ACC-PAY-2026-05152',
    'ACC-PAY-2026-05772',
    'ACC-PAY-2026-06637',
    'ACC-PAY-2026-06638',
    'ACC-PAY-2026-07849',
    'ACC-PAY-2026-07850',
    'ACC-PAY-2026-08308',
    'ACC-PAY-2026-08309'
  ];

  for (const peName of peList) {
    const res = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, { headers })).json();
    const d = res.data;
    console.log({
      name: d.name,
      payment_type: d.payment_type,
      posting_date: d.posting_date,
      mode_of_payment: d.mode_of_payment,
      paid_from: d.paid_from,
      paid_to: d.paid_to,
      paid_amount: d.paid_amount,
      received_amount: d.received_amount,
      reference_no: d.reference_no,
      reference_date: d.reference_date,
      docstatus: d.docstatus
    });
  }
}

checkPEDocs().catch(console.error);

