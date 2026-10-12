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

async function verify() {
  const customerName = 'Advaith Krishna S prabhu';
  const studentId = 'STU-SU KDV-26-001';

  console.log('=== VERIFYING ADVAITH KRISHNA S PRABHU ===\n');

  // 1. Sales Order
  const soRes = await fetch(`${frappeUrl}/api/resource/Sales%20Order?filters=[["student","=","${studentId}"]]&fields=["name","docstatus","grand_total","status","custom_no_of_instalments"]`, { headers });
  const soList = await soRes.json();
  console.log('Sales Orders:', soList.data);

  // 2. Sales Invoices
  const sinvRes = await fetch(`${frappeUrl}/api/resource/Sales%20Invoice?filters=[["student","=","${studentId}"],["docstatus","=","1"]]&fields=["name","due_date","grand_total","outstanding_amount","status"]&order_by=creation%20asc`, { headers });
  const sinvList = await sinvRes.json();
  console.log('\nActive Sales Invoices:');
  console.table(sinvList.data);

  // 3. Payment Entries
  const peRes = await fetch(`${frappeUrl}/api/resource/Payment%20Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","mode_of_payment","paid_amount","reference_no"]`, { headers });
  const peList = await peRes.json();
  console.log('\nActive Payment Entries:');
  console.table(peList.data);

  const totalInvoiced = sinvList.data.reduce((sum, row) => sum + row.grand_total, 0);
  const totalOutstanding = sinvList.data.reduce((sum, row) => sum + row.outstanding_amount, 0);
  const totalPaid = peList.data.reduce((sum, row) => sum + row.paid_amount, 0);

  console.log(`\nReconciliation Summary:`);
  console.log(`Total Invoiced: ₹${totalInvoiced} (Expected: 35950)`);
  console.log(`Total Paid:     ₹${totalPaid} (Expected: 16000)`);
  console.log(`Total Due:      ₹${totalOutstanding} (Expected: 19950)`);
}

verify();
