import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';
const studentId = 'STU-SU THP-26-019';

async function analyze() {
  const studRes = await fetch(`${base}/Student/${studentId}`, { headers });
  const student = (await studRes.json()).data;

  const peFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
  const peRes = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["*"]`, { headers });
  const pe = (await peRes.json()).data;

  // Invoices
  const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", student.customer]]));
  const invRes = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]&order_by=due_date asc`, { headers });
  const invoices = (await invRes.json()).data;

  // Invoices deep (with items)
  const fullInvoices = [];
  for (const inv of invoices) {
    const r = await fetch(`${base}/Sales Invoice/${inv.name}`, { headers });
    fullInvoices.push((await r.json()).data);
  }

  // Payment Entries
  const payFilter = encodeURIComponent(JSON.stringify([["party", "=", student.customer]]));
  const payRes = await fetch(`${base}/Payment Entry?filters=${payFilter}&fields=["*"]&order_by=posting_date asc`, { headers });
  const payments = (await payRes.json()).data;

  // Payment entries deep (references)
  const fullPayments = [];
  for (const pay of payments) {
    const r = await fetch(`${base}/Payment Entry/${pay.name}`, { headers });
    fullPayments.push((await r.json()).data);
  }

  const result = {
    student,
    programEnrollments: pe,
    invoices: fullInvoices,
    payments: fullPayments
  };

  fs.writeFileSync('docs/henock_joseph_study.json', JSON.stringify(result, null, 2));
  console.log('Done saving to docs/henock_joseph_study.json');
}

analyze().catch(console.error);
