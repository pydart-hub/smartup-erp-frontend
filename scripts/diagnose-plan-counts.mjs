/**
 * Diagnostic script: understand the exact source of Demo/N/A count discrepancies
 */
const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = `token 03330270e330d49:9c2261ae11ac2d2`;

async function frappeGet(resource, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(resource)}?${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${resource} ${res.status}: ${await res.text()}`);
  return (await res.json())?.data ?? [];
}

async function main() {
  console.log("=== DIAGNOSTIC: Plan Count Root Cause Analysis ===\n");

  // 1. Count active students by custom_student_type (per branch)
  console.log("1. Active students by custom_student_type (Student doctype):");
  const activeStudents = await frappeGet("Student", {
    fields: JSON.stringify(["name", "custom_branch", "custom_student_type", "enabled"]),
    filters: JSON.stringify([["enabled", "=", 1]]),
    limit_page_length: "0",
  });
  console.log(`   Total active: ${activeStudents.length}`);

  const byType = {};
  const byBranch = {};
  const noBranchStudents = [];
  for (const s of activeStudents) {
    const type = s.custom_student_type || "(none)";
    byType[type] = (byType[type] || 0) + 1;
    const branch = s.custom_branch || "(no branch)";
    if (!byBranch[branch]) byBranch[branch] = { Demo: 0, FreeAccess: 0, Other: 0 };
    if (type === "Demo") byBranch[branch].Demo++;
    else if (type === "Free Access") byBranch[branch].FreeAccess++;
    else byBranch[branch].Other++;
    if (!s.custom_branch) noBranchStudents.push(s.name);
  }
  console.log("   By type:", JSON.stringify(byType, null, 2));
  console.log("   Demo/FreeAccess per branch:", JSON.stringify(byBranch, null, 2));
  if (noBranchStudents.length) console.log("   Students with no branch:", noBranchStudents);

  // 2. Submitted PEs by student_category and custom_plan
  console.log("\n2. Submitted Program Enrollments by student_category + custom_plan:");
  const peRows = await frappeGet("Program Enrollment", {
    fields: JSON.stringify(["student_category", "custom_plan", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    group_by: "student_category,custom_plan",
    limit_page_length: "0",
  });
  console.log("   PE groups:", JSON.stringify(peRows, null, 2));

  // 3. Count unique students with submitted PE per branch
  console.log("\n3. Unique students WITH submitted PE per branch:");
  const submittedPEs = await frappeGet("Program Enrollment", {
    fields: JSON.stringify(["student", "student_category", "custom_plan", "enrollment_date", "academic_year"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    order_by: "enrollment_date desc",
    limit_page_length: "0",
  });
  console.log(`   Total submitted PEs: ${submittedPEs.length}`);

  // Build map: student → latest PE
  const latestPE = new Map();
  for (const pe of submittedPEs) {
    if (!latestPE.has(pe.student)) latestPE.set(pe.student, pe);
  }
  console.log(`   Unique students with PE: ${latestPE.size}`);

  // PE by student_category (from PE field, not Student)
  const peCats = {};
  for (const pe of latestPE.values()) {
    const cat = pe.student_category || "(none)";
    peCats[cat] = (peCats[cat] || 0) + 1;
  }
  console.log("   Latest PE by student_category:", JSON.stringify(peCats, null, 2));

  // PE by custom_plan (from PE field, non-special category students)
  const pePlans = {};
  for (const pe of latestPE.values()) {
    if (pe.student_category) continue; // skip special category
    const plan = pe.custom_plan || "(none)";
    pePlans[plan] = (pePlans[plan] || 0) + 1;
  }
  console.log("   Latest PE by custom_plan (non-category students):", JSON.stringify(pePlans, null, 2));

  // 4. Active students WITHOUT any submitted PE
  console.log("\n4. Active students with NO submitted PE (potential N/A):");
  const activeIds = new Set(activeStudents.map((s) => s.name));
  const studentsWithPE = new Set(latestPE.keys());
  const nopeStudents = [...activeIds].filter((id) => !studentsWithPE.has(id));
  console.log(`   Total with no submitted PE: ${nopeStudents.length}`);

  if (nopeStudents.length > 0) {
    // Find their details
    const nopeDetails = activeStudents.filter((s) => nopeStudents.includes(s.name));
    const nopeByCtype = {};
    const nopeBranchMap = {};
    for (const s of nopeDetails) {
      const t = s.custom_student_type || "(none)";
      nopeCtype[t] = (nopeCtype[t] || 0) + 1;
      const b = s.custom_branch || "(no branch)";
      if (!nopeBranchMap[b]) nopeBranchMap[b] = 0;
      nopeBranchMap[b]++;
    }
    console.log("   No-PE students by custom_student_type:", JSON.stringify(nopeByCtype, null, 2));
    console.log("   No-PE students by branch:", JSON.stringify(nopeBranchMap, null, 2));
    console.log("   First 10 no-PE students:", nopeDetails.slice(0, 10).map(s => `${s.name} (${s.custom_student_type || "no-type"}, ${s.custom_branch || "no-branch"})`));
  }

  // 5. The KEY discrepancy: Demo from Student.custom_student_type vs PE.student_category
  console.log("\n5. Demo discrepancy analysis:");
  const demoFromStudent = activeStudents.filter((s) => s.custom_student_type === "Demo");
  const demoFromPE = [...latestPE.entries()]
    .filter(([, pe]) => pe.student_category === "Demo")
    .map(([id]) => id);
  console.log(`   Demo students (Student.custom_student_type = "Demo"): ${demoFromStudent.length}`);
  console.log(`   Demo students (PE.student_category = "Demo"): ${demoFromPE.length}`);
  
  const demoStudentIds = new Set(demoFromStudent.map((s) => s.name));
  const demoPEIds = new Set(demoFromPE);
  
  const inStudentNotPE = [...demoStudentIds].filter((id) => !demoPEIds.has(id));
  const inPENotStudent = [...demoPEIds].filter((id) => !demoStudentIds.has(id));
  console.log(`   In Student but not PE: ${inStudentNotPE.length}`, inStudentNotPE);
  console.log(`   In PE but not Student: ${inPENotStudent.length}`, inPENotStudent);

  // 6. Per-branch count using CORRECT two-pass method (Student.custom_student_type + PE.custom_plan)
  console.log("\n6. CORRECT counts per branch (two-pass method):");
  const branches = [...new Set(activeStudents.map((s) => s.custom_branch).filter(Boolean))].sort();
  for (const branch of branches) {
    const branchStudents = activeStudents.filter((s) => s.custom_branch === branch);
    let demo = 0, freeAccess = 0, regularStudentIds = [];
    for (const s of branchStudents) {
      if (s.custom_student_type === "Demo") demo++;
      else if (s.custom_student_type === "Free Access") freeAccess++;
      else regularStudentIds.push(s.name);
    }
    
    // Count plans from PE for regular students
    let adv = 0, inter = 0, basic = 0, noPlan = 0;
    for (const id of regularStudentIds) {
      const pe = latestPE.get(id);
      if (!pe) { noPlan++; continue; }
      const plan = (pe.custom_plan || "").toLowerCase();
      if (plan === "advanced") adv++;
      else if (plan === "intermediate") inter++;
      else if (plan === "basic") basic++;
      else noPlan++;
    }
    
    const shortName = branch.replace("Smart Up ", "");
    console.log(`   ${shortName}: ADV=${adv} INT=${inter} BASIC=${basic} FREE=${freeAccess} DEMO=${demo} NA=${noPlan} (total=${branchStudents.length})`);
  }
}

// fix typo in the script
const nopeCtype = {};

main().catch(console.error);
