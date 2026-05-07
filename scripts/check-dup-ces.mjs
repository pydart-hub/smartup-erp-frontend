const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

async function get(path) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  return (await res.json());
}

async function main() {
  // 1. Get the draft PE doc
  const pe = (await get("resource/Program%20Enrollment/PEN-10th--056")).data;
  console.log("=== PE PEN-10th--056 ===");
  console.log("docstatus:", pe.docstatus);
  console.log("student:", pe.student);
  console.log("program:", pe.program);
  console.log("courses child rows:", (pe.courses || []).length);
  for (const c of pe.courses || []) {
    console.log("  course:", c.course, "| name:", c.name);
  }

  // 2. All CEs linked to this PE
  const params1 = new URLSearchParams({
    fields: JSON.stringify(["name", "course", "student", "program_enrollment", "creation"]),
    filters: JSON.stringify([["program_enrollment", "=", "PEN-10th--056"]]),
    limit_page_length: "100",
  });
  const ces1 = (await get(`resource/Course Enrollment?${params1}`)).data ?? [];
  console.log(`\nCourse Enrollments linked to PEN-10th--056 (${ces1.length}):`);
  for (const ce of ces1) {
    console.log(`  ${ce.name} | course: ${ce.course} | created: ${ce.creation}`);
  }

  // 3. All CEs matching *-056 pattern (any PE)
  const params2 = new URLSearchParams({
    fields: JSON.stringify(["name", "course", "student", "program_enrollment", "creation"]),
    filters: JSON.stringify([["name", "like", "%-056"]]),
    limit_page_length: "200",
  });
  const ces2 = (await get(`resource/Course Enrollment?${params2}`)).data ?? [];
  console.log(`\nAll CEs matching *-056 (${ces2.length}):`);
  for (const ce of ces2) {
    console.log(`  ${ce.name} | course: ${ce.course} | PE: ${ce.program_enrollment} | created: ${ce.creation}`);
  }

  // 4. Check for any CEs for this student (STU-SU THP-26-056)
  const params3 = new URLSearchParams({
    fields: JSON.stringify(["name", "course", "student", "program_enrollment", "creation"]),
    filters: JSON.stringify([["student", "=", "STU-SU THP-26-056"]]),
    limit_page_length: "200",
  });
  const ces3 = (await get(`resource/Course Enrollment?${params3}`)).data ?? [];
  console.log(`\nAll CEs for student STU-SU THP-26-056 (${ces3.length}):`);
  for (const ce of ces3) {
    console.log(`  ${ce.name} | course: ${ce.course} | PE: ${ce.program_enrollment} | created: ${ce.creation}`);
  }
}

main().catch(console.error);
