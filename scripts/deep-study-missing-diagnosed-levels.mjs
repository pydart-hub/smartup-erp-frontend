import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function studyUnsetDiagnosisResults() {
  console.log("Fetching all Diagnosis Exam results from Frappe Cloud...");
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
      "custom_diagnosed_level",
      "docstatus"
    ]);

    const res = await fetch(
      `${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
        filters
      )}&fields=${encodeURIComponent(fields)}&limit_start=${start}&limit_page_length=1000`,
      { headers }
    );

    if (!res.ok) {
      console.error("Failed to fetch page at start", start, await res.text());
      break;
    }

    const data = (await res.json()).data || [];
    allResults.push(...data);
    if (data.length < 1000) break;
    start += 1000;
  }

  console.log(`Total Diagnosis Exam Assessment Results fetched: ${allResults.length}`);

  const withLevel = allResults.filter((r) => r.custom_diagnosed_level);
  const withoutLevel = allResults.filter((r) => !r.custom_diagnosed_level);

  console.log(`- Results WITH diagnosed level: ${withLevel.length}`);
  console.log(`- Results WITHOUT diagnosed level: ${withoutLevel.length}`);

  // Breakdown by Branch
  const byBranch = {};
  // Breakdown by Course (Subject)
  const byCourse = {};
  // Breakdown by Student
  const studentMap = new Map();

  for (const r of withoutLevel) {
    const branch = r.custom_branch || "Unknown Branch";
    byBranch[branch] = (byBranch[branch] || 0) + 1;

    const course = r.course || "Unknown Course";
    byCourse[course] = (byCourse[course] || 0) + 1;

    if (!studentMap.has(r.student)) {
      studentMap.set(r.student, {
        studentId: r.student,
        studentName: r.student_name,
        branch: r.custom_branch,
        missingCourses: [],
      });
    }
    studentMap.get(r.student).missingCourses.push({
      resultId: r.name,
      course: r.course,
      score: r.total_score,
      maxScore: r.maximum_score,
    });
  }

  console.log("\n================ MISSING BY BRANCH ================");
  console.table(byBranch);

  console.log("\n================ MISSING BY SUBJECT / COURSE ================");
  console.table(byCourse);

  console.log(`\nTotal Unique Students missing diagnosed level in at least 1 subject: ${studentMap.size}`);

  const sampleStudents = Array.from(studentMap.values()).slice(0, 10);
  console.log("\nSample Students (first 10) and their missing subjects:");
  console.log(JSON.stringify(sampleStudents, null, 2));
}

studyUnsetDiagnosisResults().catch(console.error);
