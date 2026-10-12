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

async function inspect() {
  const studentId = 'STU-SU ERV-26-011';
  const studentRes = await (await fetch(frappeUrl + '/api/resource/Student/' + encodeURIComponent(studentId), { headers })).json();
  console.log('--- STUDENT ---');
  console.log(JSON.stringify(studentRes.data, null, 2));

  const customer = studentRes.data?.customer || 'RIZA FATHIMA M R';

  console.log('--- SALES ORDERS ---');
  const soRes = await (await fetch(frappeUrl + '/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['student', '=', studentId]])), { headers })).json();
  console.log(JSON.stringify(soRes.data, null, 2));

  if (soRes.data && soRes.data.length > 0) {
    for (const so of soRes.data) {
      const singleSo = await (await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(so.name), { headers })).json();
      console.log('SO DETAILS:', singleSo.data.name, 'docstatus:', singleSo.data.docstatus, 'grand_total:', singleSo.data.grand_total);
      console.log('Items:', JSON.stringify(singleSo.data.items, null, 2));
      console.log('Payment Schedule:', JSON.stringify(singleSo.data.payment_schedule, null, 2));
    }
  }

  console.log('--- SALES INVOICES ---');
  const sinvRes = await (await fetch(frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([['student', '=', studentId]])), { headers })).json();
  console.log(JSON.stringify(sinvRes.data, null, 2));
  if (sinvRes.data && sinvRes.data.length > 0) {
    for (const sinv of sinvRes.data) {
      const singleSinv = await (await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinv.name), { headers })).json();
      console.log('SINV DETAILS:', singleSinv.data.name, 'docstatus:', singleSinv.data.docstatus, 'posting_date:', singleSinv.data.posting_date, 'grand_total:', singleSinv.data.grand_total, 'outstanding_amount:', singleSinv.data.outstanding_amount);
    }
  }

  console.log('--- PAYMENT ENTRIES ---');
  const peRes = await (await fetch(frappeUrl + '/api/resource/Payment Entry?filters=' + encodeURIComponent(JSON.stringify([['party', '=', customer]])), { headers })).json();
  console.log(JSON.stringify(peRes.data, null, 2));
  if (peRes.data && peRes.data.length > 0) {
    for (const pe of peRes.data) {
      const singlePe = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(pe.name), { headers })).json();
      console.log('PE DETAILS:', singlePe.data.name, 'docstatus:', singlePe.data.docstatus, 'posting_date:', singlePe.data.posting_date, 'mode_of_payment:', singlePe.data.mode_of_payment, 'paid_amount:', singlePe.data.paid_amount, 'references:', JSON.stringify(singlePe.data.references, null, 2));
    }
  }
}

inspect();
