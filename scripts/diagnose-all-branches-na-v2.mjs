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
    // Get all branches
    console.log("=== BRANCHES IN SYSTEM ===\n");
    const branches = await frappeGet("Branch", {
      fields: JSON.stringify(["name", "branch"]),
      limit_page_length: "0",
    });

    console.log("Available Branches:");
    branches.forEach((b) => console.log(`  - ${b.name}`));
    console.log();

    // Get total active students
    console.log("=== TOTAL ACTIVE STUDENTS ===\n");
    const allStudents = await frappeGet("Student", {
      fields: JSON.stringify(["name", "student_name", "custom_branch"]),
      filters: JSON.stringify([["enabled", "=", 1]]),
      limit_page_length: "0",
    });

    console.log(`Total active students: ${allStudents.length}\n`);

    // Group by branch
    const byBranch = {};
    allStudents.forEach((s) => {
      const branch = s.custom_branch || "(no branch)";
      byBranch[branch] = (byBranch[branch] || 0) + 1;
    });

    console.log("Students by branch:");
    Object.entries(byBranch)
      .sort((a, b) => b[1] - a[1])
      .forEach(([branch, count]) => {
        console.log(`  ${branch}: ${count}`);
      });

    console.log();

    // Now diagnose for each branch with students
    console.log("=== N/A ANALYSIS FOR ALL BRANCHES ===\n");

    for (const [branch, totalInBranch] of Object.entries(byBranch)) {
      if (branch === "(no branch)" || totalInBranch === 0) continue;

      const branchStudents = allStudents.filter((s) => s.custom_branch === branch);
      const studentIds = branchStudents.map((s) => s.name);

      // Get enrolled students in batches to avoid URL length issues
      const enrolledIds = new Set();
      const batchSize = 50;

      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        const enrollments = await frappeGet("Program Enrollment", {
          fields: JSON.stringify(["student", "custom_plan", "student_category"]),
          filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["student", "in", batch],
          ]),
          limit_page_length: "0",
        });

        enrollments.forEach((e) => enrolledIds.add(e.student));
      }

      const naCount = totalInBranch - enrolledIds.size;

      console.log(`Branch: ${branch}`);
      console.log(`  Total Active: ${totalInBranch}`);
      console.log(`  With Enrollment: ${enrolledIds.size}`);
      console.log(`  N/A: ${naCount}`);

      if (naCount > 0) {
        const naStudents = branchStudents.filter((s) => !enrolledIds.has(s.name));
        console.log(`  N/A Student IDs:`);
        naStudents.forEach((s) => console.log(`    - ${s.name} (${s.student_name})`));
      }
      console.log();
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
