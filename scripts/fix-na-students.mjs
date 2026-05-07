/**
 * Fix investigation: details on the N/A students
 */
const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = `token 03330270e330d49:9c2261ae11ac2d2`;

async function frappeGet(resource, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(resource)}?${qs}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${resource} ${res.status}: ${await res.text()}`);
  return (await res.json())?.data ?? [];
}

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  return (await res.json())?.data;
}

async function main() {
  // Target students
  const targets = [
    "STU-SU CHL-26-181",  // Existing, PE.cat=Demo
    "STU-SU FKO-26-098",  // Fresher, PE.cat=Demo
    "STU-SU FKO-26-099",  // Fresher, PE.cat=Demo
    "STU-SU KDV-26-004",  // PE exists but no plan/cat
    "STU-SU KDV-26-006",  // PE exists but no plan/cat
  ];

  for (const id of targets) {
    console.log(`\n=== ${id} ===`);
    
    // Student info
    const stu = await getDoc("Student", id);
    console.log(`  Name: ${stu?.student_name}, Type: ${stu?.custom_student_type}, Branch: ${stu?.custom_branch}`);
    
    // All PEs for this student
    const pes = await frappeGet("Program Enrollment", {
      fields: JSON.stringify(["name", "program", "student_batch_name", "custom_plan", "student_category", "enrollment_date", "academic_year", "docstatus", "custom_fee_structure"]),
      filters: JSON.stringify([["student", "=", id]]),
      order_by: "enrollment_date desc",
      limit_page_length: "10",
    });
    console.log(`  All PEs (${pes.length}):`);
    for (const pe of pes) {
      console.log(`    [${pe.docstatus}] ${pe.name}: prog=${pe.program}, plan=${pe.custom_plan||"?"}, cat=${pe.student_category||"?"}, year=${pe.academic_year}, batch=${pe.student_batch_name||"?"}, fee=${pe.custom_fee_structure||"?"}`);
    }
  }

  // Also check what plans other students in same batch have (for reference)
  console.log("\n=== Reference: Kadavanthara active students with plans ===");
  const kdvStudents = await frappeGet("Student", {
    fields: JSON.stringify(["name", "custom_student_type"]),
    filters: JSON.stringify([["custom_branch", "=", "Smart Up Kadavanthara"], ["enabled", "=", 1]]),
    limit_page_length: "0",
  });
  const kdvIds = kdvStudents.map(s => s.name);
  const kdvPEs = await frappeGet("Program Enrollment", {
    fields: JSON.stringify(["student", "name", "custom_plan", "student_category", "enrollment_date", "docstatus"]),
    filters: JSON.stringify([["student", "in", kdvIds], ["docstatus", "=", 1]]),
    limit_page_length: "50",
  });
  console.log("  KDV submitted PEs:", kdvPEs.map(pe => `${pe.student}: plan=${pe.custom_plan||"?"}, cat=${pe.student_category||"?"}`));
}

main().catch(console.error);
