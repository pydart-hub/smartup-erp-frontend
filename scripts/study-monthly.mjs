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

async function run() {
  const sinvs = await (await fetch(frappeUrl + '/api/resource/Sales%20Invoice?filters=[["company","=","Smart Up Kadavanthara"],["grand_total","=","1900"]]&fields=["name","student","customer","due_date","posting_date"]&limit_page_length=5', { headers })).json();
  console.log('1900 KDV invoices:', sinvs.data);
}

run();
