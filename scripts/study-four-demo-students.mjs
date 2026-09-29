const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDevdarshanAndNourah() {
  for (const name of ['Devdarshan', 'NOURAH JAMSHID', 'ARFIYA T A', 'VYSHNAVI JAYARAJ']) {
    console.log(`\n=================== ${name} ===================`);
    
    // Invoices
    const invParams = new URLSearchParams();
    invParams.append('doctype', 'Sales Invoice');
    invParams.append('fields', JSON.stringify(['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus']));
    invParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', name]]));
    invParams.append('order_by', 'due_date asc');

    const invRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: invParams.toString()
    })).json();

    console.log('Invoices:');
    let actInvs = 0, totGrand = 0, totOut = 0;
    for (const row of invRes.message?.values || []) {
      console.log(` - ${row[0]}: docstatus ${row[6]}, status ${row[5]}, due ${row[2]}, total ₹${row[3]}, out ₹${row[4]}`);
      if (row[6] === 1) {
        actInvs++;
        totGrand += row[3];
        totOut += row[4];
      }
    }
    console.log(`Active Invoices: ${actInvs}, Grand Total: ₹${totGrand}, Outstanding: ₹${totOut}`);

    // Payments
    const peParams = new URLSearchParams();
    peParams.append('doctype', 'Payment Entry');
    peParams.append('fields', JSON.stringify(['name', 'posting_date', 'paid_amount', 'status', 'docstatus', 'remarks', 'reference_no']));
    peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', name]]));

    const peRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: peParams.toString()
    })).json();

    const peList = Array.isArray(peRes.message?.values) ? peRes.message.values : [];
    console.log('Payment Entries:');
    let actPe = 0, totPaid = 0;
    for (const row of peList) {
      console.log(` - ${row[0]}: docstatus ${row[4]}, amount ₹${row[2]}, date ${row[1]}, ref ${row[6]}`);
      if (row[4] === 1) {
        actPe++;
        totPaid += row[2];
      }
    }
    console.log(`Active Payments: ${actPe}, Total Paid: ₹${totPaid}`);

    // Sales Orders
    const soParams = new URLSearchParams();
    soParams.append('doctype', 'Sales Order');
    soParams.append('fields', JSON.stringify(['name', 'grand_total', 'status', 'docstatus', 'per_billed']));
    soParams.append('filters', JSON.stringify([['Sales Order', 'customer', '=', name]]));
    const soRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: soParams.toString()
    })).json();

    const soList = Array.isArray(soRes.message?.values) ? soRes.message.values : [];
    console.log('Sales Orders:');
    for (const row of soList) {
      console.log(` - ${row[0]}: docstatus ${row[3]}, grand ₹${row[1]}, status ${row[2]}, per_billed ${row[4]}%`);
    }
  }
}

checkDevdarshanAndNourah().catch(console.error);
