/**
 * Diagnostic: Demo/N/A root cause analysis
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

async function main() {
  console.log("=== Demo / N/A Root Cause Diagnostic ===\n");

  // 1. All active students with custom_student_type
  const students = await frappeGet("Student", {
    fields: JSON.stringify(["name", "custom_branch", "custom_student_type"]),
    filters: JSON.stringify([["enabled", "=", 1]]),
    limit_page_length: "0",
  });
  console.log(`Total active students: ${students.length}`);

  // Student type distribution
  const typeCount = {};
  for (const s of students) {
    const t = s.custom_student_type || "(none)";
    typeCount[t] = (typeCount[t] || 0) + 1;
  }
  console.log("By custom_student_type:", typeCount);

  // 2. All submitted PEs
  const allPEs = await frappeGet("Program Enrollment", {
    fields: JSON.stringify(["student", "student_category", "custom_plan", "enrollment_date"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    order_by: "enrollment_date desc",
    limit_page_length: "0",
  });
  console.log(`\nTotal submitted PEs: ${allPEs.length}`);

  // Latest PE per student
  const latestPE = new Map();
  for (const pe of allPEs) {
    if (pe.student && !latestPE.has(pe.student)) latestPE.set(pe.student, pe);
  }
  console.log(`Unique students with submitted PE: ${latestPE.size}`);

  // 3. Students WITHOUT any submitted PE
  const activeIds = new Set(students.map(s => s.name));
  const withPE = new Set(latestPE.keys());
  const withoutPE = [...activeIds].filter(id => !withPE.has(id));
  console.log(`\nActive students with NO submitted PE: ${withoutPE.length}`);

  if (withoutPE.length > 0) {
    const nopeStudents = students.filter(s => withoutPE.includes(s.name));
    const nopeByType = {};
    const nopeByBranch = {};
    for (const s of nopeStudents) {
      const t = s.custom_student_type || "(none)";
      nopeByType[t] = (nopeByType[t] || 0) + 1;
      const b = s.custom_branch || "(no-branch)";
      nopeByBranch[b] = (nopeByBranch[b] || 0) + 1;
    }
    console.log("  By type:", nopeByType);
    console.log("  By branch:", nopeByBranch);
    console.log("  Names:", nopeStudents.map(s => `${s.name}(${s.custom_student_type || "?"},${(s.custom_branch||"?").replace("Smart Up ","")}`));
  }

  // 4. Demo discrepancy
  const demoFromStudent = students.filter(s => s.custom_student_type === "Demo");
  const demoFromPE = [...latestPE.entries()].filter(([, pe]) => pe.student_category === "Demo").map(([id]) => id);
  console.log(`\nDemo: Student.custom_student_type="Demo" → ${demoFromStudent.length}`);
  console.log(`Demo: PE.student_category="Demo" → ${demoFromPE.length}`);
  const demoStudentSet = new Set(demoFromStudent.map(s => s.name));
  const demoPESet = new Set(demoFromPE);
  const inSNotPE = [...demoStudentSet].filter(id => !demoPESet.has(id));
  const inPENotS = [...demoPESet].filter(id => !demoStudentSet.has(id));
  console.log(`  In Student NOT PE (${inSNotPE.length}):`, inSNotPE);
  console.log(`  In PE NOT Student (${inPENotS.length}):`, inPENotS);

  // 5. What are inPENotStudent students' custom_student_type?
  if (inPENotS.length > 0) {
    const extraStudents = await frappeGet("Student", {
      fields: JSON.stringify(["name", "custom_branch", "custom_student_type", "enabled"]),
      filters: JSON.stringify([["name", "in", inPENotS]]),
      limit_page_length: "0",
    });
    console.log("  PE-demo students NOT in Student demo list:", extraStudents.map(s => `${s.name}: type=${s.custom_student_type||"?"}, enabled=${s.enabled}, branch=${(s.custom_branch||"?").replace("Smart Up","")}`));
  }

  // 6. CORRECT two-pass counts per branch
  console.log("\n=== CORRECT counts per branch (two-pass: Student type + PE plan) ===");
  const branches = [...new Set(students.map(s => s.custom_branch).filter(Boolean))].sort();
  let totalAdv=0, totalInter=0, totalBasic=0, totalFree=0, totalDemo=0, totalNA=0;

  for (const branch of branches) {
    const bStudents = students.filter(s => s.custom_branch === branch);
    let adv=0, inter=0, basic=0, free=0, demo=0, na=0;
    for (const s of bStudents) {
      if (s.custom_student_type === "Demo") { demo++; continue; }
      if (s.custom_student_type === "Free Access") { free++; continue; }
      const pe = latestPE.get(s.name);
      if (!pe) { na++; continue; }
      const plan = (pe.custom_plan || "").toLowerCase();
      if (plan === "advanced") adv++;
      else if (plan === "intermediate") inter++;
      else if (plan === "basic") basic++;
      else na++;
    }
    const sn = branch.replace("Smart Up ", "");
    console.log(`${sn}: ADV=${adv} INT=${inter} BASIC=${basic} FREE=${free} DEMO=${demo} NA=${na} total=${bStudents.length}`);
    totalAdv+=adv; totalInter+=inter; totalBasic+=basic; totalFree+=free; totalDemo+=demo; totalNA+=na;
  }
  console.log(`GLOBAL: ADV=${totalAdv} INT=${totalInter} BASIC=${totalBasic} FREE=${totalFree} DEMO=${totalDemo} NA=${totalNA} total=${students.length}`);

  // 7. What do the NA students look like?
  console.log("\n=== N/A students (active, not demo/free, no submitted PE with valid plan) ===");
  for (const s of students) {
    if (s.custom_student_type === "Demo" || s.custom_student_type === "Free Access") continue;
    const pe = latestPE.get(s.name);
    const plan = pe ? (pe.custom_plan || "").toLowerCase() : null;
    if (!pe || !["advanced","intermediate","basic"].includes(plan)) {
      const sn = (s.custom_branch||"?").replace("Smart Up ","");
      const planInfo = pe ? `PE exists but plan="${pe.custom_plan||""}" cat="${pe.student_category||""}"` : "NO PE";
      console.log(`  ${s.name} [${sn}]: ${planInfo}`);
    }
  }
}

main().catch(console.error);
