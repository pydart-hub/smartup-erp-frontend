import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

async function main() {
  const studentId = "STU-SU ERV-26-204";
  console.log(`🔍 DEEP INVESTIGATION OF ENROLLMENTS FOR FATHIMA RUFAIDHA M M (${studentId})\n`);
  
  // 1. Full Student Doc
  const student = await api("GET", `/api/resource/Student/${encodeURIComponent(studentId)}`);
  console.log("=== FULL STUDENT DOC ===");
  console.log(JSON.stringify(student, null, 2));
  
  // 2. Search Program Enrollment for studentId across docstatus 0, 1, 2
  const peAll = await api(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log("\n=== PROGRAM ENROLLMENT FOR FATHIMA RUFAIDHA M M ===");
  console.log(JSON.stringify(peAll, null, 2));

  // 3. Search Course Enrollment for student
  const ceList = await api(
    "GET",
    `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log("\n=== COURSE ENROLLMENT FOR FATHIMA RUFAIDHA M M ===");
  console.log(JSON.stringify(ceList, null, 2));

  // 4. Compare with another student e.g. STU-SU ERV-26-208 (Midhlaj M.S)
  const refStudentId = "STU-SU ERV-26-208";
  const refPE = await api(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", refStudentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log(`\n=== REFERENCE PROGRAM ENROLLMENT (${refStudentId} - MIDHLAJ M.S) ===`);
  console.log(JSON.stringify(refPE, null, 2));

  const refCE = await api(
    "GET",
    `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", refStudentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log(`\n=== REFERENCE COURSE ENROLLMENT (${refStudentId} - MIDHLAJ M.S) ===`);
  console.log(JSON.stringify(refCE, null, 2));

  // 5. Check if Program Enrollment for Eraveli 8th State exists in general
  const peList8th = await api(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["program", "=", "8th State"],
      ["academic_year", "=", "2026-2027"]
    ]))}&limit_page_length=5&fields=${encodeURIComponent(JSON.stringify(["name", "student", "student_name", "program", "custom_plan", "custom_no_of_instalments", "custom_fee_structure"]))}`
  );
  console.log(`\n=== SAMPLE 8TH STATE PROGRAM ENROLLMENTS (2026-2027) ===`);
  console.log(JSON.stringify(peList8th, null, 2));
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
