const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function checkStudentSiblings() {
  try {
    const res = await fetch(`${base}/Student/STU-SU THP-26-010`, { headers });
    const data = await res.json();
    console.log('Sibling fields on Student:', {
      custom_sibling_of: data.data.custom_sibling_of,
      custom_sibling_group: data.data.custom_sibling_group,
      custom_sibling_discount_applied: data.data.custom_sibling_discount_applied,
      custom_discount_applied: data.data.custom_discount_applied,
      custom_discount_type: data.data.custom_discount_type
    });
  } catch (e) {
    console.error(e);
  }
}

checkStudentSiblings();
