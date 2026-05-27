// add-aayisha-inst2-2000-razorpay.mjs
// Record Rs.2000 Razorpay payment on AAYISHA ZEHAN's second installment invoice.

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

const CUSTOMER = 'AAYISHA ZEHAN';
const COMPANY = 'Smart Up Chullickal';
const INVOICE = 'ACC-SINV-2026-02504'; // 2nd installment
const AMOUNT = 2000;
const RAZORPAY_ID = 'pay_SsOzeT8kARTXdp';
const POSTING_DATE = '2026-05-25';

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} -> ${r.status}: ${t.slice(0, 500)}`);
  return t ? JSON.parse(t) : {};
}

async function getDoc(doctype, name) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)).data;
}

async function listDoctype(doctype, filters, fields, limit = 20) {
  const q = `${BASE}/api/resource/${encodeURIComponent(doctype)}?filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(fields))}&limit=${limit}`;
  return (await fetchJSON(q)).data || [];
}

async function postDoc(doctype, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })).data;
}

async function putDoc(doctype, name, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })).data;
}

async function main() {
  console.log('Checking existing payment by Razorpay ID...');
  const existing = await listDoctype(
    'Payment Entry',
    [['reference_no', '=', RAZORPAY_ID]],
    ['name', 'posting_date', 'paid_amount', 'party', 'docstatus'],
    5
  );

  if (existing.length > 0) {
    console.log('Payment with this Razorpay ID already exists. No action taken.');
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  const invBefore = await getDoc('Sales Invoice', INVOICE);
  console.log('Invoice before:', {
    name: invBefore.name,
    grand_total: invBefore.grand_total,
    outstanding_amount: invBefore.outstanding_amount,
    status: invBefore.status,
  });

  const pePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: AMOUNT,
    received_amount: AMOUNT,
    source_exchange_rate: 1,
    target_exchange_rate: 1,
    posting_date: POSTING_DATE,
    company: COMPANY,
    paid_from: 'Debtors - SU CHL',
    paid_to: 'Razorpay - SU CHL - SU CHL',
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    mode_of_payment: 'Razorpay',
    reference_no: RAZORPAY_ID,
    reference_date: POSTING_DATE,
    remarks: `Razorpay payment ${RAZORPAY_ID} - ${INVOICE} second installment`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: INVOICE,
        allocated_amount: AMOUNT,
      },
    ],
  };

  console.log('Creating Payment Entry...');
  const pe = await postDoc('Payment Entry', pePayload);
  console.log('Created draft PE:', pe.name);

  await putDoc('Payment Entry', pe.name, { docstatus: 1 });
  console.log('Submitted PE:', pe.name);

  const invAfter = await getDoc('Sales Invoice', INVOICE);
  const peAfter = await getDoc('Payment Entry', pe.name);

  console.log('\nDONE');
  console.log(JSON.stringify({
    payment_entry: {
      name: peAfter.name,
      posting_date: peAfter.posting_date,
      paid_amount: peAfter.paid_amount,
      mode_of_payment: peAfter.mode_of_payment,
      reference_no: peAfter.reference_no,
      docstatus: peAfter.docstatus,
      status: peAfter.status,
    },
    invoice_after: {
      name: invAfter.name,
      grand_total: invAfter.grand_total,
      outstanding_amount: invAfter.outstanding_amount,
      status: invAfter.status,
    },
  }, null, 2));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
