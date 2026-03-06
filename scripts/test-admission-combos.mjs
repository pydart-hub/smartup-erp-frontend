#!/usr/bin/env node
/**
 * test-admission-combos.mjs
 * 
 * Tests the full student admission pipeline against LIVE Frappe with 8 different
 * field combinations covering all programs, plans, instalments, genders, 
 * batch assignments, and optional fields.
 *
 * Each test case:
 *  1. Creates Guardian
 *  2. Creates Student (with guardian link)
 *  3. Creates & Submits Program Enrollment
 *  4. Adds student to Student Group (batch)
 *  5. Creates & Submits Sales Order
 *
 * Run: node scripts/test-admission-combos.mjs
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;
const COMPANY = "Smart Up Vennala";
const ACADEMIC_YEAR = "2026-2027";
const BATCH = "Vennala 26-27";
const TODAY = "2026-03-06";

// ── Helpers ─────────────────────────────────────────────────────
async function frappePost(doctype, payload) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    const msg = body._server_messages || body.exception || body.message || res.statusText;
    throw new Error(`POST ${doctype} ${res.status}: ${typeof msg === 'string' ? msg.slice(0, 300) : JSON.stringify(msg).slice(0, 300)}`);
  }
  return { status: res.status, data: body.data, body };
}

/**
 * Pre-create a Frappe User with send_welcome_email=0 + Student role.
 * This avoids both "Username already exists" (our generated email is unique)
 * and the SMTP daily limit crash (no welcome email sent).
 */
async function preCreateUser(email, firstName, lastName) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/User`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      send_welcome_email: 0,
      new_password: "TestPass@123",
      roles: [{ role: "Student" }],
      enabled: 1,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // If user already exists, that's fine — it just means we can reuse it
    if (res.status === 409 || String(body.exception || "").includes("DuplicateEntryError")) {
      return { existed: true };
    }
    throw new Error(`Pre-create User ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return { created: true, name: body.data?.name };
}

async function frappeGet(doctype, filters, fields, limit = 5) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`, {
    headers: { Authorization: AUTH },
  });
  const body = await res.json();
  return body.data || [];
}

async function frappeSubmit(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({ docstatus: 1 }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`SUBMIT ${doctype}/${name} ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return (await res.json()).data;
}

async function addToStudentGroup(groupName, studentId, studentName) {
  // Read the group to get existing students
  const res = await fetch(`${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(groupName)}`, {
    headers: { Authorization: AUTH },
  });
  const group = (await res.json()).data;
  
  // Check if already a member
  if (group.students?.some(s => s.student === studentId)) {
    return { skipped: true };
  }
  
  const students = [...(group.students || []), {
    student: studentId,
    student_name: studentName,
    active: 1,
  }];
  
  const updRes = await fetch(`${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(groupName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({ students }),
  });
  if (!updRes.ok) {
    const errBody = await updRes.json().catch(() => ({}));
    throw new Error(`Add to group ${groupName}: ${updRes.status} ${JSON.stringify(errBody).slice(0, 200)}`);
  }
  return { added: true };
}

async function getNextSrrId() {
  const students = await frappeGet("Student", 
    [["custom_branch", "=", COMPANY]], 
    ["custom_srr_id"], 50
  );
  const numericIds = students
    .map(s => parseInt(s.custom_srr_id, 10))
    .filter(n => !isNaN(n) && n < 9000);
  return String(Math.max(0, ...numericIds) + 1).padStart(3, "0");
}

// ── Test Case Definitions ───────────────────────────────────────
// 8 combinations covering all major field variations
let srrBase = 0;

const TEST_CASES = [
  {
    id: "T1",
    desc: "10th State | Basic | 4 inst | Male | With batch | Cash | All optionals",
    program: "10th State",
    studentGroup: "Vennala-10th State-A",
    plan: "Basic",
    instalments: "4",
    feeStructure: "SU VYT-10th State-Basic-4",
    totalAmount: 23800,
    gender: "Male",
    bloodGroup: "A+",
    studentEmail: "",  // auto-generate
    studentMobile: "9876543001",
    modeOfPayment: "Cash",
    withBatch: true,
  },
  {
    id: "T2",
    desc: "10th CBSE | Advanced | 1 inst | Female | With batch | Online | No optionals",
    program: "10th CBSE",
    studentGroup: "Vennala-10th CBSE-A",
    plan: "Advanced",
    instalments: "1",
    feeStructure: "SU VYT-10th CBSE-Advanced-1",
    totalAmount: 39400,
    gender: "Female",
    bloodGroup: "",
    studentEmail: "",
    studentMobile: "",
    modeOfPayment: "Online",
    withBatch: true,
  },
  {
    id: "T3",
    desc: "11th Science State | Intermediate | 6 inst | Male | No batch | Cash",
    program: "11th Science State",
    studentGroup: "Vennala-11th Science State-A",
    plan: "Intermediate",
    instalments: "6",
    feeStructure: "SU VYT-11th Science State-Intermediate-6",
    totalAmount: 45800,
    gender: "Male",
    bloodGroup: "B+",
    studentEmail: "",
    studentMobile: "9876543003",
    modeOfPayment: "Cash",
    withBatch: false,  // No batch assignment
  },
  {
    id: "T4",
    desc: "12th Science State | Basic | 8 inst | Female | With batch | Online",
    program: "12th Science State",
    studentGroup: "Vennala-12th Science State-A",
    plan: "Basic",
    instalments: "8",
    feeStructure: "SU VYT-12th Science State-Basic-8",
    totalAmount: 37000,
    gender: "Female",
    bloodGroup: "O+",
    studentEmail: "",
    studentMobile: "",
    modeOfPayment: "Online",
    withBatch: true,
  },
  {
    id: "T5",
    desc: "8th State | Advanced | 4 inst | Other gender | With batch | Cash",
    program: "8th State",
    studentGroup: "Vennala-8th State-A",
    plan: "Advanced",
    instalments: "4",
    feeStructure: "SU VYT-8th State-Advanced-4",
    totalAmount: 35100,
    gender: "Other",
    bloodGroup: "",
    studentEmail: "",
    studentMobile: "9876543005",
    modeOfPayment: "Cash",
    withBatch: true,
  },
  {
    id: "T6",
    desc: "9th CBSE | Intermediate | 1 inst (one-time) | Male | With batch | Online",
    program: "9th CBSE",
    studentGroup: "Vennala-9th CBSE-A",
    plan: "Intermediate",
    instalments: "1",
    feeStructure: "SU VYT-9th CBSE-Intermediate-1",
    totalAmount: 43100,
    gender: "Male",
    bloodGroup: "AB+",
    studentEmail: "",
    studentMobile: "",
    modeOfPayment: "Online",
    withBatch: true,
  },
  {
    id: "T7",
    desc: "8th CBSE | Basic | 6 inst | Female | No batch | Cash | With custom email",
    program: "8th CBSE",
    studentGroup: "Vennala-8th CBSE-A",
    plan: "Basic",
    instalments: "6",
    feeStructure: "SU VYT-8th CBSE-Basic-6",
    totalAmount: 30200,
    gender: "Female",
    bloodGroup: "B-",
    studentEmail: "USE_CUSTOM",  // will be replaced at runtime
    studentMobile: "9876543007",
    modeOfPayment: "Cash",
    withBatch: false,
  },
  {
    id: "T8",
    desc: "9th State | Advanced | 8 inst | Male | With batch | Cash | Middle name",
    program: "9th State",
    studentGroup: "Vennala-9th State-A",
    plan: "Advanced",
    instalments: "8",
    feeStructure: "SU VYT-9th State-Advanced-8",
    totalAmount: 49000,
    gender: "Male",
    bloodGroup: "O-",
    studentEmail: "",
    studentMobile: "9876543008",
    modeOfPayment: "Cash",
    withBatch: true,
    middleName: "Kumar",
  },
];

// ── First Names Pool ────────────────────────────────────────────
const FIRST_NAMES = ["Arjun", "Meera", "Rahul", "Priya", "Kiran", "Deepa", "Rohan", "Ananya"];
const LAST_NAMES  = ["Nair", "Menon", "Kumar", "Sharma", "Pillai", "Das", "Reddy", "Iyer"];

// ── Main Test Runner ────────────────────────────────────────────
async function runTests() {
  console.log("=" .repeat(80));
  console.log("STUDENT ADMISSION COMBO TESTS — Smart Up Vennala");
  console.log("=" .repeat(80));
  console.log(`Date: ${TODAY} | Company: ${COMPANY} | Academic Year: ${ACADEMIC_YEAR}\n`);

  // Get starting SRR ID
  const startSrr = await getNextSrrId();
  srrBase = parseInt(startSrr, 10);
  console.log(`Starting SRR ID: ${startSrr}\n`);

  // Check Fee Structure availability
  console.log("Verifying fee structures exist...");
  for (const tc of TEST_CASES) {
    const fs = await frappeGet("Fee Structure", 
      [["name", "=", tc.feeStructure]], 
      ["name", "total_amount", "docstatus"], 1
    );
    if (fs.length === 0) {
      console.error(`  ❌ ${tc.id}: Fee structure "${tc.feeStructure}" NOT FOUND`);
    } else if (fs[0].docstatus !== 1) {
      console.error(`  ⚠️ ${tc.id}: Fee structure "${tc.feeStructure}" not submitted (docstatus=${fs[0].docstatus})`);
    } else {
      console.log(`  ✅ ${tc.id}: ${tc.feeStructure} = ₹${fs[0].total_amount}`);
    }
  }
  console.log();

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const srrId = String(srrBase + i).padStart(3, "0");
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const guardianEmail = `testguardian.t${i + 1}.${Date.now()}@testmail.com`;
    
    console.log("-".repeat(80));
    console.log(`TEST ${tc.id}: ${tc.desc}`);
    console.log(`  Student: ${firstName} ${tc.middleName ? tc.middleName + " " : ""}${lastName} | SRR: ${srrId}`);
    console.log("-".repeat(80));

    const result = {
      id: tc.id,
      desc: tc.desc,
      stages: {},
      warnings: [],
      error: null,
    };

    try {
      // ── Stage 1: Guardian ─────────────────────────────────
      console.log("  [1/5] Creating Guardian...");
      const guardianRes = await frappePost("Guardian", {
        guardian_name: `${firstName} ${lastName} Parent`,
        email_address: guardianEmail,
        mobile_number: `98765430${String(i + 10).padStart(2, "0")}`,
      });
      const guardianName = guardianRes.data.name;
      result.stages.guardian = { status: "✅", name: guardianName };
      console.log(`        ✅ Guardian: ${guardianName}`);

      // ── Stage 2: Student ──────────────────────────────────
      // Pre-create Frappe User to avoid SMTP quota / username collision
      console.log("  [2/5] Creating Student...");
      const ts = Date.now();
      const autoEmail = (tc.studentEmail === "USE_CUSTOM")
        ? `testcustom7.${ts}@example.invalid`
        : tc.studentEmail || `test.${srrId}.${ts}@dummy-nouser.invalid`;

      console.log("        Pre-creating User (send_welcome_email=0)...");
      const userResult = await preCreateUser(autoEmail, firstName, lastName);
      console.log(`        ${userResult.existed ? "⏭️ User exists" : "✅ User pre-created"}: ${autoEmail}`);

      // Valid DOBs for school-age students (10-17 years old)
      const dobYear = 2009 + (i % 5);  // 2009-2013
      const dobMonth = String((i % 12) + 1).padStart(2, "0");
      const dobDay = String(10 + (i % 15)).padStart(2, "0");
      const studentPayload = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: `${dobYear}-${dobMonth}-${dobDay}`,
        gender: tc.gender,
        student_email_id: autoEmail,
        joining_date: TODAY,
        custom_branch: COMPANY,
        custom_srr_id: srrId,
        enabled: 1,
        guardians: [{
          doctype: "Student Guardians",
          guardian: guardianName,
          guardian_name: `${firstName} ${lastName} Parent`,
          relation: i % 2 === 0 ? "Father" : "Mother",
        }],
      };
      if (tc.middleName) studentPayload.middle_name = tc.middleName;
      if (tc.bloodGroup) studentPayload.blood_group = tc.bloodGroup;
      if (tc.studentMobile) studentPayload.student_mobile_number = tc.studentMobile;

      const studentRes = await frappePost("Student", studentPayload);
      const student = studentRes.data;
      result.stages.student = { status: "✅", name: student.name, student_name: student.student_name };
      console.log(`        ✅ Student: ${student.name} "${student.student_name}"`);

      // ── Stage 3: Program Enrollment ───────────────────────
      console.log("  [3/5] Creating Program Enrollment...");
      const pePayload = {
        student: student.name,
        program: tc.program,
        academic_year: ACADEMIC_YEAR,
        enrollment_date: TODAY,
        student_batch_name: BATCH,
        custom_fee_structure: tc.feeStructure,
        custom_plan: tc.plan,
        custom_no_of_instalments: tc.instalments,
      };

      let peName;
      const peRes = await frappePost("Program Enrollment", pePayload);
      
      if (peRes.status === 409) {
        // 409 recovery — search for existing PE
        console.log("        ⚠️ Got 409 — recovering existing PE...");
        const existing = await frappeGet("Program Enrollment",
          [["student", "=", student.name], ["program", "=", tc.program], ["academic_year", "=", ACADEMIC_YEAR]],
          ["name", "docstatus"], 1
        );
        if (existing.length > 0) {
          peName = existing[0].name;
          console.log(`        ✅ Recovered PE: ${peName} (docstatus=${existing[0].docstatus})`);
          if (existing[0].docstatus === 0) {
            await frappeSubmit("Program Enrollment", peName);
            console.log(`        ✅ PE submitted`);
          }
        } else {
          throw new Error("409 but no existing PE found — true failure");
        }
      } else {
        peName = peRes.data.name;
        console.log(`        ✅ PE created: ${peName} (draft)`);
        // Submit
        await frappeSubmit("Program Enrollment", peName);
        console.log(`        ✅ PE submitted`);
      }
      result.stages.enrollment = { status: "✅", name: peName };

      // ── Stage 4: Batch Assignment ─────────────────────────
      if (tc.withBatch) {
        console.log(`  [4/5] Adding to Student Group: ${tc.studentGroup}...`);
        const addRes = await addToStudentGroup(tc.studentGroup, student.name, student.student_name);
        if (addRes.skipped) {
          result.stages.batch = { status: "⏭️", note: "Already in group" };
          console.log("        ⏭️ Already a member");
        } else {
          result.stages.batch = { status: "✅", group: tc.studentGroup };
          console.log(`        ✅ Added to ${tc.studentGroup}`);
        }
      } else {
        result.stages.batch = { status: "⏭️", note: "Skipped (no batch)" };
        console.log("  [4/5] Batch assignment: SKIPPED (testing no-batch scenario)");
      }

      // ── Stage 5: Sales Order ──────────────────────────────
      console.log("  [5/5] Creating Sales Order...");
      
      // Read back customer
      const freshStudentRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(student.name)}?fields=["customer"]`,
        { headers: { Authorization: AUTH } }
      );
      const freshStudent = (await freshStudentRes.json()).data;
      const customerName = freshStudent?.customer;
      
      if (!customerName) {
        result.stages.salesOrder = { status: "⚠️", note: "No customer linked" };
        result.warnings.push("No auto-created customer on Student");
        console.log("        ⚠️ No customer linked — skipping SO");
      } else {
        // Find tuition item
        const items = await frappeGet("Item",
          [["item_group", "=", "Fee Component"], ["item_code", "like", `%${tc.program.split(" ")[0]}%`], ["is_sales_item", "=", 1]],
          ["item_code", "item_name"], 5
        );
        
        // Pick best match
        const exactMatch = items.find(it => it.item_code.includes(tc.program.replace(/ /g, " ")));
        const tuitionItem = exactMatch || items[0];
        
        if (!tuitionItem) {
          result.stages.salesOrder = { status: "⚠️", note: "No tuition item found" };
          result.warnings.push(`No tuition fee item for ${tc.program}`);
          console.log(`        ⚠️ No tuition item found for "${tc.program}"`);
        } else {
          const numInst = parseInt(tc.instalments, 10) || 1;
          const perInstRate = numInst > 1 ? Math.round(tc.totalAmount / numInst) : tc.totalAmount;
          const soQty = numInst > 1 ? numInst : 1;
          
          const soPayload = {
            customer: customerName,
            company: COMPANY,
            transaction_date: TODAY,
            delivery_date: TODAY,
            order_type: "Sales",
            items: [{
              item_code: tuitionItem.item_code,
              qty: soQty,
              rate: perInstRate,
            }],
            custom_academic_year: ACADEMIC_YEAR,
            student: student.name,
            custom_no_of_instalments: tc.instalments,
            custom_plan: tc.plan,
            custom_mode_of_payment: tc.modeOfPayment,
          };

          const soRes = await frappePost("Sales Order", soPayload);
          const soName = soRes.data.name;
          console.log(`        ✅ SO created: ${soName} (qty=${soQty}, rate=₹${perInstRate})`);
          
          // Submit SO
          await frappeSubmit("Sales Order", soName);
          console.log(`        ✅ SO submitted`);
          
          result.stages.salesOrder = {
            status: "✅",
            name: soName,
            qty: soQty,
            rate: perInstRate,
            total: soQty * perInstRate,
            customer: customerName,
            item: tuitionItem.item_code,
          };
        }
      }

      result.overall = "✅ PASS";
    } catch (err) {
      result.error = err.message;
      result.overall = "❌ FAIL";
      console.log(`\n  ❌ ERROR: ${err.message}\n`);
    }

    results.push(result);
    console.log(`\n  RESULT: ${result.overall}\n`);
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(80));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(80));
  
  const passed = results.filter(r => r.overall === "✅ PASS").length;
  const failed = results.filter(r => r.overall === "❌ FAIL").length;
  
  console.log(`\n  TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}\n`);

  for (const r of results) {
    console.log(`  ${r.overall} ${r.id}: ${r.desc}`);
    if (r.stages.student) console.log(`       Student: ${r.stages.student.name}`);
    if (r.stages.enrollment) console.log(`       PE: ${r.stages.enrollment.name}`);
    if (r.stages.salesOrder?.name) console.log(`       SO: ${r.stages.salesOrder.name} (₹${r.stages.salesOrder.total})`);
    if (r.warnings.length) console.log(`       ⚠️ Warnings: ${r.warnings.join("; ")}`);
    if (r.error) console.log(`       ❌ Error: ${r.error}`);
  }

  // ── Verification Queries ────────────────────────────────────
  console.log("\n" + "=".repeat(80));
  console.log("VERIFICATION — Querying Frappe for created records");
  console.log("=".repeat(80));

  // Count all students at Vennala
  const allStudents = await frappeGet("Student",
    [["custom_branch", "=", COMPANY]],
    ["name", "custom_srr_id", "student_name", "gender"],
    200
  );
  console.log(`\n  Total students at ${COMPANY}: ${allStudents.length}`);

  // Count submitted PEs
  const allPEs = await frappeGet("Program Enrollment",
    [["docstatus", "=", 1], ["academic_year", "=", ACADEMIC_YEAR]],
    ["name", "student", "program", "student_batch_name"],
    200
  );
  // Filter to Vennala batch
  const vennalaPEs = allPEs.filter(pe => pe.student_batch_name === BATCH);
  console.log(`  Submitted PEs (${ACADEMIC_YEAR}, ${BATCH}): ${vennalaPEs.length}`);

  // Count SOs
  const createdSONames = results.map(r => r.stages.salesOrder?.name).filter(Boolean);
  if (createdSONames.length > 0) {
    console.log(`  Sales Orders created this run: ${createdSONames.length}`);
    for (const soN of createdSONames) {
      const soList = await frappeGet("Sales Order",
        [["name", "=", soN]],
        ["name", "status", "grand_total", "per_billed"],
        1
      );
      if (soList.length) {
        const so = soList[0];
        console.log(`    ${so.name}: status=${so.status}, total=₹${so.grand_total}, billed=${so.per_billed}%`);
      }
    }
  }

  // Check Student Group membership counts
  console.log("\n  Student Group Counts:");
  const groups = [
    "Vennala-8th State-A", "Vennala-8th CBSE-A",
    "Vennala-9th State-A", "Vennala-9th CBSE-A",
    "Vennala-10th State-A", "Vennala-10th CBSE-A",
    "Vennala-11th Science State-A", "Vennala-12th Science State-A",
  ];
  for (const gName of groups) {
    try {
      const gRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(gName)}?fields=["name","max_strength"]`,
        { headers: { Authorization: AUTH } }
      );
      const g = (await gRes.json()).data;
      console.log(`    ${gName}: ${g.students?.length ?? 0}/${g.max_strength} students`);
    } catch {
      console.log(`    ${gName}: (error reading)`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(failed === 0 ? "ALL TESTS PASSED ✅" : `${failed} TEST(S) FAILED ❌`);
  console.log("=".repeat(80));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
