// verify-wa-fix.mjs — validates the fixed WA fetch approach
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const BASE = "https://smartup.m.frappe.cloud";
const h = { Authorization: AUTH, Accept: "application/json" };

async function main() {
  console.log("=== 1. Fetch WA headers list ===");
  const listRes = await fetch(
    `${BASE}/api/resource/Work Assignment?fields=["name","deadline","for_branch","docstatus"]&filters=[["docstatus","!=",2]]&limit_page_length=5000`,
    { headers: h }
  );
  const listJson = await listRes.json();
  const waHeaders = listJson.data ?? [];
  console.log(`Found ${waHeaders.length} WA headers:`, JSON.stringify(waHeaders, null, 2));

  console.log("\n=== 2. Fetch each full document and extract assignments ===");
  const allDetails = [];
  for (const wa of waHeaders) {
    console.log(`  Fetching full doc: ${wa.name} (deadline: ${wa.deadline})...`);
    const docRes = await fetch(
      `${BASE}/api/resource/Work%20Assignment/${encodeURIComponent(wa.name)}`,
      { headers: h }
    );
    if (!docRes.ok) {
      console.log(`  ❌ Failed: HTTP ${docRes.status}`);
      continue;
    }
    const docJson = await docRes.json();
    const assignments = docJson?.data?.assignments ?? [];
    console.log(`  ✅ Got ${assignments.length} assignment rows`);
    for (const row of assignments) {
      allDetails.push({
        instructor: row.instructor,
        submission_status: row.submission_status,
        approval_status: row.approval_status,
        submitted_on: row.submitted_on,
        deadline: wa.deadline,
      });
    }
  }

  console.log("\n=== 3. All extracted WA detail rows ===");
  console.log(JSON.stringify(allDetails, null, 2));

  console.log("\n=== 4. Simulated waMap (instructor → stats) ===");
  const waMap = new Map();
  for (const d of allDetails) {
    if (!d.instructor) continue;
    if (!waMap.has(d.instructor)) waMap.set(d.instructor, { total: 0, approved: 0, onTime: 0, rejected: 0 });
    const rec = waMap.get(d.instructor);
    rec.total++;
    if (d.approval_status === "Approved") rec.approved++;
    if (d.approval_status === "Rejected") rec.rejected++;
    if (d.submission_status === "Submitted" && d.submitted_on && d.submitted_on !== "undefined") {
      const submittedDate = d.submitted_on.slice(0, 10);
      if (d.deadline && submittedDate <= d.deadline) rec.onTime++;
    }
  }
  console.log(Object.fromEntries(waMap));
}

main().catch(console.error);
