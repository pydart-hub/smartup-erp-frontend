import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

const EXECUTE = process.argv.includes('--execute');

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers, ...options });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log('='.repeat(70));
  console.log(`REALLOCATION SCRIPT FOR AARON THOMAS`);
  console.log(`MODE: ${EXECUTE ? '⚡ EXECUTE (LIVE WRITE)' : '🔍 DRY RUN (NO CHANGES)'}`);
  console.log('='.repeat(70));

  // 1. Current State Verification
  const activePe = await fetchJSON(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-11367`);
  const novInv = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11051`);
  const decInv = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11052`);

  console.log('\n[Current State]');
  console.log(`- Active PE: ${activePe.data.name} | Docstatus: ${activePe.data.docstatus} | Allocated to: ${activePe.data.references?.[0]?.reference_name} (₹${activePe.data.references?.[0]?.allocated_amount})`);
  console.log(`- Nov Invoice: ${novInv.data.name} | Outstanding: ₹${novInv.data.outstanding_amount} | Status: ${novInv.data.status}`);
  console.log(`- Dec Invoice: ${decInv.data.name} | Outstanding: ₹${decInv.data.outstanding_amount} | Status: ${decInv.data.status}`);

  if (activePe.data.docstatus !== 1) {
    console.error('ERROR: ACC-PAY-2026-11367 is not active (docstatus != 1). Aborting.');
    return;
  }

  if (activePe.data.references?.[0]?.reference_name !== 'ACC-SINV-2026-11052') {
    console.error('ERROR: ACC-PAY-2026-11367 is not allocated to ACC-SINV-2026-11052. Aborting.');
    return;
  }

  if (!EXECUTE) {
    console.log('\n[Proposed Execution Steps]');
    console.log('1. Cancel active Payment Entry ACC-PAY-2026-11367.');
    console.log('   -> This will release December Invoice ACC-SINV-2026-11052 back to ₹1,900 outstanding (Unpaid).');
    console.log('2. Create and submit new Payment Entry:');
    console.log('   - Customer: Aaron Thomas');
    console.log('   - Posting Date: 2026-11-11');
    console.log(`   - Mode: ${activePe.data.mode_of_payment}`);
    console.log(`   - Paid To: ${activePe.data.paid_to}`);
    console.log(`   - Reference No: ${activePe.data.reference_no}`);
    console.log('   - Allocated against: ACC-SINV-2026-11051 (November Invoice) for ₹1,900');
    console.log('   -> This will mark November Invoice ACC-SINV-2026-11051 as Paid (₹0 outstanding).');
    console.log('3. Verify all 8 invoices and SO totals.');
    console.log('\n*** DRY RUN COMPLETE. To execute, run with --execute ***');
    return;
  }

  // EXECUTE MODE
  console.log('\nStep 1: Cancelling ACC-PAY-2026-11367...');
  await fetchJSON(`${baseUrl}/api/method/frappe.client.cancel`, {
    method: 'POST',
    body: JSON.stringify({ doctype: 'Payment Entry', name: 'ACC-PAY-2026-11367' })
  });
  console.log('✓ Cancelled ACC-PAY-2026-11367');

  console.log('\nStep 2: Creating new Payment Entry for November Invoice...');
  const newPePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: 'Aaron Thomas',
    paid_amount: 1900,
    received_amount: 1900,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: activePe.data.mode_of_payment,
    paid_from: 'Debtors - SU PLR',
    paid_to: activePe.data.paid_to,
    company: 'Smart Up Palluruthy',
    posting_date: '2026-11-11',
    reference_no: activePe.data.reference_no,
    reference_date: '2026-11-11',
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: 'ACC-SINV-2026-11051',
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1900
      }
    ],
    remarks: `Amount INR 1900.0 received from Aaron Thomas\nTransaction reference no ${activePe.data.reference_no} dated 2026-11-11\nAmount INR 1900.0 against Sales Invoice ACC-SINV-2026-11051`
  };

  const createRes = await fetchJSON(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    body: JSON.stringify(newPePayload)
  });
  const newPeName = createRes.data.name;
  console.log(`✓ Created Draft PE: ${newPeName}`);

  console.log(`\nStep 3: Submitting ${newPeName}...`);
  await fetchJSON(`${baseUrl}/api/resource/Payment Entry/${newPeName}`, {
    method: 'PUT',
    body: JSON.stringify({ docstatus: 1 })
  });
  console.log(`✓ Submitted ${newPeName}`);

  console.log('\nStep 4: Verifying final state...');
  const novCheck = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11051`);
  const decCheck = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11052`);
  console.log(`- Nov Invoice (ACC-SINV-2026-11051): Outstanding = ₹${novCheck.data.outstanding_amount}, Status = ${novCheck.data.status}`);
  console.log(`- Dec Invoice (ACC-SINV-2026-11052): Outstanding = ₹${decCheck.data.outstanding_amount}, Status = ${decCheck.data.status}`);
  console.log('\n🎉 REALLOCATION COMPLETED SUCCESSFULLY!');
}

run().catch(console.error);
