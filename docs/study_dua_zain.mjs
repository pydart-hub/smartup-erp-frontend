import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function searchStudent() {
  try {
    // 1. Search student by SRR 002 or name Dua zain or Edappally
    console.log('--- Search by SRR 002 or Dua ---');
    const filter1 = encodeURIComponent(JSON.stringify([
      ["custom_branch", "like", "%Edappally%"],
      ["custom_srr_id", "=", "002"]
    ]));
    const res1 = await fetch(`${base}/Student?filters=${filter1}&fields=["*"]`, { headers });
    const students1 = await res1.json();
    console.log('Filter by SRR 002 & Edappally:', students1.data);

    const filter2 = encodeURIComponent(JSON.stringify([
      ["student_name", "like", "%Dua%"]
    ]));
    const res2 = await fetch(`${base}/Student?filters=${filter2}&fields=["*"]`, { headers });
    const students2 = await res2.json();
    console.log('Filter by name Dua:', students2.data?.map(s => ({
      name: s.name,
      student_name: s.student_name,
      custom_srr_id: s.custom_srr_id,
      custom_branch: s.custom_branch,
      customer: s.customer
    })));

    const student = (students1.data && students1.data[0]) || (students2.data && students2.data.find(s => s.custom_branch?.includes('Edappally') || s.custom_srr_id === '002'));

    if (student) {
      const studentId = student.name;
      console.log('Found Student:', studentId, student.student_name, student.customer);

      // Program Enrollment
      const peFilter = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
      const resPE = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["*"]`, { headers });
      const pes = await resPE.json();

      // Sales Invoices
      const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", student.customer]]));
      const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["*"]&order_by=due_date asc`, { headers });
      const invs = await resInv.json();

      const fullInvoices = [];
      for (const inv of invs.data || []) {
        const r = await fetch(`${base}/Sales Invoice/${inv.name}`, { headers });
        fullInvoices.push((await r.json()).data);
      }

      // Payments
      const payFilter = encodeURIComponent(JSON.stringify([["party", "=", student.customer]]));
      const resPay = await fetch(`${base}/Payment Entry?filters=${payFilter}&fields=["*"]&order_by=posting_date asc`, { headers });
      const pays = await resPay.json();

      const fullPayments = [];
      for (const pay of pays.data || []) {
        const r = await fetch(`${base}/Payment Entry/${pay.name}`, { headers });
        fullPayments.push((await r.json()).data);
      }

      // Fee Structures for 10th CBSE at Edappally with 28400
      const fsFilter = encodeURIComponent(JSON.stringify([
        ["program", "like", "%10th%"],
        ["custom_branch_abbr", "like", "%EDP%"]
      ]));
      const resFS = await fetch(`${base}/Fee Structure?filters=${fsFilter}&fields=["*"]`, { headers });
      const fsList = await resFS.json();

      const result = {
        student,
        programEnrollments: pes.data,
        invoices: fullInvoices,
        payments: fullPayments,
        feeStructures: fsList.data
      };

      fs.writeFileSync('docs/dua_zain_study.json', JSON.stringify(result, null, 2));
      console.log('Saved to docs/dua_zain_study.json');
    } else {
      console.log('Student not found with filters.');
    }
  } catch (e) {
    console.error(e);
  }
}

searchStudent();
