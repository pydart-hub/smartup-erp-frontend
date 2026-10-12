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

async function check9773() {
  const inv = (await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-09773`, { headers })).json()).data;
  console.log('ACC-SINV-2026-09773 items and SO link:');
  console.log({
    posting_date: inv.posting_date,
    due_date: inv.due_date,
    grand_total: inv.grand_total,
    items: inv.items?.map(it => ({
      item_code: it.item_code,
      item_name: it.item_name,
      rate: it.rate,
      sales_order: it.sales_order,
      so_detail: it.so_detail
    }))
  });
}

check9773().catch(console.error);
