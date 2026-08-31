const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function checkSampleInvoices() {
  try {
    // Check Kripa (Basic-6)
    const resKripa = await fetch(`${base}/Sales Invoice?filters=[["student","=","STU-SU THP-26-015"],["docstatus","!=",2]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers });
    const kripaInvs = await resKripa.json();
    console.log('Kripa (Basic-6) Invoices:', kripaInvs.data);

    // Check Sridhin / Maria (Basic-8)
    const resBasic8 = await fetch(`${base}/Sales Invoice?filters=[["student","=","STU-SU THP-26-001"],["docstatus","!=",2]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers });
    const basic8Invs = await resBasic8.json();
    console.log('Maria (Basic-8) Invoices:', basic8Invs.data);
  } catch (e) {
    console.error(e);
  }
}

checkSampleInvoices();
