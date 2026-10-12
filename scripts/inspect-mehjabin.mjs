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

async function inspectMehjabin() {
  const studentId = 'STU-SU ERV-26-043';
  const studentRes = await (await fetch(frappeUrl + '/api/resource/Student/' + encodeURIComponent(studentId), { headers })).json();
  console.log('--- STUDENT ---');
  console.log({
    name: studentRes.data.name,
    student_name: studentRes.data.student_name,
    customer: studentRes.data.customer,
    custom_branch: studentRes.data.custom_branch
  });

  const customer = studentRes.data?.customer || 'MEHJABIN NEHSWA';

  console.log('--- SALES ORDERS ---');
  const soRes = await (await fetch(frappeUrl + '/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['student', '=', studentId], ['docstatus', '=', 1]])), { headers })).json();
  console.log(soRes.data);
  for (const so of soRes.data) {
    const singleSo = await (await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(so.name), { headers })).json();
    console.log('SO:', singleSo.data.name, 'grand_total:', singleSo.data.grand_total);
    console.log('Items:', singleSo.data.items?.map(it => ({ item_code: it.item_code, qty: it.qty, rate: it.rate, amount: it.amount })));
    console.log('Payment Schedule:', singleSo.data.payment_schedule?.map(ps => ({ due_date: ps.due_date, payment_amount: ps.payment_amount })));
  }

  console.log('--- SALES INVOICES ---');
  const sinvRes = await (await fetch(frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([['student', '=', studentId], ['docstatus', '=', 1]])), { headers })).json();
  console.log('Count:', sinvRes.data?.length);
  const invoices = [];
  for (const sinv of sinvRes.data) {
    const singleSinv = await (await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinv.name), { headers })).json();
    invoices.push({
      name: singleSinv.data.name,
      posting_date: singleSinv.data.posting_date,
      due_date: singleSinv.data.due_date,
      grand_total: singleSinv.data.grand_total,
      outstanding_amount: singleSinv.data.outstanding_amount,
      status: singleSinv.data.status,
      description: singleSinv.data.items?.[0]?.description,
      custom_student_email: singleSinv.data.custom_student_email
    });
  }
  console.table(invoices);

  console.log('--- PAYMENT ENTRIES ---');
  const peRes = await (await fetch(frappeUrl + '/api/resource/Payment Entry?filters=' + encodeURIComponent(JSON.stringify([['party', '=', customer], ['docstatus', '=', 1]])), { headers })).json();
  const pes = [];
  for (const pe of peRes.data) {
    const singlePe = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(pe.name), { headers })).json();
    pes.push({
      name: singlePe.data.name,
      posting_date: singlePe.data.posting_date,
      mode_of_payment: singlePe.data.mode_of_payment,
      paid_amount: singlePe.data.paid_amount,
      reference_no: singlePe.data.reference_no,
      references: singlePe.data.references?.map(r => ({ ref: r.reference_name, allocated: r.allocated_amount }))
    });
  }
  console.table(pes.map(p => ({ name: p.name, date: p.posting_date, mode: p.mode_of_payment, paid: p.paid_amount, ref_no: p.reference_no })));
  console.log('Detailed references:', JSON.stringify(pes.map(p => ({ name: p.name, refs: p.references })), null, 2));

  const totalPaid = pes.reduce((acc, p) => acc + p.paid_amount, 0);
  console.log('TOTAL PAID:', totalPaid);
}

inspectMehjabin().catch(console.error);
