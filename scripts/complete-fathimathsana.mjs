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

async function completeConversion() {
  const customerName = 'FATHIMATHSANA K A';
  const studentId = 'STU-SU ERV-26-001';
  const soName = 'SAL-ORD-2026-00114-1';
  const soDetail = 'a9kstb02u9';

  console.log('=== Step 1: Creating 6 new Sales Invoices linked to SAL-ORD-2026-00114-1 ===');
  const schedule = [
    { due: '2026-04-15', rate: 3300 },
    { due: '2026-05-15', rate: 3300 },
    { due: '2026-06-15', rate: 3300 },
    { due: '2026-07-15', rate: 3300 },
    { due: '2026-08-15', rate: 3300 },
    { due: '2026-09-15', rate: 3000 }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'fathimathsana.dummy@gmail.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-03-24',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU ERV',
      docstatus: 1,
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
          qty: 1,
          rate: item.rate,
          income_account: 'Sales - SU ERV',
          cost_center: 'Main - SU ERV',
          sales_order: soName,
          so_detail: soDetail
        }
      ]
    };

    const invRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newInvDoc)
    });
    const invData = await invRes.json();
    if (invData.exc) {
      throw new Error(`Failed to create invoice ${i + 1}: ${JSON.stringify(invData)}`);
    }
    createdInvoices.push(invData.data);
    console.log(`Created Inst ${i + 1}: ${invData.data.name} | Due: ${invData.data.due_date} | Amount: ₹${invData.data.grand_total}`);
  }

  console.log('\n=== Step 2: Fetching old PE data for re-creation ===');
  const peList = [
    'ACC-PAY-2026-03917',
    'ACC-PAY-2026-05152',
    'ACC-PAY-2026-05772',
    'ACC-PAY-2026-06637',
    'ACC-PAY-2026-06638',
    'ACC-PAY-2026-07849',
    'ACC-PAY-2026-07850',
    'ACC-PAY-2026-08308',
    'ACC-PAY-2026-08309'
  ];

  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
    oldPeDocs[peName] = res.data;
  }

  console.log('\n=== Step 3: Re-creating 9 Payment Entries with exact date, mode, ref, and amounts ===');

  const allocations = [
    { pe: 'ACC-PAY-2026-03917', invIdx: 0, out: 3300, alloc: 3300 },
    { pe: 'ACC-PAY-2026-05152', invIdx: 1, out: 3300, alloc: 3300 },
    { pe: 'ACC-PAY-2026-05772', invIdx: 2, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-06637', invIdx: 2, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-06638', invIdx: 3, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-07849', invIdx: 3, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-07850', invIdx: 4, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-08308', invIdx: 4, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-08309', invIdx: 5, out: 3000, alloc: 3000 }
  ];

  for (const item of allocations) {
    const oldPe = oldPeDocs[item.pe];
    const targetInv = createdInvoices[item.invIdx];
    const peDoc = {
      doctype: 'Payment Entry',
      amended_from: oldPe.name,
      payment_type: oldPe.payment_type,
      posting_date: oldPe.posting_date,
      mode_of_payment: oldPe.mode_of_payment,
      company: oldPe.company,
      party_type: oldPe.party_type,
      party: oldPe.party,
      paid_from: oldPe.paid_from,
      paid_to: oldPe.paid_to,
      paid_amount: item.alloc,
      received_amount: item.alloc,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: oldPe.reference_no,
      reference_date: oldPe.reference_date,
      remarks: oldPe.remarks,
      docstatus: 1,
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: targetInv.name,
          due_date: targetInv.due_date,
          total_amount: targetInv.grand_total,
          outstanding_amount: item.out,
          allocated_amount: item.alloc
        }
      ]
    };

    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(peDoc)
    })).json();

    if (res.exc) {
      throw new Error(`Failed to create PE from ${item.pe}: ${JSON.stringify(res)}`);
    }
    console.log(`Created PE from ${item.pe} -> ${res.data?.name} | Date: ${res.data?.posting_date} | Mode: ${res.data?.mode_of_payment} | Paid: ₹${res.data?.paid_amount} | Alloc to ${targetInv.name}`);
  }

  console.log('\n=== Step 4: Verifying final state ===');
  const checkFilters = [
    ['customer', '=', customerName],
    ['docstatus', '=', '1']
  ];
  const url = `${frappeUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify(checkFilters))}&fields=${encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status']))}&order_by=due_date asc`;
  const checkRes = await (await fetch(url, { headers })).json();

  let totGrand = 0, totOut = 0;
  console.log('\nActive Invoices:');
  checkRes.data?.forEach((si, i) => {
    totGrand += si.grand_total;
    totOut += si.outstanding_amount;
    console.log(`Inst ${i + 1}: ${si.name} | Due: ${si.due_date} | Amount: ₹${si.grand_total} | Out: ₹${si.outstanding_amount} | Status: ${si.status}`);
  });
  console.log(`Total Invoiced: ₹${totGrand} (Expected: ₹19500)`);
  console.log(`Total Outstanding: ₹${totOut} (Expected: ₹0)`);

  const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  console.log('\nActive Payment Entries:');
  for (const pe of peRes.data || []) {
    totPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Total Paid: ₹${totPaid} (Expected: ₹19500)`);
  console.log('\nALL STEPS COMPLETED SUCCESSFULLY!');
}

completeConversion().catch(err => {
  console.error('\nEXECUTION ERROR:', err);
  process.exit(1);
});

