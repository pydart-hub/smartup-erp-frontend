const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = `token 03330270e330d49:9c2261ae11ac2d2`;

const STUDENTS = ["STU-SU KDV-26-004", "STU-SU KDV-26-006"];

async function frappeGet(resource, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(resource)}?${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${resource} ${res.status}: ${await res.text()}`);
  return (await res.json())?.data ?? [];
}

async function main() {
  console.log("Checking One-to-One markers for Kadavanthra N/A students\n");

  const studentRows = await frappeGet("Student", {
    fields: JSON.stringify([
      "name",
      "student_name",
      "custom_branch",
      "custom_student_type",
      "enabled",
    ]),
    filters: JSON.stringify([["name", "in", STUDENTS]]),
    limit_page_length: "0",
  });

  const enrollmentRows = await frappeGet("Program Enrollment", {
    fields: JSON.stringify([
      "name",
      "student",
      "student_category",
      "custom_plan",
      "enrollment_date",
      "docstatus",
    ]),
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["student", "in", STUDENTS],
    ]),
    order_by: "student, enrollment_date desc",
    limit_page_length: "0",
  });

  const latestByStudent = new Map();
  for (const row of enrollmentRows) {
    if (!latestByStudent.has(row.student)) latestByStudent.set(row.student, row);
  }

  for (const s of studentRows) {
    const e = latestByStudent.get(s.name);
    console.log(`Student: ${s.name} (${s.student_name})`);
    console.log(`  Student Type: ${s.custom_student_type || "(blank)"}`);
    if (!e) {
      console.log("  Enrollment: (none)");
    } else {
      console.log(`  Enrollment: ${e.name}`);
      console.log(`  Plan: ${e.custom_plan || "(blank)"}`);
      console.log(`  Category: ${e.student_category || "(blank)"}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
