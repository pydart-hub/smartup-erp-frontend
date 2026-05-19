import https from "https";

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "smartup.m.frappe.cloud",
        path,
        headers: { Authorization: "token 03330270e330d49:9c2261ae11ac2d2" },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(JSON.parse(d)));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const fields = encodeURIComponent(
  JSON.stringify([
    "name","student_group_name","program","custom_branch",
    "batch","academic_year","custom_is_one_to_one",
  ])
);
const filters = encodeURIComponent(JSON.stringify([["group_based_on", "=", "Batch"]]));

const r = await get(
  `/api/resource/Student%20Group?fields=${fields}&filters=${filters}&limit_page_length=500`
);

const groups = r.data || [];
console.log("TOTAL GROUPS:", groups.length);

// Group by custom_branch
const byBranch = {};
for (const g of groups) {
  const b = g.custom_branch || "Unknown";
  if (!byBranch[b]) byBranch[b] = [];
  byBranch[b].push(g);
}

for (const [branch, gs] of Object.entries(byBranch)) {
  console.log(`\n=== ${branch} (${gs.length} groups) ===`);
  for (const g of gs) {
    const tag = g.custom_is_one_to_one ? " [O2O]" : "";
    console.log(`  ${g.name} | prog: ${g.program} | batch: ${g.batch} | yr: ${g.academic_year}${tag}`);
  }
}

// Also fetch Student Batch Names
const batchNamesRes = await get(
  `/api/resource/Student%20Batch%20Name?fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=200`
);
console.log("\n=== STUDENT BATCH NAMES ===");
for (const b of batchNamesRes.data || []) {
  console.log(" ", b.name);
}
