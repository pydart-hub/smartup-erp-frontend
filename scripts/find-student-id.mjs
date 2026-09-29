const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function findStudent() {
  // Let's search using frappe.client.get_value or get_list via method
  // Let's test with method frappe.desk.reportview.get
  const res = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      doctype: 'Student',
      fields: ['name', 'student_name', 'first_name', 'last_name', 'custom_registration_no', 'custom_branch', 'custom_course', 'custom_batch'],
      filters: [['Student', 'student_name', 'like', '%REICHAL%']]
    })
  });
  console.log('Reportview get student:', await res.json());

  // Also search with reg no 089
  const res2 = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      doctype: 'Student',
      fields: ['name', 'student_name', 'first_name', 'last_name', 'custom_registration_no', 'custom_branch', 'custom_course', 'custom_batch'],
      filters: [['Student', 'name', 'like', '%089%']]
    })
  });
  console.log('Reportview get student 089 in name:', await res2.json());

  // Try direct get of STU-SU CHL-26-089 or similar
  const potentialIds = [
    'STU-SU CHL-26-089',
    'STU-SU CHL-26-89',
    'STU-SU CHL-26-0089',
    'SRR 089',
    'SRR-089'
  ];
  for (const id of potentialIds) {
    let r = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(id)}`, { headers });
    let d = await r.json();
    if (d.data) {
      console.log(`FOUND student with ID ${id}:`, d.data.name, d.data.student_name, d.data.custom_registration_no);
    }
  }
}

findStudent().catch(console.error);
