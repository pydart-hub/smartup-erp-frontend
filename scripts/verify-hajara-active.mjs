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

async function verifyActive() {
  const customer = 'HAJARA BANU';

  console.log('--- ACTIVE SALES INVOICES (docstatus = 1) ---');
  const siRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customer}"],["docstatus","=","1"]]&fields=["name","due_date","grand_total","outstanding_amount","status"]&order_by=due_date asc`, { headers })).json();
  let totGrand = 0, totOut = 0;
  siRes.data?.forEach((si, i) => {
    totGrand += si.grand_total;
    totOut += si.outstanding_amount;
    console.log(`Inst ${i+1}: ${si.name} | Due: ${si.due_date} | Grand: ₹${si.grand_total} | Out: ₹${si.outstanding_amount} | Status: ${si.status}`);
  });
  console.log(`Active Grand Total: ₹${totGrand}`);
  console.log(`Active Outstanding: ₹${totOut}`);

  console.log('\n--- ACTIVE PAYMENT ENTRIES (docstatus = 1) ---');
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customer}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  for (const pe of peRes.data || []) {
    totPaid += pe.paid_amount;
    const full = (await (await fetch(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers })).json()).data;
    const alloc = full.references?.map(r => `${r.reference_name} (₹${r.allocated_amount})`).join(', ');
    console.log(`${pe.name} | Date: ${pe.posting_date} | Paid: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Ref: ${pe.reference_no} | Alloc: ${alloc}`);
  }
  console.log(`Active Total Paid: ₹${totPaid}`);
}

verifyActive().catch(console.error);
