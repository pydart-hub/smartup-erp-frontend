import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);

async function getStudentFullData(studentId) {
  try {
    console.log(`\n${"=".repeat(70)}`);
    
    // 1. Student doc
    const student = await get(`/api/resource/Student/${encodeURIComponent(studentId)}`);
    console.log(`📋 STUDENT: ${student.student_name} (${student.name})`);
    console.log(`   Branch: ${student.custom_branch} | Customer: ${student.customer}`);
    
    // 2. Program Enrollments
    const enrollments = await get(
      `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
        ["student", "=", studentId]
      ]))}&fields=${encodeURIComponent(JSON.stringify([
        "name", "program", "academic_year", "custom_plan",
        "custom_no_of_instalments", "custom_fee_structure",
        "enrollment_date", "docstatus"
      ]))}&limit_page_length=10`
    );
    
    console.log(`\n  Program Enrollments:`);
    for (const pe of (enrollments || [])) {
      console.log(`    ${pe.name} | ${pe.program}`);
      console.log(`    Plan: "${pe.custom_plan}" | Instalments: ${pe.custom_no_of_instalments} | Fee Structure: ${pe.custom_fee_structure}`);
    }
    
    // 3. Sales Orders
    const salesOrders = await get(
      `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
        ["student", "=", studentId],
        ["docstatus", "!=", 2]
      ]))}&fields=${encodeURIComponent(JSON.stringify([
        "name", "grand_total", "billing_status", "transaction_date",
        "custom_plan", "custom_no_of_instalments", "docstatus"
      ]))}&order_by=creation desc&limit_page_length=5`
    );
    
    console.log(`\n  Sales Orders (${(salesOrders || []).length}):`);
    for (const so of (salesOrders || [])) {
      console.log(`    SO: ${so.name} | ₹${so.grand_total} | ${so.billing_status}`);
      console.log(`       Plan: ${so.custom_plan} | Inst: ${so.custom_no_of_instalments}`);
    }
  } catch (err) {
    console.log(`❌ Error fetching details for ${studentId}: ${err.message}`);
  }
}

async function main() {
  console.log("🔍 JUNE FEE CONVERSION — ERAVELI STUDY");
  console.log("=".repeat(70));
  
  const filters = [
    ["docstatus", "=", 1],
    ["academic_year", "=", "2026-2027"],
    ["enrollment_date", ">=", "2026-06-01"],
    ["enrollment_date", "<=", "2026-06-15"]
  ];
  
  const url = `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(["name", "student", "student_name", "enrollment_date", "program", "custom_plan", "custom_no_of_instalments", "custom_fee_structure"]))}&limit_page_length=200`;
  
  const allEnrollments = await get(url);
  
  const eraveliStudents = [];
  for (const pe of (allEnrollments || [])) {
    if (pe.name.includes("Eraveli")) {
      eraveliStudents.push(pe);
    }
  }
  
  console.log(`Found ${eraveliStudents.length} Eraveli students enrolled in June:\n`);
  for (const pe of eraveliStudents) {
    console.log(`  - ${pe.student} | ${pe.student_name} | Program: ${pe.program} | Plan: ${pe.custom_plan} (${pe.custom_no_of_instalments} inst) | FS: ${pe.custom_fee_structure}`);
  }
  
  console.log("\n🎯 Fetching full details for first 5 students as a deep study...");
  for (let i = 0; i < Math.min(5, eraveliStudents.length); i++) {
    await getStudentFullData(eraveliStudents[i].student);
    // sleep 500ms to be safe
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ STUDY COMPLETE");
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
