const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const auth = 'token 03330270e330d49:9c2261ae11ac2d2';

async function main() {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "student_name", "custom_branch", "enabled"]),
    filters: JSON.stringify([["custom_branch", "=", "Chullickal"], ["enabled", "=", 0]]),
    limit_page_length: "50",
  });
  const studentsRes = await fetch(`${FRAPPE_URL}/api/resource/Student?${params}`, { headers: { Authorization: auth } });
  const students = (await studentsRes.json()).data || [];
  console.log('Discontinued students in Chullickal count:', students.length);
  
  for (const s of students) {
    const peParams = new URLSearchParams({
      fields: JSON.stringify(["name", "student", "program", "docstatus", "enrollment_date"]),
      filters: JSON.stringify([["student", "=", s.name]]),
      order_by: "enrollment_date desc",
    });
    const peRes = await fetch(`${FRAPPE_URL}/api/resource/Program Enrollment?${peParams}`, { headers: { Authorization: auth } });
    const pes = (await peRes.json()).data || [];
    console.log(s.name, s.student_name, 'PEs count:', pes.length, pes);
  }
}
main().catch(console.error);
