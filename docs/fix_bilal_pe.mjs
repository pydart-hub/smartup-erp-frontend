import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const urlMatch = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/);
  const keyMatch = env.match(/FRAPPE_API_KEY=(.*)/);
  const secretMatch = env.match(/FRAPPE_API_SECRET=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : "";
  const key = keyMatch ? keyMatch[1].trim() : "";
  const secret = secretMatch ? secretMatch[1].trim() : "";
  const auth = `token ${key}:${secret}`;

  const headers = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  async function frappeGet(pathStr) {
    const res = await fetch(`${url}/api/${pathStr}`, { headers });
    return res.json();
  }

  async function frappePut(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function frappePost(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function frappeDelete(pathStr) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "DELETE",
      headers
    });
    return res.text();
  }

  const studentId = "STU-SU THP-26-103";
  const oldPEName = "PEN-12sc state-Thopumpadi 26-27-103";

  console.log("=== UPDATING PROGRAM ENROLLMENT FOR MOHAMMED BILAL ===");

  // 1. Get old PE doc
  const oldPE = await frappeGet(`resource/Program Enrollment/${encodeURIComponent(oldPEName)}`);
  console.log("Old PE Doc:", JSON.stringify(oldPE.data, null, 2));

  // 2. Get CEs for this PE
  const ceRes = await frappeGet(`resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([["program_enrollment", "=", oldPEName]]))}`);
  console.log("Course Enrollments:", JSON.stringify(ceRes.data, null, 2));

  // Cancel each CE and delete if needed
  if (ceRes.data) {
    for (const ce of ceRes.data) {
      console.log(`Cancelling/Deleting CE: ${ce.name}`);
      try {
        await frappePut(`resource/Course Enrollment/${encodeURIComponent(ce.name)}`, { docstatus: 2 });
      } catch (e) {}
      try {
        await frappeDelete(`resource/Course Enrollment/${encodeURIComponent(ce.name)}`);
      } catch (e) {}
    }
  }

  // Cancel old PE
  console.log("Cancelling old PE...");
  const cancelPE = await frappePut(`resource/Program Enrollment/${encodeURIComponent(oldPEName)}`, { docstatus: 2 });
  console.log("Old PE Cancelled:", cancelPE);

  // Delete old PE so we can recreate it cleanly
  console.log("Deleting old PE...");
  await frappeDelete(`resource/Program Enrollment/${encodeURIComponent(oldPEName)}`);

  // Create new PE with Basic plan & structure
  const newPEPayload = {
    student: studentId,
    student_name: oldPE.data.student_name,
    custom_student_srr: oldPE.data.custom_student_srr,
    program: oldPE.data.program,
    custom_program_abb: oldPE.data.custom_program_abb,
    academic_year: oldPE.data.academic_year,
    enrollment_date: oldPE.data.enrollment_date,
    student_batch_name: oldPE.data.student_batch_name,
    custom_fee_structure: "SU THP-12th Science State-Basic-8",
    custom_plan: "Basic",
    custom_no_of_instalments: "8"
  };

  console.log("Creating new PE with Basic plan...");
  const createPERes = await frappePost("resource/Program Enrollment", newPEPayload);
  console.log("New PE created:", JSON.stringify(createPERes, null, 2));

  const newPEName = createPERes.data?.name;
  if (newPEName) {
    const submitPERes = await frappePut(`resource/Program Enrollment/${encodeURIComponent(newPEName)}`, { docstatus: 1 });
    console.log("New PE submitted:", submitPERes.data ? "Success" : submitPERes);
  }
}

run();
