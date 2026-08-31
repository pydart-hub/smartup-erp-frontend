const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-010';

async function verifyAll() {
  try {
    const invFilter = encodeURIComponent(JSON.stringify([["customer", "=", "Akmal a"], ["docstatus", "!=", 2]]));
    const resInv = await fetch(`${base}/Sales Invoice?filters=${invFilter}&fields=["name","due_date","grand_total","outstanding_amount","status","amended_from"]&order_by=due_date asc`, { headers });
    const invData = await resInv.json();
    console.log('Active Invoices:', JSON.stringify(invData.data, null, 2));

    const resStud = await fetch(`${base}/Student/${studentId}`, { headers });
    const studData = await resStud.json();
    console.log('Student Sibling Discount Applied:', studData.data.custom_sibling_discount_applied);
  } catch (e) {
    console.error(e);
  }
}

verifyAll();
