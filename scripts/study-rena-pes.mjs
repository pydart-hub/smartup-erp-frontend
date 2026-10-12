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

async function checkPeDocs() {
  const peList = ['ACC-PAY-2026-04170', 'ACC-PAY-2026-07562-1', 'ACC-PAY-2026-07563-1'];
  for (const peName of peList) {
    const res = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
    console.log(peName, {
      posting_date: res.data.posting_date,
      mode_of_payment: res.data.mode_of_payment,
      paid_amount: res.data.paid_amount,
      paid_from: res.data.paid_from,
      paid_to: res.data.paid_to,
      reference_no: res.data.reference_no,
      reference_date: res.data.reference_date,
      remarks: res.data.remarks
    });
  }
}

checkPeDocs().catch(console.error);
