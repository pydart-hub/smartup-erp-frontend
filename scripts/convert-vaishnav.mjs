import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function apiCall(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

async function cancelDoc(doctype, name) {
  try {
    await apiCall("POST", "/api/method/frappe.client.cancel", { doctype, name });
    console.log(`  ✓ Cancelled ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Cancel ${doctype} ${name}: ${err.message}`);
  }
}

async function deleteDoc(doctype, name) {
  try {
    await apiCall("DELETE", `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    console.log(`  ✓ Deleted ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Delete ${doctype} ${name}: ${err.message}`);
  }
}

async function main() {
  console.log("🚀 EXECUTING CONVERSION FOR VAISHNAV M V (WITH PROGRAM ENROLLMENT RE-CREATION)");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU PLR-26-150";
  const CUSTOMER = "Vaishnav M V";
  const COMPANY = "Smart Up Palluruthy";
  const ITEM_CODE = "12th Science State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  const PE_NAME = "PEN-12sc state-Palluruthy 26-27-150";
  const BATCH_NAME = "Palluruthy 26-27";
  
  const TARGET_SCHEDULE = [
    { label: "Q1", amount: 6300, due_date: "2026-05-20" },
    { label: "Q2", amount: 4500, due_date: "2026-08-20" },
    { label: "Q3", amount: 4500, due_date: "2026-11-20" },
    { label: "Q4", amount: 2700, due_date: "2027-02-20" },
  ];
  
  const TOTAL_AMOUNT = 18000;

  // Step 1: Clean up old Program Enrollment and Course Enrollments
  console.log("\n🧹 Step 1: Cleaning up old Program Enrollment and Course Enrollments...");
  
  // Find linked Course Enrollments
  const ces = await apiCall("GET", `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([
    ["program_enrollment", "=", PE_NAME]
  ]))}&fields=${encodeURIComponent(JSON.stringify(["name"]))}`);
  console.log(`  Found ${ces.length} Course Enrollments to remove`);
  for (const ce of ces) {
    await cancelDoc("Course Enrollment", ce.name);
    await deleteDoc("Course Enrollment", ce.name);
  }
  
  // Now cancel and delete the Program Enrollment
  await cancelDoc("Program Enrollment", PE_NAME);
  await deleteDoc("Program Enrollment", PE_NAME);

  // Step 2: Create New Program Enrollment
  console.log("\n📌 Step 2: Creating and submitting new Program Enrollment...");
  const pePayload = {
    doctype: "Program Enrollment",
    student: STUDENT_ID,
    student_name: CUSTOMER,
    program: "12th Science State",
    academic_year: ACADEMIC_YEAR,
    enrollment_date: "2026-05-20",
    student_batch_name: BATCH_NAME,
    custom_fee_structure: "SU PLR-12th Science State-Basic-4",
    custom_plan: "Basic",
    custom_no_of_instalments: "4",
  };
  
  const createdPE = await apiCall("POST", "/api/resource/Program Enrollment", pePayload);
  console.log(`  ✓ Created Program Enrollment Draft: ${createdPE.name}`);

  // Patch auto-created Course Enrollments to ensure they have the correct batch name
  const autoCEs = await apiCall("GET", `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([
    ["program_enrollment", "=", createdPE.name]
  ]))}&fields=${encodeURIComponent(JSON.stringify(["name", "course"]))}&limit=50`);
  console.log(`  Found ${autoCEs.length} auto-created Course Enrollments. Patching batch...`);
  for (const ce of autoCEs) {
    await apiCall("PUT", `/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`, {
      custom_batch_name: BATCH_NAME,
    });
  }

  // Submit the Program Enrollment
  await apiCall("PUT", `/api/resource/Program Enrollment/${encodeURIComponent(createdPE.name)}`, { docstatus: 1 });
  console.log(`  ✓ Submitted Program Enrollment: ${createdPE.name}`);

  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR VAISHNAV M V!");
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
