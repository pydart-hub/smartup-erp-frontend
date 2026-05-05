/**
 * fix_plans_method.mjs
 * Migrate Kadavanthra Program Enrollment records to new fee structure.
 * 
 * OLD: Basic, Intermediate, Advanced plans
 * NEW: Basic plan only
 * 
 * Task: Find all Kadavanthra enrollments with Intermediate/Advanced plans
 *       and update them to "Basic" (the only available plan now).
 */

import axios from "axios";
import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const client = axios.create({
  baseURL: API_URL,
  auth: { username: API_KEY, password: API_SECRET },
  headers: { "Content-Type": "application/json" },
});

// ── Helper functions ──────────────────────────────────────────

async function fetchEnrollments(company, plans = []) {
  /**
   * Fetch Program Enrollment records for a company with specific plans.
   * plans: array of plan names ["Intermediate", "Advanced", ""] or empty to get all
   */
  try {
    const filters = [["company", "=", company]];
    if (plans.length > 0) {
      filters.push(["custom_plan", "in", plans]);
    }

    const response = await client.post(
      `/api/method/frappe.client.get_list`,
      null,
      {
        params: {
          doctype: "Program Enrollment",
          filters: JSON.stringify(filters),
          fields: JSON.stringify([
            "name",
            "student",
            "student_name",
            "program",
            "academic_year",
            "custom_plan",
            "custom_no_of_instalments",
            "custom_fee_structure",
            "docstatus",
            "enrollment_date",
          ]),
          limit_page_length: 500,
        },
      }
    );

    return response.data?.message || [];
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Failed to fetch enrollments: ${msg}`);
  }
}

async function updateEnrollmentPlan(enrollmentName, newPlan, newInstalments) {
  /**
   * Update Program Enrollment custom_plan and custom_no_of_instalments
   */
  try {
    const response = await client.post(
      `/api/method/frappe.client.set_value`,
      {
        doctype: "Program Enrollment",
        name: enrollmentName,
        fieldname: {
          custom_plan: newPlan,
          custom_no_of_instalments: newInstalments || "1",
        },
      }
    );
    return response.data?.message;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Failed to update enrollment: ${msg}`);
  }
}

// ── Main migration function ──────────────────────────────────

async function migrateKadavantraPlans() {
  console.log("🔧 MIGRATING KADAVANTHRA PLANS TO NEW FEE STRUCTURE\n");
  console.log("=".repeat(70));

  const KADAVANTHRA_COMPANY = "Smart Up Kadavanthra";
  const OLD_PLANS = ["Intermediate", "Advanced"];
  const NEW_PLAN = "Basic";

  try {
    // 1. Fetch all Kadavanthra enrollments with old plans
    console.log(`\n📋 Fetching Kadavanthra enrollments with plans: ${OLD_PLANS.join(", ")}...\n`);
    const enrollments = await fetchEnrollments(KADAVANTHRA_COMPANY, OLD_PLANS);

    if (enrollments.length === 0) {
      console.log("✅ No enrollments with old plans found — migration complete!");
      return;
    }
    console.log(`Found ${enrollments.length} enrollments to migrate:\n`);
    // 2. Group by program to show impact
    const byProgram = {};
    enrollments.forEach((e) => {
      if (!byProgram[e.program]) byProgram[e.program] = [];
      byProgram[e.program].push(e);
    });
    for (const [prog, items] of Object.entries(byProgram)) {
      console.log(`  ${prog}: ${items.length} students`);
      items.forEach((e) => {
        console.log(
          `    - ${e.name} (${e.student_name}): ${e.custom_plan} → ${NEW_PLAN}`
        );
      });
    }
    // 3. Ask for confirmation
    console.log("\n" + "=".repeat(70));
    console.log(
      "\n⚠️  About to update " +
        enrollments.length +
        " Program Enrollment records.\n"
    );
    console.log(
      "This will change custom_plan to 'Basic' and set custom_no_of_instalments to '1'.\n"
    );
    // Auto-proceed (for CI/CD) — can add user prompt later if needed
    console.log("Proceeding with migration...\n");
    // 4. Update each enrollment
    let updated = 0;
    let failed = 0;
    const failedRecords = [];
    for (const enrollment of enrollments) {
      try {
        await updateEnrollmentPlan(enrollment.name, NEW_PLAN, "1");
        updated++;
        console.log(
          `✅ ${enrollment.name}: ${enrollment.custom_plan} → ${NEW_PLAN}`
        );
      } catch (err) {
        failed++;
        failedRecords.push({ name: enrollment.name, error: err.message });
        console.log(`❌ ${enrollment.name}: ${err.message}`);
      }
    }
    // 5. Summary
    console.log("\n" + "=".repeat(70));
    console.log("\n📊 MIGRATION SUMMARY\n");
    console.log(`Total processed: ${enrollments.length}`);
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    if (failed > 0) {
      console.log("\nFailed Records:");
      failedRecords.forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ MIGRATION COMPLETE\n");
  } catch (err) {
    console.error(`\n❌ MIGRATION FAILED\n${err.message}`);
    process.exit(1);
  }
}
// ── Execute ──────────────────────────────────────────────
migrateKadavantraPlans().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
