const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const auth = 'token 03330270e330d49:9c2261ae11ac2d2';

const discStudentIds = [
  'STU-SU CHL-26-086',
  'STU-SU CHL-26-112',
  'STU-SU CHL-26-173',
  'STU-SU CHL-26-230',
  'STU-SU CHL-26-247',
  'STU-SU CHL-26-272',
  'STU-SU CHL-26-276',
  'STU-SU CHL-26-289',
  'STU-SU CHL-26-299',
  'STU-SU CHL-26-308',
  'STU-SU CHL-26-310'
];

async function main() {
  for (const sid of discStudentIds) {
    const peParams = new URLSearchParams({
      fields: JSON.stringify(["name", "student", "program", "docstatus", "enrollment_date"]),
      filters: JSON.stringify([["student", "=", sid]]),
    });
    const peRes = await fetch(`${FRAPPE_URL}/api/resource/Program Enrollment?${peParams}`, { headers: { Authorization: auth } });
    const pes = (await peRes.json()).data || [];
    console.log(sid, 'PEs:', pes);
  }
}
main().catch(console.error);
