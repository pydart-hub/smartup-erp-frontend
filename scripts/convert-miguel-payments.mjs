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

async function executePaymentsOnly() {
  const customerName = 'MIGUEL JOSEPH';

  const createdInvoices = [
    { name: 'ACC-SINV-2026-14051', due_date: '2026-06-04' },
    { name: 'ACC-SINV-2026-14052', due_date: '2026-07-04' },
    { name: 'ACC-SINV-2026-14053', due_date: '2026-08-04' },
    { name: 'ACC-SINV-2026-14054', due_date: '2026-09-04' },
    { name: 'ACC-SINV-2026-14055', due_date: '2026-10-04' },
    { name: 'ACC-SINV-2026-14056', due_date: '2026-11-04' },
    { name: 'ACC-SINV-2026-14057', due_date: '2026-12-04' },
    { name: 'ACC-SINV-2026-14058', due_date: '2027-01-04' },
  ];

  const peList = ['ACC-PAY-2026-05511', 'ACC-PAY-2026-06572-1', 'ACC-PAY-2026-06573-1', 'ACC-PAY-2026-08423', 'ACC-PAY-2026-08424'];
  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), { headers })).json();
    oldPeDocs[peName] = res.data;
  }

  // Payment 1: ACC-PAY-2026-05511 (2500 Cash, 2026-06-04) -> 1900 to Inst 1, 600 to Inst 2
  const pe1Old = oldPeDocs['ACC-PAY-2026-05511'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-05511',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-06-04
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 2500,
    received_amount: 2500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no,
    reference_date: pe1Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1900
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 600
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', pe1Res.data?.name, 'Date:', pe1Res.data?.posting_date, 'Paid:', pe1Res.data?.paid_amount);

  // Payment 2: ACC-PAY-2026-06572-1 (500 Bank Transfer, 2026-07-04) -> 500 to Inst 2
  const pe2Old = oldPeDocs['ACC-PAY-2026-06572-1'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06572-1',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-07-04
    mode_of_payment: pe2Old.mode_of_payment, // Bank Transfer
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 1300,
        allocated_amount: 500
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', pe2Res.data?.name, 'Date:', pe2Res.data?.posting_date, 'Paid:', pe2Res.data?.paid_amount);

  // Payment 3: ACC-PAY-2026-06573-1 (2500 Bank Transfer, 2026-07-04) -> 800 to Inst 2, 1700 to Inst 3
  const pe3Old = oldPeDocs['ACC-PAY-2026-06573-1'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06573-1',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date, // 2026-07-04
    mode_of_payment: pe3Old.mode_of_payment, // Bank Transfer
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 2500,
    received_amount: 2500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 800,
        allocated_amount: 800
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1700
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log('Created PE 3:', pe3Res.data?.name, 'Date:', pe3Res.data?.posting_date, 'Paid:', pe3Res.data?.paid_amount);

  // Payment 4: ACC-PAY-2026-08423 (500 Cash, 2026-09-05) -> 200 to Inst 3, 300 to Inst 4
  const pe4Old = oldPeDocs['ACC-PAY-2026-08423'];
  const pe4Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08423',
    payment_type: pe4Old.payment_type,
    posting_date: pe4Old.posting_date, // 2026-09-05
    mode_of_payment: pe4Old.mode_of_payment, // Cash
    company: pe4Old.company,
    party_type: pe4Old.party_type,
    party: pe4Old.party,
    paid_from: pe4Old.paid_from,
    paid_to: pe4Old.paid_to,
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe4Old.reference_no,
    reference_date: pe4Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 200,
        allocated_amount: 200
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 300
      }
    ]
  };
  const pe4Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe4Doc) })).json();
  console.log('Created PE 4:', pe4Res.data?.name, 'Date:', pe4Res.data?.posting_date, 'Paid:', pe4Res.data?.paid_amount);

  // Payment 5: ACC-PAY-2026-08424 (2000 Cash, 2026-09-05) -> 1600 to Inst 4, 400 to Inst 5
  const pe5Old = oldPeDocs['ACC-PAY-2026-08424'];
  const pe5Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08424',
    payment_type: pe5Old.payment_type,
    posting_date: pe5Old.posting_date, // 2026-09-05
    mode_of_payment: pe5Old.mode_of_payment, // Cash
    company: pe5Old.company,
    party_type: pe5Old.party_type,
    party: pe5Old.party,
    paid_from: pe5Old.paid_from,
    paid_to: pe5Old.paid_to,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe5Old.reference_no,
    reference_date: pe5Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1600,
        allocated_amount: 1600
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 400
      }
    ]
  };
  const pe5Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe5Doc) })).json();
  console.log('Created PE 5:', pe5Res.data?.name, 'Date:', pe5Res.data?.posting_date, 'Paid:', pe5Res.data?.paid_amount);

  console.log('=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', 'SAL-ORD-2026-01264-1'],
    ['docstatus', '=', '1']
  ];
  const url = frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

executePaymentsOnly().catch(console.error);
