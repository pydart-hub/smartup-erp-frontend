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

async function executeInvoicesAndPayments() {
  const customerName = 'ALRIA MARY XAVIER';
  const studentId = 'STU-SU MMK-26-057';
  const newSoName = 'SAL-ORD-2026-01130-1';
  const soDetail = '4kski2do5s';

  console.log('Step 4: Create remaining 7 Sales Invoices (Inst 2 to 8)...');
  // Inst 1 is already created: ACC-SINV-2026-14035
  const createdInvoices = [
    { name: 'ACC-SINV-2026-14035', due_date: '2026-06-01', grand_total: 1900 }
  ];

  const schedule = [
    { due: '2026-07-01', rate: 1900 },
    { due: '2026-08-01', rate: 1900 },
    { due: '2026-09-01', rate: 1900 },
    { due: '2026-10-01', rate: 1900 },
    { due: '2026-11-01', rate: 1900 },
    { due: '2026-12-01', rate: 1900 },
    { due: '2027-01-01', rate: 1700 },
  ];

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'alriamaryxavier.summk.057@dummy.com',
      company: 'Smart Up Moolamkuzhi',
      custom_academic_year: '2026-2027',
      posting_date: '2026-06-01',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU MMK',
      docstatus: 1,
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
          qty: 1,
          rate: item.rate,
          income_account: 'Sales - SU MMK',
          sales_order: newSoName,
          so_detail: soDetail
        }
      ]
    };

    const invRes = await fetch(frappeUrl + '/api/resource/Sales Invoice', {
      method: 'POST',
      headers,
      body: JSON.stringify(newInvDoc)
    });
    const invData = (await invRes.json()).data;
    createdInvoices.push(invData);
    console.log(`Created Inst ${i + 2}: ${invData.name} due: ${invData.due_date} amount: ${invData.grand_total}`);
  }

  console.log('Step 5: Re-create 3 Payment Entries with EXACT dates, modes, and amounts...');
  const pe1Old = (await (await fetch(frappeUrl + '/api/resource/Payment Entry/ACC-PAY-2026-05264', { headers })).json()).data;
  const pe2Old = (await (await fetch(frappeUrl + '/api/resource/Payment Entry/ACC-PAY-2026-08643', { headers })).json()).data;
  const pe3Old = (await (await fetch(frappeUrl + '/api/resource/Payment Entry/ACC-PAY-2026-08644', { headers })).json()).data;

  // Payment 1: ACC-PAY-2026-05264 (3000 Cash, 2026-06-01) -> 1900 to Inst 1, 1100 to Inst 2
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-05264',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-06-01
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 3000,
    received_amount: 3000,
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
        allocated_amount: 1100
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', pe1Res.data?.name, 'Date:', pe1Res.data?.posting_date, 'Paid:', pe1Res.data?.paid_amount);

  // Payment 2: ACC-PAY-2026-08643 (2900 Bank Transfer, 2026-09-10) -> 800 to Inst 2, 1900 to Inst 3, 200 to Inst 4
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08643',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-09-10
    mode_of_payment: pe2Old.mode_of_payment, // Bank Transfer
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 2900,
    received_amount: 2900,
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
        outstanding_amount: 800,
        allocated_amount: 800
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1900
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 200
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', pe2Res.data?.name, 'Date:', pe2Res.data?.posting_date, 'Paid:', pe2Res.data?.paid_amount);

  // Payment 3: ACC-PAY-2026-08644 (1100 Bank Transfer, 2026-09-10) -> 1100 to Inst 4
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08644',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date, // 2026-09-10
    mode_of_payment: pe3Old.mode_of_payment, // Bank Transfer
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 1100,
    received_amount: 1100,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1700,
        allocated_amount: 1100
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log('Created PE 3:', pe3Res.data?.name, 'Date:', pe3Res.data?.posting_date, 'Paid:', pe3Res.data?.paid_amount);

  console.log('=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSoName],
    ['docstatus', '=', '1']
  ];
  const url = frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

executeInvoicesAndPayments().catch(console.error);
