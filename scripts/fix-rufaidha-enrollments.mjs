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

async function main() {
  console.log("🚀 CREATING PROGRAM & COURSE ENROLLMENTS FOR FATHIMA RUFAIDHA M M");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-204";
  const STUDENT_NAME = "FATHIMA RUFAIDHA M M";
  const PROGRAM = "8th State";
  const ACADEMIC_YEAR = "2026-2027";
  const ENROLLMENT_DATE = "2026-06-01";
  const SRR_ID = "204";
  const BATCH_NAME = "Eraveli 26-27";
  const PE_NAME = `PEN-8th-Eraveli 26-27-${SRR_ID}`;
  
  const COURSES = [
    "8th Biology",
    "8th Chemistry",
    "8th English",
    "8th Hindi",
    "8th IT",
    "8th Language1",
    "8th Language2",
    "8th Malayalam",
    "8th Mathematics",
    "8th Physics",
    "8th Social Science",
  ];

  // 1. Create Program Enrollment
  console.log(`\n📝 Step 1: Creating Program Enrollment ${PE_NAME}...`);
  const pePayload = {
    doctype: "Program Enrollment",
    name: PE_NAME,
    student: STUDENT_ID,
    student_name: STUDENT_NAME,
    program: PROGRAM,
    academic_year: ACADEMIC_YEAR,
    enrollment_date: ENROLLMENT_DATE,
    custom_plan: "Basic",
    custom_no_of_instalments: "8",
    custom_fee_structure: "SU ERV-8th State-Basic-8",
  };

  try {
    const createdPE = await apiCall("POST", "/api/resource/Program Enrollment", pePayload);
    await apiCall("PUT", `/api/resource/Program Enrollment/${encodeURIComponent(createdPE.name)}`, { docstatus: 1 });
    console.log(`  ✓ Created & Submitted Program Enrollment: ${createdPE.name}`);
  } catch (err) {
    console.log(`  ⚠️ Program Enrollment note: ${err.message}`);
  }

  // 2. Create Course Enrollments
  console.log(`\n📚 Step 2: Creating 11 Course Enrollments...`);
  for (const course of COURSES) {
    const cenName = `CEN-${course}-Eraveli 26-27-${SRR_ID}`;
    const cePayload = {
      doctype: "Course Enrollment",
      name: cenName,
      student: STUDENT_ID,
      student_name: STUDENT_NAME,
      program_enrollment: PE_NAME,
      program: PROGRAM,
      course: course,
      enrollment_date: ENROLLMENT_DATE,
      custom_batch_name: BATCH_NAME,
      custom_student_srr: SRR_ID,
    };
    try {
      const createdCE = await apiCall("POST", "/api/resource/Course Enrollment", cePayload);
      console.log(`  ✓ Created Course Enrollment: ${createdCE.name} (${course})`);
    } catch (err) {
      console.log(`  ⚠️ Course Enrollment ${cenName}: ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("🎉 ENROLLMENT CREATION COMPLETED FOR FATHIMA RUFAIDHA M M!");
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error(`\n❌ FAILED: ${err.message}`);
  process.exit(1);
});
