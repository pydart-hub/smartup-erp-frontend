const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function main() {
  console.log('--- Resuming Fee Conversion for AVINAND KRISHNA K A ---');

  const newSoName = 'SAL-ORD-2026-00779-1';
  const customer = 'AVINAND KRISHNA K A';
  const studentId = 'STU-SU MMK-26-047';
  const company = 'Smart Up Moolamkuzhi';

  const refetchedSoRes = await fetch(`${base}/api/resource/Sales Order/${newSoName}`, { headers });
  const refetchedSo = (await refetchedSoRes.json()).data;
  const soDetailName = refetchedSo.items[0].name;
  console.log(`SO Item Detail Name: ${soDetailName}`);

  // Installments definition
  const installments = [
    { num: 1, amount: 3000, due_date: '2026-04-30', posting_date: '2026-04-30' },
    { num: 2, amount: 3000, due_date: '2026-05-30', posting_date: '2026-04-30' },
    { num: 3, amount: 3000, due_date: '2026-06-30', posting_date: '2026-04-30' },
    { num: 4, amount: 2200, due_date: '2026-07-30', posting_date: '2026-04-30' },
    { num: 5, amount: 2200, due_date: '2026-08-30', posting_date: '2026-04-30' },
    { num: 6, amount: 2200, due_date: '2026-09-30', posting_date: '2026-04-30' },
    { num: 7, amount: 2200, due_date: '2026-10-30', posting_date: '2026-04-30' },
    { num: 8, amount: 1300, due_date: '2026-11-30', posting_date: '2026-04-30' },
  ];

  const createdInvoices = [];

  console.log('7. Creating and submitting 8 Sales Invoices...');
  for (const inst of installments) {
    const invDoc = {
      doctype: 'Sales Invoice',
      customer: customer,
      student: studentId,
      company: company,
      custom_academic_year: '2026-2027',
      posting_date: inst.posting_date,
      due_date: inst.due_date,
      set_posting_time: 1,
      posting_time: '00:00:00',
      debit_to: 'Debtors - SU MMK',
      docstatus: 1,
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          description: `Inst ${inst.num} — 10th State Tuition Fee`,
          qty: 1,
          rate: inst.amount,
          sales_order: newSoName,
          so_detail: soDetailName,
          income_account: 'Sales - SU MMK'
        }
      ]
    };

    const cInvRes = await fetch(`${base}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invDoc)
    });
    const cInvData = await cInvRes.json();
    if (!cInvRes.ok) {
      console.error(`Failed to create invoice ${inst.num}:`, JSON.stringify(cInvData, null, 2));
      return;
    }
    const invName = cInvData.data.name;
    console.log(`Submitted Inst ${inst.num}: ${invName} (₹${inst.amount}, Due: ${inst.due_date})`);
    createdInvoices.push({ ...inst, name: invName });
  }

  // 8. Re-create Payment Entries
  console.log('8. Re-creating Payment Entries...');

  // PE 1: ACC-PAY-2026-04703 (₹1,000 Cash, 2026-04-30)
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-04703',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: customer,
    company: company,
    posting_date: '2026-04-30',
    mode_of_payment: 'Cash',
    paid_from: 'Debtors - SU MMK',
    paid_to: 'Cash - SU MMK',
    paid_amount: 1000,
    received_amount: 1000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: 'CASH-1777558975087',
    reference_date: '2026-04-30',
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: createdInvoices[0].amount,
        outstanding_amount: createdInvoices[0].amount,
        allocated_amount: 1000
      }
    ]
  };

  const cPe1Res = await fetch(`${base}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe1Doc)
  });
  const cPe1Data = await cPe1Res.json();
  if (!cPe1Res.ok) {
    console.error('Failed to create PE1:', JSON.stringify(cPe1Data, null, 2));
    return;
  }
  const pe1NewName = cPe1Data.data.name;
  console.log(`Submitted amended PE1: ${pe1NewName} (₹1,000 on 2026-04-30)`);

  // PE 2: ACC-PAY-2026-04825 (₹3,000 Cash, 2026-05-06)
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-04825',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: customer,
    company: company,
    posting_date: '2026-05-06',
    mode_of_payment: 'Cash',
    paid_from: 'Debtors - SU MMK',
    paid_to: 'Cash - SU MMK',
    paid_amount: 3000,
    received_amount: 3000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: 'CASH-1778071888771',
    reference_date: '2026-05-06',
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: createdInvoices[0].amount,
        outstanding_amount: 2000,
        allocated_amount: 2000
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: createdInvoices[1].amount,
        outstanding_amount: createdInvoices[1].amount,
        allocated_amount: 1000
      }
    ]
  };

  const cPe2Res = await fetch(`${base}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe2Doc)
  });
  const cPe2Data = await cPe2Res.json();
  if (!cPe2Res.ok) {
    console.error('Failed to create PE2:', JSON.stringify(cPe2Data, null, 2));
    return;
  }
  const pe2NewName = cPe2Data.data.name;
  console.log(`Submitted amended PE2: ${pe2NewName} (₹3,000 on 2026-05-06)`);

  console.log('=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSoName],
    ['docstatus', '=', '1']
  ];
  const url = base + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

main().catch(console.error);
