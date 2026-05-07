const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

async function get(path) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  return res.json();
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
  const PE_NAME = "PEN-10th--056";

  // Step 1: Fix the student_batch_name to the correct Thopumpadi batch
  console.log("Step 1: Fixing student_batch_name to 'Thopumpadi 26-27'...");
  const updateRes = await put("Program Enrollment", PE_NAME, {
    student_batch_name: "Thopumpadi 26-27",
  });
  if (updateRes.exc || updateRes.exc_type) {
    console.error("Update failed:", updateRes.exc || updateRes.message);
    return;
  }
  console.log("  Updated. New batch:", updateRes.data?.student_batch_name);

  // Step 2: Fetch latest doc then submit (avoid timestamp mismatch)
  console.log("\nStep 2: Submitting PE...");
  const latestDoc = (await get(`resource/Program%20Enrollment/${PE_NAME}`)).data;
  const submitRes = await post("frappe.client.submit", { doc: latestDoc });
  if (submitRes.exc || submitRes.exc_type) {
    console.error("Submit failed:", submitRes.exc_type, submitRes.message?.slice(0, 500) || submitRes._server_messages?.slice(0, 500));
    
    // Show what CEs were attempted
    console.log("\nChecking what CEs exist now:");
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "course", "program_enrollment", "creation"]),
      filters: JSON.stringify([["name", "like", "%-Thopumpadi 26-27-056"]]),
      limit_page_length: "50",
    });
    const ces = (await get(`resource/Course Enrollment?${params}`)).data ?? [];
    console.log(`CEs matching *-Thopumpadi 26-27-056 (${ces.length}):`, ces.map(c => c.name));
    return;
  }

  console.log("  Submit SUCCESS!");
  console.log("  docstatus:", submitRes.data?.docstatus);

  // Step 3: Verify
  const pe = (await get(`resource/Program%20Enrollment/${PE_NAME}`)).data;
  console.log("\nFinal PE state:");
  console.log("  docstatus:", pe.docstatus, "(1 = submitted)");
  console.log("  student_batch_name:", pe.student_batch_name);

  // Step 4: Show created CEs
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "course", "program_enrollment"]),
    filters: JSON.stringify([["program_enrollment", "=", PE_NAME]]),
    limit_page_length: "50",
  });
  const ces = (await get(`resource/Course Enrollment?${params}`)).data ?? [];
  console.log(`\nCourse Enrollments created (${ces.length}):`);
  for (const ce of ces) console.log(`  ${ce.name} | course: ${ce.course}`);
}

main().catch(console.error);
