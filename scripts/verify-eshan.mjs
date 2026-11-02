import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function verifyAll() {
  const customer = 'ESHAN RAFEEK';
  
  const soRes = await fetch(frappeUrl + '/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['customer', '=', customer], ['docstatus', '=', 1]])) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'grand_total', 'custom_plan', 'custom_no_of_instalments', 'status'])), { headers });
  console.log('Active Sales Order:', (await soRes.json()).data);

  const sinvRes = await fetch(frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([['customer', '=', customer], ['docstatus', '=', 1]])) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'])), { headers });
  console.log('Active Sales Invoice:', (await sinvRes.json()).data);

  const peRes = await fetch(frappeUrl + '/api/resource/Payment Entry?filters=' + encodeURIComponent(JSON.stringify([['party', '=', customer], ['docstatus', '=', 1]])) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'status', 'reference_no'])), { headers });
  console.log('Active Payment Entry:', (await peRes.json()).data);
}

verifyAll().catch(console.error);

