const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function inspectStudentAndPipeline() {
  const studentId = 'STU-SU CHL-26-200';

  console.log(`\n================ 1. Fetch Student: ${studentId} ================`);
  const sRes = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, { headers });
  const sDoc = (await sRes.json()).data || {};
  console.log("Student Doc:", JSON.stringify(sDoc, null, 2));

  console.log(`\n================ 2. Program Enrollment (PE) ================`);
  const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?filters=[["student","=","${studentId}"]]`, { headers });
  const peList = (await peRes.json()).data || [];
  console.log("PE records:", peList);

  console.log(`\n================ 3. Course Enrollment (CE) ================`);
  const ceRes = await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["student","=","${studentId}"]]`, { headers });
  const ceList = (await ceRes.json()).data || [];
  console.log("CE records:", ceList);

  console.log(`\n================ 4. Student Groups (Batches) ================`);
  const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?limit_page_length=200`, { headers });
  const allGroups = (await sgRes.json()).data || [];
  const foundGroups = [];
  for (const g of allGroups) {
    const gDoc = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(g.name)}`, { headers })).json();
    const st = (gDoc.data?.students || []).find(s => s.student === studentId);
    if (st) {
      foundGroups.push({ group: g.name, active: st.active, group_based_on: gDoc.data?.group_based_on, program: gDoc.data?.program });
    }
  }
  console.log("Group memberships:", foundGroups);

  console.log(`\n================ 5. Sales Order ================`);
  const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order/SAL-ORD-2026-00945`, { headers });
  const soDoc = (await soRes.json()).data || {};
  console.log("Sales Order:", {
    name: soDoc.name,
    customer: soDoc.customer,
    company: soDoc.company,
    status: soDoc.status,
    grand_total: soDoc.grand_total,
    items: soDoc.items?.map(it => ({ item_code: it.item_code, item_name: it.item_name, rate: it.rate, qty: it.qty }))
  });

  console.log(`\n================ 6. Sales Invoices & Payments ================`);
  const siList = ['ACC-SINV-2026-07128', 'ACC-SINV-2026-07129', 'ACC-SINV-2026-07130', 'ACC-SINV-2026-07131'];
  for (const siName of siList) {
    const siRes = await fetch(`${baseUrl}/api/resource/Sales%20Invoice/${encodeURIComponent(siName)}`, { headers });
    const si = (await siRes.json()).data || {};
    console.log(`Invoice ${si.name}: Grand Total = ₹${si.grand_total}, Outstanding = ₹${si.outstanding_amount}, Status = ${si.status}, Due Date = ${si.due_date}`);
  }

  const payList = ['ACC-PAY-2026-04898', 'ACC-PAY-2026-07719'];
  for (const pName of payList) {
    const pRes = await fetch(`${baseUrl}/api/resource/Payment%20Entry/${encodeURIComponent(pName)}`, { headers });
    const p = (await pRes.json()).data || {};
    console.log(`Payment ${p.name}: Paid Amount = ₹${p.paid_amount}, Date = ${p.posting_date}, Mode = ${p.mode_of_payment}, Status = ${p.status}`);
  }
}

inspectStudentAndPipeline();
