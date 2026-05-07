const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

async function get(path) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  return (await res.json());
}

async function put(doctype, name, data) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function post(method, data) {
  const res = await fetch(`${FRAPPE_URL}/api/method/${method}`, {
    method: "POST",
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function main() {
  // 1. Find Thopumpadi 10th State batches
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "student_group_name", "program", "batch", "custom_branch", "academic_year", "disabled"]),
    filters: JSON.stringify([["custom_branch", "=", "Smart Up Thopumpadi"], ["program", "=", "10th State"]]),
    limit_page_length: "20",
  });
  const batches = (await get(`resource/Student Group?${params}`)).data ?? [];
  console.log("Thopumpadi 10th State batches:");
  for (const b of batches) {
    console.log(`  ${b.name} | batch: ${b.batch} | year: ${b.academic_year} | disabled: ${b.disabled}`);
  }

  // 2. Also check all Thopumpadi batches
  const params2 = new URLSearchParams({
    fields: JSON.stringify(["name", "batch", "program", "academic_year", "disabled"]),
    filters: JSON.stringify([["custom_branch", "=", "Smart Up Thopumpadi"]]),
    limit_page_length: "50",
  });
  const allBatches = (await get(`resource/Student Group?${params2}`)).data ?? [];
  console.log("\nAll Thopumpadi batches:", allBatches.map(b => `${b.name} (${b.program}, ${b.batch})`));

  // 3. Current PE details
  const pe = (await get("resource/Program%20Enrollment/PEN-10th--056")).data;
  console.log("\nCurrent PE details:");
  console.log("  student_batch_name:", pe.student_batch_name);
  console.log("  custom_student_srr:", pe.custom_student_srr);
  console.log("  academic_year:", pe.academic_year);

  // 4. Check if THP 10th batch CEs -056 already exist
  const params3 = new URLSearchParams({
    fields: JSON.stringify(["name", "course", "creation"]),
    filters: JSON.stringify([["name", "like", "%-Thopumpadi 26-27-056"]]),
    limit_page_length: "50",
  });
  const thpCEs = (await get(`resource/Course Enrollment?${params3}`)).data ?? [];
  console.log(`\nExisting CEs matching *-Thopumpadi 26-27-056 (${thpCEs.length}):`, thpCEs.map(c => c.name));

  // 5. Find the right Thopumpadi batch for 10th (2026-2027)
  const thpBatch = allBatches.find(b => 
    !b.disabled && 
    b.academic_year === "2026-2027" &&
    (b.name.includes("Thopumpadi") || b.batch?.includes("Thopumpadi"))
  );
  console.log("\nSelected Thopumpadi batch for fix:", thpBatch?.name ?? "NOT FOUND");
}

main().catch(console.error);
