/**
 * study-kdv-subject-students.mjs
 * 
 * Finds all subject-wise tuition students at Smart Up Kadavanthara.
 * 
 * Strategy:
 * 1. Get all Fee Structures at Kadavanthara
 * 2. Identify subject-wise ones (Physics, Chemistry, Maths, 10 Physics, 10 Biology, 10 Chemistry)
 * 3. Find Program Enrollments linked to those fee structures
 * 4. Cross-check via Sales Orders / Invoices item descriptions for subject info
 * 5. Show student name, SRR ID, subject, program, batch, plan
 */

import https from "https";
import http from "http";

const BASE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const BRANCH = "Smart Up Kadavanthara";

// HSS programs at Kadavanthara
const HSS_PROGRAMS = ["11th Science State", "11th Science CBSE", "12th Science State", "12th Science CBSE"];

// Subject-wise fee class keywords for Kadavanthara
const SUBJECT_KEYWORDS = ["Physics", "Chemistry", "Maths", "10 Physics", "10 Biology", "10 Chemistry"];

function authHeader() {
  return `token ${API_KEY}:${API_SECRET}`;
}

async function frappeGet(path) {
  const url = `${BASE_URL}/api${path}`;
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, {
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
  });
}

function encodeParams(params) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
    )
  ).toString();
}

async function getList(doctype, fields, filters, limit = 500) {
  const params = encodeParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  const res = await frappeGet(`/resource/${encodeURIComponent(doctype)}?${params}`);
  return res.data ?? [];
}

// ─────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Subject-Wise Tuition Students — Smart Up Kadavanthara");
  console.log("═══════════════════════════════════════════════════════\n");

  // STEP 1: Get all Fee Structures at Kadavanthara
  console.log("📋 Step 1: Fetching Fee Structures at Kadavanthara...");
  const allFS = await getList(
    "Fee Structure",
    ["name", "company", "academic_year", "custom_plan", "custom_no_of_instalments", "program"],
    [["company", "=", BRANCH], ["docstatus", "=", "1"]],
    200
  );
  console.log(`   Found ${allFS.length} active Fee Structures at ${BRANCH}`);

  // Filter subject-wise fee structures
  const subjectFS = allFS.filter((fs) => {
    return SUBJECT_KEYWORDS.some((kw) => fs.name?.includes(kw));
  });

  if (subjectFS.length === 0) {
    console.log("\n⚠️  No subject-specific Fee Structures found by name keyword search.");
    console.log("   All Fee Structures at Kadavanthara:");
    allFS.forEach((fs) => console.log(`   • ${fs.name} (${fs.program ?? "no program"}, ${fs.custom_plan ?? "?"})`));
  } else {
    console.log(`\n   Subject-wise Fee Structures found (${subjectFS.length}):`);
    subjectFS.forEach((fs) => console.log(`   • ${fs.name}`));
  }

  // STEP 2: Get ALL HSS Program Enrollments at Kadavanthara
  console.log("\n📋 Step 2: Fetching HSS Program Enrollments at Kadavanthara...");
  
  // First get Student Groups at Kadavanthara for HSS programs
  const hssGroups = await getList(
    "Student Group",
    ["name", "program", "batch", "academic_year", "custom_branch"],
    [
      ["custom_branch", "=", BRANCH],
      ["group_based_on", "=", "Batch"],
      ["program", "in", HSS_PROGRAMS],
    ],
    100
  );
  console.log(`   Found ${hssGroups.length} HSS Student Groups at Kadavanthara:`);
  hssGroups.forEach((g) => console.log(`   • ${g.name} (${g.program}, ${g.academic_year})`));

  if (hssGroups.length === 0) {
    console.log("\n⚠️  No HSS Student Groups found. Fetching ALL Student Groups at branch...");
    const allGroups = await getList(
      "Student Group",
      ["name", "program", "batch", "academic_year", "custom_branch"],
      [["custom_branch", "=", BRANCH], ["group_based_on", "=", "Batch"]],
      100
    );
    console.log(`\n   All Student Groups at ${BRANCH} (${allGroups.length}):`);
    allGroups.forEach((g) => console.log(`   • ${g.name} (${g.program ?? "no program"}, ${g.academic_year})`));
    return;
  }

  const batchCodes = [...new Set(hssGroups.map((g) => g.batch).filter(Boolean))];
  console.log(`   Batch codes: ${batchCodes.join(", ")}`);

  // STEP 3: Get Program Enrollments for these batches
  console.log("\n📋 Step 3: Fetching Program Enrollments for HSS batches...");
  const peFilters = [
    ["docstatus", "=", "1"],
    ["program", "in", HSS_PROGRAMS],
  ];
  if (batchCodes.length > 0) {
    peFilters.push(["student_batch_name", "in", batchCodes]);
  }
  const allPEs = await getList(
    "Program Enrollment",
    ["name", "student", "student_name", "program", "academic_year", "student_batch_name", "custom_plan", "custom_no_of_instalments", "custom_fee_structure", "enrollment_date"],
    peFilters,
    500
  );
  console.log(`   Found ${allPEs.length} HSS Program Enrollments`);

  if (allPEs.length === 0) {
    console.log("\n⚠️  No HSS Program Enrollments found. Trying without batch filter...");
    const allHSSPEs = await getList(
      "Program Enrollment",
      ["name", "student", "student_name", "program", "academic_year", "student_batch_name", "custom_plan", "custom_no_of_instalments", "custom_fee_structure", "enrollment_date"],
      [["docstatus", "=", "1"], ["program", "in", HSS_PROGRAMS]],
      500
    );
    console.log(`   Total HSS PEs across all branches: ${allHSSPEs.length}`);
    
    // Filter to Kadavanthara batch codes
    const kdvBatches = hssGroups.map((g) => g.batch).filter(Boolean);
    const kdvPEs = allHSSPEs.filter((pe) => kdvBatches.includes(pe.student_batch_name));
    console.log(`   HSS PEs at Kadavanthara batch codes (${kdvBatches.join(", ")}): ${kdvPEs.length}`);
  }

  // STEP 4: Get Student details including SRR ID
  if (allPEs.length > 0) {
    const studentIds = allPEs.map((pe) => pe.student);
    console.log(`\n📋 Step 4: Fetching Student details for ${studentIds.length} students...`);
    
    const students = await getList(
      "Student",
      ["name", "student_name", "custom_srr_id", "custom_branch", "custom_student_type", "enabled"],
      [["name", "in", studentIds]],
      studentIds.length
    );
    const studentMap = {};
    students.forEach((s) => { studentMap[s.name] = s; });

    // STEP 5: Try to identify subject via fee structure name or Sales Orders
    console.log("\n📋 Step 5: Identifying subject from fee structures...");
    
    // Get Sales Orders for these students to check item descriptions
    const soData = await getList(
      "Sales Order",
      ["name", "student", "items"],
      [["student", "in", studentIds], ["docstatus", "=", "1"]],
      500
    );
    
    // Build student → Sales Order items map
    const studentSOMap = {};
    soData.forEach((so) => {
      if (!studentSOMap[so.student]) studentSOMap[so.student] = [];
      studentSOMap[so.student].push(so.name);
    });

    // Determine subject from fee structure name
    function inferSubjectFromFeeStructure(fsName) {
      if (!fsName) return null;
      for (const kw of ["Physics", "Chemistry", "Maths", "10 Physics", "10 Biology", "10 Chemistry"]) {
        if (fsName.includes(kw)) return kw;
      }
      return null;
    }

    // Determine if HSS full-program vs subject-wise by fee structure
    function isSubjectWise(fsName, program) {
      const subj = inferSubjectFromFeeStructure(fsName);
      if (subj) return { isSubject: true, subject: subj };
      // If fee structure has "Plus One" / "Plus Two" → full program
      if (fsName?.includes("Plus One") || fsName?.includes("Plus Two")) return { isSubject: false };
      // If fee structure has program name → full program
      if (fsName?.includes("11th") || fsName?.includes("12th")) return { isSubject: false };
      return { isSubject: null, subject: null };
    }

    // Build table
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  HSS STUDENTS AT KADAVANTHARA");
    console.log("═══════════════════════════════════════════════════════");

    const subjectWise = [];
    const fullProgram = [];
    const unknown = [];

    for (const pe of allPEs) {
      const student = studentMap[pe.student];
      const result = isSubjectWise(pe.custom_fee_structure, pe.program);
      const row = {
        srr: student?.custom_srr_id ?? "?",
        name: pe.student_name,
        studentId: pe.student,
        program: pe.program,
        batch: pe.student_batch_name ?? "?",
        plan: pe.custom_plan ?? "?",
        instalments: pe.custom_no_of_instalments ?? "?",
        feeStructure: pe.custom_fee_structure ?? "none",
        enrollmentDate: pe.enrollment_date,
        subject: result.subject,
        type: student?.custom_student_type ?? "?",
        enabled: student?.enabled === 1 ? "Active" : "Inactive",
      };
      if (result.isSubject) subjectWise.push(row);
      else if (result.isSubject === false) fullProgram.push(row);
      else unknown.push(row);
    }

    // Print subject-wise students
    console.log(`\n🎯 SUBJECT-WISE TUITION STUDENTS (${subjectWise.length}):`);
    console.log("─────────────────────────────────────────────────────────");
    if (subjectWise.length === 0) {
      console.log("   None found (no subject keywords in fee structure names)");
    } else {
      console.log("  SRR    Name                    Program               Subject     Plan         Batch         Status");
      console.log("  ────── ─────────────────────── ───────────────────── ─────────── ──────────── ────────────  ──────");
      for (const r of subjectWise) {
        const srr = (r.srr ?? "?").padEnd(6);
        const name = r.name.padEnd(23);
        const prog = r.program.padEnd(21);
        const subj = (r.subject ?? "?").padEnd(11);
        const plan = r.plan.padEnd(12);
        const batch = (r.batch ?? "?").padEnd(12);
        console.log(`  ${srr} ${name} ${prog} ${subj} ${plan} ${batch}  ${r.enabled}`);
      }
    }

    // Print full-program HSS students
    console.log(`\n📚 FULL PROGRAM HSS STUDENTS (${fullProgram.length}):`);
    console.log("─────────────────────────────────────────────────────────");
    if (fullProgram.length === 0) {
      console.log("   None found");
    } else {
      console.log("  SRR    Name                    Program               Plan         Batch         Status");
      console.log("  ────── ─────────────────────── ───────────────────── ──────────── ────────────  ──────");
      for (const r of fullProgram) {
        const srr = (r.srr ?? "?").padEnd(6);
        const name = r.name.padEnd(23);
        const prog = r.program.padEnd(21);
        const plan = r.plan.padEnd(12);
        const batch = (r.batch ?? "?").padEnd(12);
        console.log(`  ${srr} ${name} ${prog} ${plan} ${batch}  ${r.enabled}`);
      }
    }

    // Unknown
    if (unknown.length > 0) {
      console.log(`\n❓ UNKNOWN (fee structure unclear) (${unknown.length}):`);
      for (const r of unknown) {
        console.log(`  ${r.srr} ${r.name} — FS: "${r.feeStructure}" — ${r.program}`);
      }
    }

    // Summary by subject
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  SUMMARY");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`  Total HSS Students:       ${allPEs.length}`);
    console.log(`  Subject-Wise:             ${subjectWise.length}`);
    console.log(`  Full Program:             ${fullProgram.length}`);
    console.log(`  Unknown:                  ${unknown.length}`);

    if (subjectWise.length > 0) {
      const bySubject = {};
      for (const r of subjectWise) {
        const key = r.subject ?? "Unknown";
        bySubject[key] = (bySubject[key] ?? 0) + 1;
      }
      console.log("\n  Subject-Wise Breakdown:");
      for (const [subj, count] of Object.entries(bySubject)) {
        console.log(`    ${subj.padEnd(20)} ${count} student(s)`);
      }
    }

    // STEP 6: Try via Sales Order items if no subject found via fee structure
    if (subjectWise.length === 0 && allPEs.length > 0) {
      console.log("\n📋 Step 6: Trying to identify via Sales Order items...");
      const soIds = soData.map((so) => so.name);
      if (soIds.length > 0) {
        const soItems = await getList(
          "Sales Order Item",
          ["parent", "item_code", "item_name", "description"],
          [["parent", "in", soIds]],
          500
        );
        console.log(`   Found ${soItems.length} Sales Order items`);
        const subjectItems = soItems.filter((item) =>
          SUBJECT_KEYWORDS.some((kw) =>
            (item.item_code ?? "").includes(kw) ||
            (item.item_name ?? "").includes(kw) ||
            (item.description ?? "").includes(kw)
          )
        );
        if (subjectItems.length > 0) {
          console.log(`\n   Subject-indicator items found (${subjectItems.length}):`);
          subjectItems.forEach((item) => {
            console.log(`   • SO ${item.parent}: ${item.item_code} / ${item.item_name}`);
          });
        } else {
          console.log("   No subject keywords found in Sales Order items either.");
          console.log("\n   Sample SO items:");
          soItems.slice(0, 10).forEach((item) => {
            console.log(`   • ${item.parent}: "${item.item_code}" / "${item.item_name}"`);
          });
        }
      }
    }

    // STEP 7: Check if any fee structures at Kadavanthara have subject in name at all
    console.log("\n📋 Step 7: All Fee Structures at Kadavanthara:");
    allFS.forEach((fs) => {
      console.log(`   • "${fs.name}" (${fs.program ?? "??"}, ${fs.custom_plan ?? "??"}, ${fs.custom_no_of_instalments ?? "??"} inst)`);
    });
  }
}

main().catch(console.error);
