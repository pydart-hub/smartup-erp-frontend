const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function deepStudy() {
  console.log('=== SALES INVOICE ACC-SINV-2026-04053 ===');
  let invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04053`, { headers });
  let inv = await invRes.json();
  console.log('Invoice data:');
  console.log({
    name: inv.data.name,
    customer: inv.data.customer,
    student: inv.data.custom_student,
    student_name: inv.data.student_name,
    custom_branch: inv.data.custom_branch,
    custom_batch: inv.data.custom_batch,
    custom_academic_year: inv.data.custom_academic_year,
    posting_date: inv.data.posting_date,
    due_date: inv.data.due_date,
    total: inv.data.total,
    net_total: inv.data.net_total,
    grand_total: inv.data.grand_total,
    rounding_adjustment: inv.data.rounding_adjustment,
    rounded_total: inv.data.rounded_total,
    outstanding_amount: inv.data.outstanding_amount,
    docstatus: inv.data.docstatus,
    status: inv.data.status,
    taxes: inv.data.taxes,
    items: inv.data.items?.map(it => ({
      name: it.name,
      item_code: it.item_code,
      item_name: it.item_name,
      description: it.description,
      qty: it.qty,
      rate: it.rate,
      amount: it.amount,
      income_account: it.income_account,
      cost_center: it.cost_center
    }))
  });

  const studentId = inv.data.custom_student;
  if (studentId) {
    console.log(`\n=== STUDENT RECORD (${studentId}) ===`);
    let stRes = await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers });
    let st = await stRes.json();
    console.log('Student:', JSON.stringify(st.data, null, 2));
  }

  console.log(`\n=== PAYMENT ENTRIES LINKED TO INVOICE ===`);
  // Check Payment Entry Reference
  let perRes = await fetch(`${baseUrl}/api/resource/Payment Entry Reference?filters=[["reference_name","=","ACC-SINV-2026-04053"]]&fields=["name","parent","allocated_amount","total_amount","outstanding_amount"]`, { headers });
  let per = await perRes.json();
  console.log('Payment Entry References:', per);

  if (per.data && per.data.length > 0) {
    for (const ref of per.data) {
      let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry/${ref.parent}`, { headers });
      let pe = await peRes.json();
      console.log(`\nPayment Entry Details [${ref.parent}]:`, {
        name: pe.data.name,
        posting_date: pe.data.posting_date,
        mode_of_payment: pe.data.mode_of_payment,
        party: pe.data.party,
        paid_amount: pe.data.paid_amount,
        received_amount: pe.data.received_amount,
        paid_from: pe.data.paid_from,
        paid_to: pe.data.paid_to,
        status: pe.data.status,
        docstatus: pe.data.docstatus,
        references: pe.data.references?.map(r => ({
          reference_doctype: r.reference_doctype,
          reference_name: r.reference_name,
          total_amount: r.total_amount,
          outstanding_amount: r.outstanding_amount,
          allocated_amount: r.allocated_amount
        }))
      });
    }
  }

  // Also search payment entries with party = 'REICHAL DANY'
  let peByParty = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","REICHAL DANY"]]&fields=["name","posting_date","mode_of_payment","paid_amount","received_amount","docstatus","status"]`, { headers });
  console.log('\nPayment entries by party REICHAL DANY:', await peByParty.json());

  // Also search Sales Invoices for customer REICHAL DANY in general
  let allInvs = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","REICHAL DANY"]]&fields=["name","title","posting_date","grand_total","outstanding_amount","docstatus"]`, { headers });
  console.log('\nAll Sales Invoices for REICHAL DANY:', await allInvs.json());
}

deepStudy().catch(console.error);
