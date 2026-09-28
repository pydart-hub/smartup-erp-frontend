const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const students = ['STU-SU CHL-26-305', 'STU-SU THP-26-141', 'STU-SU ERV-26-274', 'STU-SU CHL-26-165'];
  for (const s of students) {
    const sRes = await fetch(`${baseUrl}/api/resource/Student/${s}`, { headers });
    const sData = (await sRes.json()).data;
    console.log(`\n========================================`);
    console.log(`Student: ${sData.name} (${sData.student_name})`);
    console.log(`Customer linked in Student DocType: "${sData.customer}"`);

    // SO by customer name
    const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order?filters=${encodeURIComponent(JSON.stringify([['customer_name', 'like', `%${sData.student_name}%`]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'customer', 'customer_name', 'docstatus', 'grand_total', 'status']))}`, { headers });
    const sos = (await soRes.json()).data || [];
    console.log('Sales Orders:', sos);

    // SI by customer name
    const siRes = await fetch(`${baseUrl}/api/resource/Sales%20Invoice?filters=${encodeURIComponent(JSON.stringify([['customer_name', 'like', `%${sData.student_name}%`]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'customer', 'customer_name', 'docstatus', 'grand_total', 'outstanding_amount']))}`, { headers });
    const sis = (await siRes.json()).data || [];
    console.log('Sales Invoices:', sis);
  }
}

checkDetails();
