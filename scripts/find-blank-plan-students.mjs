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
  try {
    console.log("=".repeat(80));
    console.log("🎯 FINDING THE 2 'BLANK PLAN' STUDENTS IN KADAVANTHRA");
    console.log("=".repeat(80));
    console.log();

    // Step 1: Get all active students in Kadavanthra
    const students = await frappeGet("Student", {
      fields: JSON.stringify(["name", "student_name"]),
      filters: JSON.stringify([
        ["custom_branch", "=", "Smart Up Kadavanthara"],
        ["enabled", "=", 1],
      ]),
      limit_page_length: "0",
    });

    console.log(`Found ${students.length} active students in Kadavanthra\n`);

    // Step 2: Get all enrollments for these students in batches
    const batchSize = 50;
    const allEnrollments = [];

    const studentIds = students.map((s) => s.name);

    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      const enrollments = await frappeGet("Program Enrollment", {
        fields: JSON.stringify([
          "name",
          "student",
          "custom_plan",
          "student_category",
          "enrollment_date",
          "docstatus",
        ]),
        filters: JSON.stringify([
          ["docstatus", "=", 1],
          ["student", "in", batch],
        ]),
        order_by: "student, enrollment_date desc",
        limit_page_length: "0",
      });
      allEnrollments.push(...enrollments);
    }

    console.log(`Found ${allEnrollments.length} program enrollment records\n`);

    // Step 3: Get latest enrollment per student
    const latestByStudent = {};
    for (const enrollment of allEnrollments) {
      if (!latestByStudent[enrollment.student]) {
        latestByStudent[enrollment.student] = enrollment;
      }
    }

    console.log("Latest Enrollment Per Student:");
    console.log("=".repeat(80));
    console.log();

    // Step 4: Find blank plan students
    const blankPlanStudents = [];

    for (const enrollment of Object.values(latestByStudent)) {
      const plan = (enrollment.custom_plan || "").trim();
      const category = (enrollment.student_category || "").trim();

      const studentInfo = students.find((s) => s.name === enrollment.student);
      const studentName = studentInfo?.student_name || "Unknown";

      console.log(`Student: ${enrollment.student} (${studentName})`);
      console.log(`  Name: ${enrollment.name}`);
      console.log(`  Plan: "${plan}" ${plan ? "✓" : "❌ BLANK"}`);
      console.log(`  Category: "${category}" ${category ? "✓" : "❌ BLANK"}`);
      console.log(`  Date: ${enrollment.enrollment_date}`);
      console.log();

      if (!plan && !category) {
        blankPlanStudents.push({
          student_id: enrollment.student,
          student_name: studentName,
          enrollment_id: enrollment.name,
          plan: plan,
          category: category,
          date: enrollment.enrollment_date,
        });
      }
    }

    // Step 5: Summary
    console.log("=".repeat(80));
    console.log("📊 BLANK PLAN SUMMARY");
    console.log("=".repeat(80));
    console.log();
    console.log(
      `Students with BLANK plan AND BLANK category: ${blankPlanStudents.length}`
    );
    console.log();

    if (blankPlanStudents.length > 0) {
      console.log("🎯 These are the N/A students:\n");
      blankPlanStudents.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.student_id} - ${s.student_name}`);
        console.log(`   Enrollment: ${s.enrollment_id}`);
        console.log(`   Date: ${s.date}`);
        console.log();
      });
    }

    console.log("=".repeat(80));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
