#!/usr/bin/env node

/**
 * Diagnostic script to find N/A plan students in Kadavanthra branch
 * 
 * This script identifies:
 * 1. All active students in Kadavanthra
 * 2. All students with Program Enrollments
 * 3. The students who are MISSING from Program Enrollment (N/A)
 * 4. Detailed info about each N/A student
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
  console.log("=".repeat(80));
  console.log("🔍 N/A PLAN ANALYSIS FOR KADAVANTHRA BRANCH");
  console.log("=".repeat(80));
  console.log();

  try {
    // STEP 1: Get all ACTIVE students in Kadavanthra
    console.log("STEP 1: Fetching all active students in Kadavanthra...");
    const activeStudents = await frappeGet("Student", {
      fields: JSON.stringify([
        "name",
        "student_name",
        "custom_branch",
        "enabled",
        "custom_student_type",
      ]),
      filters: JSON.stringify([
        ["custom_branch", "=", "Kadavanthra"],
        ["enabled", "=", 1],
      ]),
      limit_page_length: "0",
    });

    console.log(`✓ Found ${activeStudents.length} active students in Kadavanthra`);
    console.log();

    // STEP 2: Get all students with Program Enrollments
    console.log("STEP 2: Fetching students with Program Enrollments in Kadavanthra...");
    const enrolledStudents = await frappeGet("Program Enrollment", {
      fields: JSON.stringify([
        "student",
        "custom_plan",
        "student_category",
        "enrollment_date",
        "name",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["student", "in", activeStudents.map((s) => s.name)],
      ]),
      order_by: "student, enrollment_date desc",
      limit_page_length: 0,
    });

    console.log(`✓ Found ${enrolledStudents.length} Program Enrollment records`);
    console.log();

    // STEP 3: Get unique students with enrollments
    const enrolledStudentIds = new Set();
    const latestByStudent = {};

    for (const enrollment of enrolledStudents) {
      if (!latestByStudent[enrollment.student]) {
        latestByStudent[enrollment.student] = enrollment;
        enrolledStudentIds.add(enrollment.student);
      }
    }

    console.log(`✓ ${enrolledStudentIds.size} unique students have enrollments`);
    console.log();

    // STEP 4: Find N/A students (active but no enrollment)
    console.log("STEP 3: Identifying N/A students (active but missing Program Enrollment)...");
    const naStudents = activeStudents.filter((s) => !enrolledStudentIds.has(s.name));

    console.log();
    console.log(`⚠️  FOUND ${naStudents.length} N/A STUDENTS:`);
    console.log("=".repeat(80));
    console.log();

    for (const student of naStudents) {
      console.log(`📋 Student ID: ${student.name}`);
      console.log(`   Name: ${student.student_name || "(no name)"}`);
      console.log(`   Email: ${student.email || "(no email)"}`);
      console.log(`   Type: ${student.custom_student_type || "(not set)"}`);
      console.log(`   Reason: NO Program Enrollment record (docstatus=1) exists`);
      console.log();
    }

    // STEP 5: Summary Statistics
    console.log("=".repeat(80));
    console.log("📊 SUMMARY STATISTICS");
    console.log("=".repeat(80));
    console.log();
    console.log(`Total Active Students in Kadavanthra: ${activeStudents.length}`);
    console.log(`Students with Program Enrollment:     ${enrolledStudentIds.size}`);
    console.log(`N/A Students (no enrollment):         ${naStudents.length}`);
    console.log();

    // STEP 6: Plan distribution for students WITH enrollment
    console.log("Plan Distribution (students with enrollment):");
    console.log("-".repeat(50));

    const planCounts = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0 };

    for (const enrollment of Object.values(latestByStudent)) {
      const category = (enrollment.student_category || "").toLowerCase();
      const plan = (enrollment.custom_plan || "").toLowerCase();

      if (category === "free access") {
        planCounts.freeAccess++;
      } else if (category === "demo") {
        planCounts.demo++;
      } else if (plan === "advanced") {
        planCounts.advanced++;
      } else if (plan === "intermediate") {
        planCounts.intermediate++;
      } else if (plan === "basic") {
        planCounts.basic++;
      }
    }

    console.log(`  Advanced:     ${planCounts.advanced}`);
    console.log(`  Intermediate: ${planCounts.intermediate}`);
    console.log(`  Basic:        ${planCounts.basic}`);
    console.log(`  Free Access:  ${planCounts.freeAccess}`);
    console.log(`  Demo:         ${planCounts.demo}`);
    console.log(
      `  TOTAL:        ${planCounts.advanced + planCounts.intermediate + planCounts.basic + planCounts.freeAccess + planCounts.demo}`
    );
    console.log();

    // STEP 7: Verification
    console.log("✅ VERIFICATION:");
    console.log(
      `   Active: ${activeStudents.length} = Enrolled: ${enrolledStudentIds.size} + N/A: ${naStudents.length}`
    );
    console.log(
      `   ${activeStudents.length} = ${enrolledStudentIds.size} + ${naStudents.length} ✓`
    );
    console.log();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
