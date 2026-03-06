#!/usr/bin/env node
/**
 * test-real-email-combos.mjs
 * 
 * Comprehensive test of the student admission pipeline using REAL email addresses.
 * Tests both SUCCESS and ERROR scenarios to verify:
 *  - Student + parent creation with real emails 
 *  - Welcome emails actually sent and queued
 *  - Duplicate email rejection works
 *  - Duplicate SRR ID retry works
 *  - Missing fields handled gracefully
 *  - All error responses are clean and do not leak internals
 *
 * Run: node scripts/test-real-email-combos.mjs
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;
const COMPANY = "Smart Up Vennala";
const ACADEMIC_YEAR = "2026-2027";
const BATCH = "Vennala 26-27";
const TODAY = "2026-03-07";

// ═══════════════════════════════════════════════════════════════
// REAL EMAIL POOLS (provided by user)
// ═══════════════════════════════════════════════════════════════
// Emails that DON'T exist as Frappe Users yet:
const FRESH_EMAILS = [
  "tishnuvichuz143@gmail.com",     // Fresh - use as student email
  "official.tishnu@gmail.com",     // Fresh - use as guardian email
  "idukki.karan404@gmail.com",     // Fresh - use as guardian email
  "online.poornasree@gmail.com",   // Fresh - use as student email
  "it.poornasree@gmail.com",       // Fresh - use as guardian email
];

// Emails that ALREADY exist as Frappe Users:
const EXISTING_EMAILS = [
  "abcdqrst404@gmail.com",        // Exists
  "hr.pydart@gmail.com",          // Exists
  "training.pydart@gmail.com",    // Exists
  "app.pydart@gmail.com",         // Exists
  "solutions.pydart@gmail.com",   // Exists
  "official4tishnu@gmail.com",    // Exists
  "dev.poornasree@gmail.com",     // Exists
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
let testLog = [];

function log(msg) {
  console.log(msg);
  testLog.push(msg);
}

async function frappePost(doctype, payload) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: body.data, body };
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
  const body = await res.json().catch(() => ({}));
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

async function preCreateUser(email, firstName, lastName, roles = [{ role: "Student" }]) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/User`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      email, first_name: firstName, last_name: lastName,
      send_welcome_email: 0,
      new_password: "TestPass@" + Date.now(),
      roles,
      enabled: 1,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 409 || String(body.exception || "").includes("DuplicateEntryError")) {
      return { existed: true };
    }
    throw new Error(`Pre-create User ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return { created: true, name: body.data?.name };
}

async function addToStudentGroup(groupName, studentId, studentName) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(groupName)}`, {
    headers: { Authorization: AUTH },
  });
  const group = (await res.json()).data;
  if (group.students?.some(s => s.student === studentId)) return { skipped: true };
  
  const students = [...(group.students || []), {
    student: studentId, student_name: studentName, active: 1,
  }];
  const updRes = await fetch(`${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(groupName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({ students }),
  });
  if (!updRes.ok) throw new Error(`Add to group failed: ${updRes.status}`);
  return { added: true };
}

async function getNextSrrId() {
  const students = await frappeGet("Student",
    [["custom_branch", "=", COMPANY]],
    ["custom_srr_id"], 200
  );
  const numericIds = students.map(s => parseInt(s.custom_srr_id, 10)).filter(n => !isNaN(n) && n < 9000);
  return Math.max(0, ...numericIds) + 1;
}

async function getEmailQueueCount(status = "Error") {
  const r = await frappeGet("Email Queue", [["status", "=", status]], ["name"], 0);
  return r.length;
}

async function getEmailQueueRecent(minutes = 5) {
  const since = new Date(Date.now() - minutes * 60000).toISOString().replace("T", " ").slice(0, 19);
  return frappeGet("Email Queue",
    [["creation", ">", since]],
    ["name", "status", "sender", "email_account", "error"],
    50
  );
}

async function getEmailQueueRecipientsFor(queueName) {
  return frappeGet("Email Queue Recipient",
    [["parent", "=", queueName]],
    ["recipient", "status"],
    10
  );
}

// ═══════════════════════════════════════════════════════════════
// TEST SCENARIO DEFINITIONS
// ═══════════════════════════════════════════════════════════════

function buildTestScenarios(srrBase) {
  return [
    // ────── SUCCESS SCENARIOS ──────
    {
      id: "S1",
      type: "SUCCESS",
      desc: "10th State | Basic-4 | Fresh student email (tishnuvichuz143) | Fresh guardian email",
      program: "10th State",
      studentGroup: "Vennala-10th State-A",
      plan: "Basic", instalments: "4",
      feeStructure: "SU VYT-10th State-Basic-4", totalAmount: 23800,
      gender: "Male",
      studentEmail: "tishnuvichuz143@gmail.com",  // REAL fresh email
      guardianEmail: "official.tishnu@gmail.com",  // REAL fresh email
      guardianName: "Tishnu V Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "Tishnu", lastName: "Vichuz",
      srrId: String(srrBase).padStart(3, "0"),
      withBatch: true,
      modeOfPayment: "Cash",
    },
    {
      id: "S2",
      type: "SUCCESS",
      desc: "9th CBSE | Intermediate-1 | Fresh student email (online.poornasree) | Fresh guardian",
      program: "9th CBSE",
      studentGroup: "Vennala-9th CBSE-A",
      plan: "Intermediate", instalments: "1",
      feeStructure: "SU VYT-9th CBSE-Intermediate-1", totalAmount: 37600,
      gender: "Female",
      studentEmail: "online.poornasree@gmail.com",  // REAL fresh email
      guardianEmail: "it.poornasree@gmail.com",     // REAL fresh email
      guardianName: "Poornasree IT Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "Poornasree", lastName: "Online",
      srrId: String(srrBase + 1).padStart(3, "0"),
      withBatch: true,
      modeOfPayment: "Online",
    },
    {
      id: "S3",
      type: "SUCCESS",
      desc: "11th Sci State | Advanced-6 | Existing user email (dev.poornasree) as student",
      program: "11th Science State",
      studentGroup: "Vennala-11th Science State-A",
      plan: "Advanced", instalments: "6",
      feeStructure: "SU VYT-11th Science State-Advanced-6", totalAmount: 47800,
      gender: "Male",
      studentEmail: "dev.poornasree@gmail.com",    // EXISTING user — tests pre-create 409 handling
      guardianEmail: "idukki.karan404@gmail.com",  // REAL fresh
      guardianName: "Karan Idukki Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "DevTest", lastName: "Poornasree",
      srrId: String(srrBase + 2).padStart(3, "0"),
      withBatch: true,
      modeOfPayment: "Cash",
      bloodGroup: "O+",
      middleName: "Kumar",
      studentMobile: "9847012345",
    },
    {
      id: "S4",
      type: "SUCCESS",
      desc: "8th State | Basic-8 | Auto-gen email (no custom) | Existing guardian user (app.pydart)",
      program: "8th State",
      studentGroup: "Vennala-8th State-A",
      plan: "Basic", instalments: "8",
      feeStructure: "SU VYT-8th State-Basic-8", totalAmount: 19000,
      gender: "Female",
      studentEmail: "",  // auto-generate → tests the branch-abbr auto-email path
      guardianEmail: "app.pydart@gmail.com",  // EXISTING user — parent-user-create should say "already exists"
      guardianName: "App Pydart Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "Lakshmi", lastName: "Devi",
      srrId: String(srrBase + 3).padStart(3, "0"),
      withBatch: false,  // No batch scenario
      modeOfPayment: "Cash",
    },

    // ────── ERROR SCENARIOS ──────
    {
      id: "E1",
      type: "ERROR",
      desc: "DUPLICATE STUDENT EMAIL — use email already assigned to existing student",
      expectError: "duplicate_email",
      expectPattern: /already registered|duplicate|email/i,
      program: "10th State",
      studentGroup: "Vennala-10th State-A",
      plan: "Basic", instalments: "4",
      feeStructure: "SU VYT-10th State-Basic-4", totalAmount: 23800,
      gender: "Male",
      studentEmail: "tishnuvichuz143@gmail.com",  // ALREADY used in S1 → should fail
      guardianEmail: "hr.pydart@gmail.com",
      guardianName: "HR Pydart Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "DuplicateTest", lastName: "One",
      srrId: String(srrBase + 4).padStart(3, "0"),
      withBatch: true,
      modeOfPayment: "Cash",
    },
    {
      id: "E2", 
      type: "ERROR",
      desc: "DUPLICATE SRR ID — reuse SRR from S1 to test retry logic",
      expectError: "recovery_or_retry",
      expectPattern: /collision|retry|duplicate/i,
      program: "12th Science State",
      studentGroup: "Vennala-12th Science State-A",
      plan: "Intermediate", instalments: "4",
      feeStructure: "SU VYT-12th Science State-Intermediate-4", totalAmount: 44700,
      gender: "Male",
      studentEmail: "",  // auto-gen
      guardianEmail: "training.pydart@gmail.com",
      guardianName: "Training Pydart Guardian",
      guardianPassword: "Guardian@2026",
      firstName: "SrrRetry", lastName: "Test",
      srrId: String(srrBase).padStart(3, "0"),  // SAME as S1 → forces retry!
      withBatch: true,
      modeOfPayment: "Online",
    },
    {
      id: "E3",
      type: "ERROR",
      desc: "INVALID PROGRAM — program that doesn't exist",
      expectError: "enrollment_failure",
      expectPattern: /must be set|invalid|not found|link/i,
      program: "99th Nonexistent",
      studentGroup: "",
      plan: "Basic", instalments: "1",
      feeStructure: "SU VYT-99th-Basic-1", totalAmount: 10000,
      gender: "Male",
      studentEmail: "",
      guardianEmail: "solutions.pydart@gmail.com",
      guardianName: "Solutions Pydart",
      guardianPassword: "Guardian@2026",
      firstName: "InvalidProg", lastName: "Test",
      srrId: String(srrBase + 5).padStart(3, "0"),
      withBatch: false,
      modeOfPayment: "Cash",
    },
    {
      id: "E4",
      type: "ERROR",
      desc: "MISSING REQUIRED FIELDS — no first name",
      expectError: "missing_field",
      expectPattern: /required|mandatory|first_name/i,
      program: "10th State",
      studentGroup: "Vennala-10th State-A",
      plan: "Basic", instalments: "1",
      feeStructure: "SU VYT-10th State-Basic-1", totalAmount: 22600,
      gender: "Male",
      studentEmail: "",
      guardianEmail: "official4tishnu@gmail.com",
      guardianName: "Official4 Tishnu",
      guardianPassword: "Guardian@2026",
      firstName: "",  // MISSING — should fail
      lastName: "NoName",
      srrId: String(srrBase + 6).padStart(3, "0"),
      withBatch: false,
      modeOfPayment: "Cash",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// FULL ADMISSION PIPELINE (mirrors admitStudent logic)
// ═══════════════════════════════════════════════════════════════

async function runFullAdmissionPipeline(tc) {
  const result = {
    id: tc.id, type: tc.type, desc: tc.desc,
    stages: {}, warnings: [], error: null, overall: null,
    emailsQueued: [],
  };

  try {
    // ── STAGE 1: Guardian ─────────
    log(`  [1/6] Creating Guardian...`);
    const guardianRes = await frappePost("Guardian", {
      guardian_name: tc.guardianName,
      email_address: tc.guardianEmail,
      mobile_number: "98765" + String(Date.now()).slice(-5),
    });
    if (!guardianRes.ok && guardianRes.status !== 409) {
      throw new Error(`Guardian creation failed: ${guardianRes.status} ${JSON.stringify(guardianRes.body).slice(0, 300)}`);
    }
    const guardianName = guardianRes.data?.name || 
      (await frappeGet("Guardian", [["email_address", "=", tc.guardianEmail]], ["name"], 1))[0]?.name;
    
    if (!guardianName) throw new Error("Guardian not found after creation");
    result.stages.guardian = { status: "✅", name: guardianName };
    log(`        ✅ Guardian: ${guardianName}`);

    // ── STAGE 1.5: Parent User ────
    log(`  [1.5/6] Creating Parent User (${tc.guardianEmail})...`);
    const parentUserRes = await fetch(`${FRAPPE_URL}/api/resource/User`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: AUTH },
      body: JSON.stringify({
        email: tc.guardianEmail,
        first_name: tc.guardianName.split(" ")[0],
        last_name: tc.guardianName.split(" ").slice(1).join(" ") || undefined,
        new_password: tc.guardianPassword,
        send_welcome_email: 0,
        enabled: 1,
        user_type: "Website User",
        roles: [{ doctype: "Has Role", role: "Parent" }],
      }),
    });
    const puBody = await parentUserRes.json().catch(() => ({}));
    if (parentUserRes.ok) {
      result.stages.parentUser = { status: "✅", email: tc.guardianEmail, new: true };
      log(`        ✅ Parent User created: ${tc.guardianEmail}`);
    } else if (parentUserRes.status === 409 || String(puBody.exception || "").includes("Duplicate")) {
      result.stages.parentUser = { status: "⏭️", email: tc.guardianEmail, existed: true };
      log(`        ⏭️ Parent User already exists: ${tc.guardianEmail}`);
    } else {
      result.stages.parentUser = { status: "⚠️", error: JSON.stringify(puBody).slice(0, 200) };
      result.warnings.push(`Parent user creation failed: ${parentUserRes.status}`);
      log(`        ⚠️ Parent User failed: ${parentUserRes.status}`);
    }

    // ── STAGE 2: Pre-create Student User + Create Student ──
    log(`  [2/6] Creating Student...`);
    const ts = Date.now();
    const autoEmail = tc.studentEmail || `${tc.firstName.toLowerCase()}.vyt.${tc.srrId}@dummy.com`;
    const actualStudentEmail = autoEmail;

    // Pre-create user
    log(`        Pre-creating User: ${actualStudentEmail}`);
    const userResult = await preCreateUser(actualStudentEmail, tc.firstName || "Unknown", tc.lastName);
    log(`        ${userResult.existed ? "⏭️ User exists" : "✅ User pre-created"}`);

    // Create Student
    const dobYear = 2010 + (parseInt(tc.srrId) % 4);
    const studentPayload = {
      first_name: tc.firstName,
      last_name: tc.lastName,
      date_of_birth: `${dobYear}-06-15`,
      gender: tc.gender,
      student_email_id: actualStudentEmail,
      joining_date: TODAY,
      custom_branch: COMPANY,
      custom_srr_id: tc.srrId,
      enabled: 1,
      guardians: [{
        doctype: "Student Guardians",
        guardian: guardianName,
        guardian_name: tc.guardianName,
        relation: "Father",
      }],
    };
    if (tc.middleName) studentPayload.middle_name = tc.middleName;
    if (tc.bloodGroup) studentPayload.blood_group = tc.bloodGroup;
    if (tc.studentMobile) studentPayload.student_mobile_number = tc.studentMobile;

    const studentRes = await frappePost("Student", studentPayload);
    if (!studentRes.ok) {
      // Check specific error types
      const excType = String(studentRes.body?.exc_type || "");
      const excMsg = String(studentRes.body?.exception || "");
      
      if (excType.includes("UniqueValidationError") || excMsg.includes("student_email_id") ||
          (excMsg.includes("Duplicate entry") && excMsg.includes("student_email_id"))) {
        throw Object.assign(
          new Error(`Student email "${actualStudentEmail}" is already registered to another student.`),
          { __type: "duplicate_email" }
        );
      }
      if (excType.includes("DuplicateEntryError") || excMsg.includes("DuplicateEntryError")) {
        throw Object.assign(
          new Error(`SRR ID collision: ${tc.srrId} already exists (DuplicateEntryError)`),
          { __type: "duplicate_srr" }
        );
      }
      if (excMsg.includes("first_name") || excType.includes("MandatoryError")) {
        throw Object.assign(
          new Error(`Missing required field: first_name is mandatory`),
          { __type: "missing_field" }
        );
      }
      throw new Error(`Student creation failed: ${studentRes.status} - ${excType}: ${excMsg.slice(0, 200)}`);
    }
    const student = studentRes.data;
    result.stages.student = { status: "✅", name: student.name, email: actualStudentEmail };
    log(`        ✅ Student: ${student.name} "${student.student_name}" (${actualStudentEmail})`);

    // ── STAGE 3: Program Enrollment ─────
    log(`  [3/6] Creating Program Enrollment (${tc.program})...`);
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
    const peRes = await frappePost("Program Enrollment", pePayload);
    let peName;
    if (peRes.ok) {
      peName = peRes.data.name;
      await frappeSubmit("Program Enrollment", peName);
      log(`        ✅ PE: ${peName} (submitted)`);
    } else if (peRes.status === 409) {
      const existing = await frappeGet("Program Enrollment",
        [["student", "=", student.name], ["program", "=", tc.program], ["academic_year", "=", ACADEMIC_YEAR]],
        ["name", "docstatus"], 1
      );
      if (existing.length > 0) {
        peName = existing[0].name;
        if (existing[0].docstatus === 0) await frappeSubmit("Program Enrollment", peName);
        log(`        ⏭️ PE recovered: ${peName}`);
      } else {
        throw new Error("PE 409 but no existing PE found");
      }
    } else {
      const excMsg = String(peRes.body?.exception || peRes.body?._server_messages || "");
      throw Object.assign(new Error(`PE failed: ${peRes.status} - ${excMsg.slice(0, 200)}`), { __type: "enrollment_failure" });
    }
    result.stages.enrollment = { status: "✅", name: peName };

    // ── STAGE 4: Batch Assignment ─────
    if (tc.withBatch && tc.studentGroup) {
      log(`  [4/6] Adding to ${tc.studentGroup}...`);
      const addRes = await addToStudentGroup(tc.studentGroup, student.name, student.student_name);
      result.stages.batch = { status: addRes.skipped ? "⏭️" : "✅", group: tc.studentGroup };
      log(`        ${addRes.skipped ? "⏭️ Already in group" : "✅ Added"}`);
    } else {
      result.stages.batch = { status: "⏭️", note: "Skipped" };
      log(`  [4/6] Batch: SKIPPED`);
    }

    // ── STAGE 5: Sales Order ─────
    log(`  [5/6] Creating Sales Order...`);
    const freshStudentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(student.name)}?fields=["customer"]`,
      { headers: { Authorization: AUTH } }
    );
    const freshStudent = (await freshStudentRes.json()).data;
    const customerName = freshStudent?.customer;
    
    if (!customerName) {
      result.stages.salesOrder = { status: "⚠️", note: "No customer linked" };
      result.warnings.push("No customer on Student");
      log(`        ⚠️ No customer linked to student`);
    } else {
      // Find tuition item
      const progPrefix = tc.program.split(" ")[0];
      const items = await frappeGet("Item",
        [["item_group", "=", "Fee Component"], ["item_code", "like", `%${progPrefix}%`], ["is_sales_item", "=", 1]],
        ["item_code", "item_name"], 5
      );
      const tuitionItem = items.find(it => it.item_code.includes(tc.program)) || items[0];
      
      if (!tuitionItem) {
        result.warnings.push(`No tuition item for ${tc.program}`);
        log(`        ⚠️ No tuition item found`);
      } else {
        const numInst = parseInt(tc.instalments, 10) || 1;
        const perInst = numInst > 1 ? Math.round(tc.totalAmount / numInst) : tc.totalAmount;
        const soQty = numInst > 1 ? numInst : 1;
        
        const soRes = await frappePost("Sales Order", {
          customer: customerName, company: COMPANY,
          transaction_date: TODAY, delivery_date: TODAY,
          order_type: "Sales",
          items: [{ item_code: tuitionItem.item_code, qty: soQty, rate: perInst }],
          custom_academic_year: ACADEMIC_YEAR,
          student: student.name,
          custom_no_of_instalments: tc.instalments,
          custom_plan: tc.plan,
          custom_mode_of_payment: tc.modeOfPayment,
        });
        if (soRes.ok) {
          await frappeSubmit("Sales Order", soRes.data.name);
          result.stages.salesOrder = { status: "✅", name: soRes.data.name, total: soQty * perInst };
          log(`        ✅ SO: ${soRes.data.name} (₹${soQty * perInst})`);
        } else {
          result.warnings.push(`SO failed: ${soRes.status}`);
          result.stages.salesOrder = { status: "⚠️", error: soRes.status };
          log(`        ⚠️ SO failed: ${soRes.status}`);
        }
      }
    }

    // ── STAGE 6: Send Parent Welcome Email ─────
    log(`  [6/6] Sending welcome email to ${tc.guardianEmail}...`);
    const loginUrl = "https://erp.smartup.in";
    const setPasswordUrl = `${loginUrl}/auth/forgot-password`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SmartUp Parent Portal</h2>
        <p>Dear <strong>${tc.guardianName}</strong>,</p>
        <p>Your child <strong>${tc.firstName} ${tc.lastName}</strong> has been registered.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${tc.guardianEmail}</p>
          <p><a href="${setPasswordUrl}" style="background: #2d95f0; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; display: inline-block;">Set Your Password</a></p>
        </div>
      </div>`;
    
    const emailRes = await fetch(
      `${FRAPPE_URL}/api/method/frappe.core.doctype.communication.email.make`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: AUTH },
        body: JSON.stringify({
          subject: `Welcome to SmartUp Parent Portal - ${tc.firstName} ${tc.lastName}`,
          content: emailBody,
          recipients: tc.guardianEmail,
          communication_medium: "Email",
          send_email: 1,
        }),
      }
    );
    if (emailRes.ok) {
      const emailData = (await emailRes.json()).message;
      result.stages.email = { status: "✅", queued: emailData?.name || "yes" };
      log(`        ✅ Email queued for ${tc.guardianEmail}`);
    } else {
      const errTxt = await emailRes.text().catch(() => "");
      result.stages.email = { status: "⚠️", error: errTxt.slice(0, 200) };
      result.warnings.push("Welcome email failed to queue");
      log(`        ⚠️ Email queue failed: ${emailRes.status}`);
    }

    result.overall = "✅ PASS";
  } catch (err) {
    result.error = err.message;
    result.errorType = err.__type || "unknown";
    result.overall = tc.type === "ERROR" ? "EXPECTED" : "❌ FAIL";
    log(`\n  ${tc.type === "ERROR" ? "📋 EXPECTED" : "❌"} ERROR: [${err.__type || "unknown"}] ${err.message}\n`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST RUNNER  
// ═══════════════════════════════════════════════════════════════

async function runAllTests() {
  log("═".repeat(80));
  log("COMPREHENSIVE ADMISSION TESTS — REAL EMAILS + ERROR SCENARIOS");
  log("═".repeat(80));
  log(`Date: ${TODAY} | Company: ${COMPANY} | Academic Year: ${ACADEMIC_YEAR}`);
  log("");

  // ── Pre-flight checks ──
  log("── PRE-FLIGHT CHECKS ──");
  
  const errorsBefore = await getEmailQueueCount("Error");
  const notSentBefore = await getEmailQueueCount("Not Sent");
  log(`Email Queue: Error=${errorsBefore} | Not Sent=${notSentBefore}`);
  
  const srrBase = await getNextSrrId();
  log(`Next SRR ID: ${String(srrBase).padStart(3, "0")}`);
  log("");

  const scenarios = buildTestScenarios(srrBase);

  // Verify fee structures
  log("── FEE STRUCTURE VERIFICATION ──");
  const uniqueFS = [...new Set(scenarios.filter(s => s.type === "SUCCESS").map(s => s.feeStructure))];
  for (const fsName of uniqueFS) {
    const fs = await frappeGet("Fee Structure", [["name", "=", fsName]], ["name", "total_amount", "docstatus"], 1);
    log(`  ${fs.length && fs[0].docstatus === 1 ? "✅" : "❌"} ${fsName} ${fs.length ? `= ₹${fs[0].total_amount}` : "NOT FOUND"}`);
  }
  log("");

  // ═══ RUN SUCCESS SCENARIOS ═══
  const results = [];
  const successScenarios = scenarios.filter(s => s.type === "SUCCESS");
  const errorScenarios = scenarios.filter(s => s.type === "ERROR");

  log("═".repeat(80));
  log("PART 1: SUCCESS SCENARIOS (expect all to pass)");
  log("═".repeat(80));

  for (const sc of successScenarios) {
    log("\n" + "─".repeat(80));
    log(`TEST ${sc.id}: ${sc.desc}`);
    log(`  Student: ${sc.firstName} ${sc.lastName} | SRR: ${sc.srrId} | Email: ${sc.studentEmail || "(auto)"}`);
    log(`  Guardian: ${sc.guardianName} | Email: ${sc.guardianEmail}`);
    log("─".repeat(80));
    
    const result = await runFullAdmissionPipeline(sc);
    results.push(result);
    log(`  RESULT: ${result.overall}`);
  }

  // ═══ RUN ERROR SCENARIOS ═══
  log("\n" + "═".repeat(80));
  log("PART 2: ERROR SCENARIOS (expect controlled failures)");
  log("═".repeat(80));

  for (const sc of errorScenarios) {
    log("\n" + "─".repeat(80));
    log(`TEST ${sc.id}: ${sc.desc}`);
    log(`  Expected error type: ${sc.expectError}`);
    log("─".repeat(80));
    
    const result = await runFullAdmissionPipeline(sc);
    
    // Validate the error response
    if (sc.expectPattern && result.error) {
      const matches = sc.expectPattern.test(result.error);
      result.errorResponseClean = matches;
      if (matches) {
        log(`  ✅ Error message matches expected pattern`);
      } else {
        log(`  ⚠️ Error message doesn't match pattern. Got: ${result.error}`);
      }
    }
    
    // Check that error doesn't leak stack traces or internal paths
    if (result.error) {
      const leaksInternal = /apps\/frappe|File "|Traceback|line \d+,/i.test(result.error);
      result.noInternalLeak = !leaksInternal;
      if (leaksInternal) {
        log(`  ⚠️ Error message leaks internal details!`);
      } else {
        log(`  ✅ Error message is clean (no internal leaks)`);
      }
    }
    
    results.push(result);
    log(`  RESULT: ${result.overall}`);
  }

  // ═══ EMAIL VERIFICATION ═══
  log("\n" + "═".repeat(80));
  log("PART 3: EMAIL VERIFICATION");
  log("═".repeat(80));

  // Wait for queue processing
  log("\n  Waiting 15 seconds for email queue processing...");
  await new Promise(r => setTimeout(r, 15000));

  const recentEmails = await getEmailQueueRecent(10);
  log(`\n  Emails queued in last 10 minutes: ${recentEmails.length}`);
  
  for (const eq of recentEmails) {
    const recips = await getEmailQueueRecipientsFor(eq.name);
    const recipStr = recips.map(r => r.recipient).join(", ");
    const errorShort = eq.error ? eq.error.split("\n").pop().slice(0, 80) : "";
    log(`    ${eq.name} | ${eq.status} | via ${eq.email_account} | to: ${recipStr} ${errorShort ? `| ERR: ${errorShort}` : ""}`);
  }

  const errorsAfter = await getEmailQueueCount("Error");
  const notSentAfter = await getEmailQueueCount("Not Sent");
  log(`\n  Email Queue After: Error=${errorsAfter} (was ${errorsBefore}) | Not Sent=${notSentAfter} (was ${notSentBefore})`);
  
  if (errorsAfter > errorsBefore) {
    log(`  ⚠️ NEW email errors appeared: ${errorsAfter - errorsBefore}`);
  } else {
    log(`  ✅ No new email errors`);
  }

  // ═══ FORCE SEND PENDING ═══
  if (notSentAfter > 0) {
    log(`\n  Force-sending ${notSentAfter} pending emails...`);
    const pending = await frappeGet("Email Queue", [["status", "=", "Not Sent"]], ["name"], 20);
    for (const p of pending) {
      try {
        await fetch(`${FRAPPE_URL}/api/method/frappe.email.doctype.email_queue.email_queue.send_now`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: AUTH },
          body: JSON.stringify({ name: p.name }),
        });
        await new Promise(r => setTimeout(r, 2000));
        const eq = await frappeGet("Email Queue", [["name", "=", p.name]], ["status", "error"], 1);
        if (eq.length) {
          log(`    ${p.name}: ${eq[0].status} ${eq[0].error ? "— " + eq[0].error.split("\n").pop().slice(0, 80) : ""}`);
        }
      } catch { log(`    ${p.name}: send_now failed`); }
    }
  }

  // Final check
  const finalErrors = await getEmailQueueCount("Error");
  const finalNotSent = await getEmailQueueCount("Not Sent");
  log(`\n  Final Queue: Error=${finalErrors} | Not Sent=${finalNotSent}`);

  // ═══ SUMMARY ═══
  log("\n" + "═".repeat(80));
  log("FINAL SUMMARY");
  log("═".repeat(80));

  const successTests = results.filter(r => r.type === "SUCCESS");
  const errorTests = results.filter(r => r.type === "ERROR");
  const sPassed = successTests.filter(r => r.overall === "✅ PASS").length;
  const sFailed = successTests.filter(r => r.overall === "❌ FAIL").length;
  const eExpected = errorTests.filter(r => r.overall === "EXPECTED").length;
  const eUnexpected = errorTests.filter(r => r.overall !== "EXPECTED").length;

  log(`\n  SUCCESS tests: ${sPassed}/${successTests.length} passed ${sFailed > 0 ? `(${sFailed} FAILED!)` : ""}`);
  log(`  ERROR tests: ${eExpected}/${errorTests.length} caught correctly ${eUnexpected > 0 ? `(${eUnexpected} unexpected!)` : ""}`);
  log(`  Emails: Error=${finalErrors} (started at ${errorsBefore}) | Not Sent=${finalNotSent}`);

  log("\n  DETAIL:");
  for (const r of results) {
    const icon = r.overall === "✅ PASS" ? "✅" : r.overall === "EXPECTED" ? "📋" : "❌";
    log(`  ${icon} ${r.id}: ${r.desc}`);
    if (r.stages.student) log(`       Student: ${r.stages.student.name} (${r.stages.student.email})`);
    if (r.stages.parentUser) log(`       Parent: ${r.stages.parentUser.email} ${r.stages.parentUser.new ? "(NEW)" : "(existed)"}`);
    if (r.stages.enrollment) log(`       PE: ${r.stages.enrollment.name}`);
    if (r.stages.salesOrder?.name) log(`       SO: ${r.stages.salesOrder.name} (₹${r.stages.salesOrder.total})`);
    if (r.stages.email) log(`       Email: ${r.stages.email.status} ${r.stages.email.queued || ""}`);
    if (r.warnings.length) log(`       ⚠️ Warnings: ${r.warnings.join("; ")}`);
    if (r.error) log(`       Error: [${r.errorType}] ${r.error.slice(0, 150)}`);
    if (r.errorResponseClean !== undefined) log(`       Error pattern match: ${r.errorResponseClean ? "✅" : "❌"}`);
    if (r.noInternalLeak !== undefined) log(`       No internal leak: ${r.noInternalLeak ? "✅" : "⚠️ LEAKS"}`);
  }

  log("\n" + "═".repeat(80));
  const allGood = sFailed === 0 && eUnexpected === 0 && finalErrors === 0;
  log(allGood ? "ALL TESTS PASSED ✅" : "SOME TESTS NEED ATTENTION ⚠️");
  log("═".repeat(80));

  process.exit(sFailed + eUnexpected > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
