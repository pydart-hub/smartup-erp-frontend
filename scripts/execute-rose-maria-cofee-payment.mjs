import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const FRAPPE_URL = env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_KEY = env.FRAPPE_API_KEY;
const FRAPPE_SECRET = env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${FRAPPE_KEY}:${FRAPPE_SECRET}`,
  'Content-Type': 'application/json'
};

async function execute() {
  console.log('=== EXECUTING COFEE PAYMENT ENTRY FOR ROSE MARIA ROY ===');
  const invoiceId = 'ACC-SINV-2026-03867';
  const orderId = 'ord_JpxPWRP7Fn1365';
  const paymentDate = '2026-10-05';
  const modeOfPayment = 'CoFee';
  const paidToAccount = 'CoFee - SU CHL';
  const amount = 2400;

  // 1. Verify invoice state before
  const invBeforeRes = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`, { headers });
  const invBefore = (await invBeforeRes.json()).data;
  console.log(`Invoice ${invoiceId} before: Outstanding = ₹${invBefore.outstanding_amount}, Status = ${invBefore.status}`);

  if (invBefore.outstanding_amount !== 2400) {
    throw new Error(`Unexpected invoice outstanding amount: ${invBefore.outstanding_amount}`);
  }

  // 2. Check if Payment Entry already exists for this reference
  const checkUrl = `${FRAPPE_URL}/api/resource/Payment Entry?filters=${encodeURIComponent(
    JSON.stringify([['reference_no', '=', orderId], ['docstatus', '!=', 2]])
  )}&fields=["name","docstatus"]`;
  const checkRes = await fetch(checkUrl, { headers });
  const checkData = await checkRes.json();
  if (checkData.data && checkData.data.length > 0) {
    console.log(`Payment Entry already exists for reference ${orderId}:`, checkData.data[0].name);
    return;
  }

  // 3. Get Payment Entry template from Frappe
  console.log('Fetching payment entry template...');
  const getPeRes = await fetch(
    `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dt: 'Sales Invoice',
        dn: invoiceId,
        party_amount: amount,
        bank_amount: amount
      })
    }
  );

  if (!getPeRes.ok) {
    const err = await getPeRes.text();
    throw new Error(`get_payment_entry failed: ${getPeRes.status} - ${err}`);
  }

  const mappedPE = (await getPeRes.json()).message;

  // Configure exact fields as specified
  mappedPE.posting_date = paymentDate;
  mappedPE.reference_date = paymentDate;
  mappedPE.mode_of_payment = modeOfPayment;
  mappedPE.paid_to = paidToAccount;
  mappedPE.paid_to_account_type = 'Bank';
  mappedPE.reference_no = orderId;
  mappedPE.paid_amount = amount;
  mappedPE.received_amount = amount;
  mappedPE.total_allocated_amount = amount;
  mappedPE.base_paid_amount = amount;
  mappedPE.base_received_amount = amount;
  mappedPE.base_total_allocated_amount = amount;
  mappedPE.custom_remarks = 1;
  mappedPE.remarks = `Amount INR ${amount}.0 received from ROSE MARIA ROY\nTransaction reference no ${orderId} dated ${paymentDate}\nAmount INR ${amount}.0 against Sales Invoice ${invoiceId}`;

  // Ensure reference allocation is exact
  if (mappedPE.references && Array.isArray(mappedPE.references)) {
    for (const ref of mappedPE.references) {
      if (ref.reference_name === invoiceId) {
        ref.allocated_amount = amount;
      }
    }
  }

  // Remove local temporary flags
  delete mappedPE.__islocal;
  delete mappedPE.__unsaved;

  console.log('Inserting Payment Entry to Frappe...');
  const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(mappedPE)
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`Payment Entry insert failed: ${insertRes.status} - ${errText}`);
  }

  const insertData = await insertRes.json();
  const paymentEntryName = insertData.data?.name;
  console.log(`Payment Entry created (Draft): ${paymentEntryName}`);

  // 4. Submit Payment Entry (docstatus: 1)
  console.log(`Submitting Payment Entry ${paymentEntryName}...`);
  const submitRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Payment Entry submit failed: ${submitRes.status} - ${errText}`);
  }

  console.log(`Payment Entry ${paymentEntryName} successfully submitted!`);

  // 5. Verification
  const peVerifyRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`, { headers });
  const peVerify = (await peVerifyRes.json()).data;
  console.log('Verified Payment Entry:', {
    name: peVerify.name,
    docstatus: peVerify.docstatus,
    posting_date: peVerify.posting_date,
    mode_of_payment: peVerify.mode_of_payment,
    paid_to: peVerify.paid_to,
    reference_no: peVerify.reference_no,
    paid_amount: peVerify.paid_amount
  });

  const invVerifyRes = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`, { headers });
  const invVerify = (await invVerifyRes.json()).data;
  console.log(`Verified Sales Invoice ${invoiceId}:`, {
    status: invVerify.status,
    outstanding_amount: invVerify.outstanding_amount,
    grand_total: invVerify.grand_total
  });
}

execute().catch(err => {
  console.error('Execution Error:', err);
  process.exit(1);
});

