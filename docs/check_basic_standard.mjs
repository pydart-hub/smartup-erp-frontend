const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function checkBasicStandardBreakdown() {
  try {
    // Check other 10th State Basic 4 or Basic 6 students in Thopumpadi to see exact invoice installment breakdown
    const invFilter = encodeURIComponent(JSON.stringify([
      ["company", "=", "Smart Up Thopumpadi"],
      ["custom_academic_year", "=", "2026-2027"]
    ]));
    // Check Akmal or other students for 10th state Basic 4
    const res = await fetch(`${base}/Sales Invoice?filters=[["student","=","STU-SU THP-26-010"]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers });
    const data = await res.json();
    console.log('10th State Basic 4 Invoices sample (Akmal):', data.data);

    // Let's also check if there are 10th State Basic 6 students
    const peFilter = encodeURIComponent(JSON.stringify([
      ["program", "=", "10th State"],
      ["student_batch_name", "like", "%Thopumpadi%"]
    ]));
    const resPE = await fetch(`${base}/Program Enrollment?filters=${peFilter}&fields=["name","student","student_name","custom_fee_structure","custom_plan","custom_no_of_instalments"]`, { headers });
    const peData = await resPE.json();
    console.log('All THP 10th State Enrollments:', peData.data);
  } catch (e) {
    console.error(e);
  }
}

checkBasicStandardBreakdown();
