const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkStudents() {
  const students = [
    { name: 'REICHAL DANY', id: 'STU-SU CHL-26-089' },
    { name: 'REBECCA DANY', id: 'STU-SU CHL-26-088' },
    { name: 'RAHEL DANI', id: 'STU-SU CHL-26-090' },
    { name: 'RIZWANA S A', id: 'STU-SU CHL-26-030' },
    { name: 'ANN MARY', id: 'STU-SU CHL-26-009' },
    { name: 'ALAINA GODWIN', id: 'STU-SU CHL-26-111' },
    { name: 'MOHAMMED NAHAN NAJEEB', id: 'STU-SU CHL-26-160' },
    { name: 'JUVAIRIYA P M', id: 'STU-SU CHL-26-271' },
    { name: 'ABHIRAMI NS', id: 'STU-SU CHL-26-207' },
    { name: 'MOHAMMED ZAYAN V Z', id: 'STU-SU CHL-26-201' },
    { name: 'MANHA NASIM', id: 'STU-SU CHL-26-033' },
    { name: 'NOURAH JAMSHID', id: 'STU-SU CHL-26-333' },
    { name: 'Devdarshan', id: 'STU-SU CHL-26-303' },
    { name: 'ARFIYA T A', id: 'STU-SU CHL-26-334' },
    { name: 'VYSHNAVI JAYARAJ', id: 'STU-SU CHL-26-306' }
  ];

  for (const st of students) {
    const invParams = new URLSearchParams();
    invParams.append('doctype', 'Sales Invoice');
    invParams.append('fields', JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'due_date']));
    invParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', st.name], ['Sales Invoice', 'docstatus', '=', 1]]));
    const invRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: invParams.toString()
    })).json();

    const invs = invRes.message?.values || [];
    let totGrand = 0;
    let totOut = 0;
    let issues = [];

    for (const inv of invs) {
      const invName = inv[0];
      const grandTotal = inv[1];
      const outstanding = inv[2];
      const status = inv[3];
      totGrand += grandTotal;
      totOut += outstanding;

      // Check full invoice doc for payment_schedule
      const fullRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, { headers });
      const full = (await fullRes.json()).data;
      if (full && full.payment_schedule && full.payment_schedule.length > 0) {
        for (const ps of full.payment_schedule) {
          // If invoice is fully paid (outstanding == 0) but payment schedule row has outstanding > 0 or paid_amount == 0
          if (outstanding === 0 && (ps.outstanding > 0 || ps.paid_amount === 0)) {
            issues.push({ invName, grandTotal, outstanding, status, psPaid: ps.paid_amount, psOut: ps.outstanding });
          }
        }
      }
    }

    const soParams = new URLSearchParams();
    soParams.append('doctype', 'Sales Order');
    soParams.append('fields', JSON.stringify(['name', 'grand_total', 'status', 'per_billed', 'advance_paid']));
    soParams.append('filters', JSON.stringify([['Sales Order', 'customer', '=', st.name], ['Sales Order', 'docstatus', '=', 1]]));
    const soRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: soParams.toString()
    })).json();
    const sos = soRes.message?.values || [];

    const peParams = new URLSearchParams();
    peParams.append('doctype', 'Payment Entry');
    peParams.append('fields', JSON.stringify(['name', 'paid_amount', 'status']));
    peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', st.name], ['Payment Entry', 'docstatus', '=', 1]]));
    const peRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: peParams.toString()
    })).json();
    const pes = peRes.message?.values || [];
    let totPaid = pes.reduce((s, p) => s + p[1], 0);

    console.log(`\n======================================================`);
    console.log(`STUDENT: ${st.name} (${st.id})`);
    console.log(`- Active SOs: ${sos.length} | SO Grand Total: ₹${sos[0]?.[1] || 0} | per_billed: ${sos[0]?.[3]}%`);
    console.log(`- Active Invoices: ${invs.length} | Invoice Total: ₹${totGrand} | Outstanding: ₹${totOut}`);
    console.log(`- Active Payments: ${pes.length} | Total Paid: ₹${totPaid}`);
    if (issues.length > 0) {
      console.log(`⚠️ PAYMENT SCHEDULE MISMATCH IN INVOICES:`, issues);
    } else {
      console.log(`✅ Invoice payment schedule matches invoice status.`);
    }

    // Also check SO payment schedule
    if (sos[0]?.[0]) {
      const soFull = await (await fetch(`${baseUrl}/api/resource/Sales Order/${sos[0][0]}`, { headers })).json();
      const soPs = soFull.data?.payment_schedule || [];
      console.log(`- SO Payment Schedule Rows: ${soPs.length}`);
      for (const row of soPs) {
        console.log(`   due: ${row.due_date}, amount: ${row.payment_amount}, paid: ${row.paid_amount}, outstanding: ${row.outstanding}`);
      }
    }
  }
}

checkStudents().catch(console.error);
