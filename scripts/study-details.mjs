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

async function inspectDoc(doctype, name) {
  const res = await fetch(`${frappeUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  const data = await res.json();
  return data.data;
}

async function run() {
  const sinv = await inspectDoc('Sales Invoice', 'ACC-SINV-2026-01883');
  console.log('Posting Date:', sinv.posting_date);
  console.log('Due Date:', sinv.due_date);
  console.log('Item details:', sinv.items);

  const pe = await inspectDoc('Payment Entry', 'ACC-PAY-2026-03907');
  console.log('PE Paid To Account:', pe.paid_to);
  console.log('PE Paid From Account:', pe.paid_from);
  console.log('PE Reference No:', pe.reference_no);
  console.log('PE Reference Date:', pe.reference_date);
}

run();
