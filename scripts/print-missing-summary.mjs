import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function printSummary() {
  let start = 0;
  const allResults = [];

  while (true) {
    const filters = JSON.stringify([
      ["assessment_group", "=", "Diagnosis Exam"],
      ["docstatus", "!=", 2],
    ]);
    const fields = JSON.stringify([
      "name",
      "student",
      "student_name",
      "course",
      "custom_branch",
      "total_score",
      "maximum_score",
      "custom_diagnosed_level"
    ]);

    const res = await fetch(
      `${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
        filters
      )}&fields=${encodeURIComponent(fields)}&limit_start=${start}&limit_page_length=1000`,
      { headers }
    );

    if (!res.ok) break;
    const data = (await res.json()).data || [];
    allResults.push(...data);
    if (data.length < 1000) break;
    start += 1000;
  }

  const withLevel = allResults.filter((r) => r.custom_diagnosed_level);
  const withoutLevel = allResults.filter((r) => !r.custom_diagnosed_level);

  console.log(`TOTAL_RESULTS=${allResults.length}`);
  console.log(`WITH_LEVEL=${withLevel.length}`);
  console.log(`WITHOUT_LEVEL=${withoutLevel.length}`);

  const byBranch = {};
  const byCourse = {};
  const studentMap = new Map();

  for (const r of withoutLevel) {
    const branch = r.custom_branch || "Unknown Branch";
    byBranch[branch] = (byBranch[branch] || 0) + 1;

    const course = r.course || "Unknown Course";
    byCourse[course] = (byCourse[course] || 0) + 1;

    if (!studentMap.has(r.student)) {
      studentMap.set(r.student, {
        id: r.student,
        name: r.student_name,
        branch: r.custom_branch,
        courses: [],
      });
    }
    studentMap.get(r.student).courses.push(r.course);
  }

  console.log("\n--- BY BRANCH ---");
  for (const [k, v] of Object.entries(byBranch).sort((a,b) => b[1] - a[1])) {
    console.log(`${k}: ${v}`);
  }

  console.log("\n--- BY COURSE ---");
  for (const [k, v] of Object.entries(byCourse).sort((a,b) => b[1] - a[1])) {
    console.log(`${k}: ${v}`);
  }

  console.log(`\nTOTAL_STUDENTS_MISSING=${studentMap.size}`);
}

printSummary().catch(console.error);
