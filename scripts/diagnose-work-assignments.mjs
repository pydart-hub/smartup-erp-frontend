/**
 * Diagnose Work Assignment data for instructor Anju venu
 * Run: node scripts/diagnose-work-assignments.mjs
 */

const BASE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function get(path) {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

(async () => {
  console.log("=== 1. All Work Assignments ===");
  const waList = await get(
    `resource/Work%20Assignment?fields=${encodeURIComponent(JSON.stringify(["name","title","docstatus","for_branch","deadline"]))}&limit_page_length=50`
  );
  console.log(JSON.stringify(waList.data?.data || waList.data, null, 2));

  console.log("\n=== 2. Work Assignment Detail rows (all) ===");
  const detailList = await get(
    `resource/Work%20Assignment%20Detail?fields=${encodeURIComponent(JSON.stringify(["name","parent","instructor","submission_status","approval_status"]))}&limit_page_length=100`
  );
  console.log(JSON.stringify(detailList.data?.data || detailList.data, null, 2));

  console.log("\n=== 3. Instructor records (to see the name field) ===");
  const instList = await get(
    `resource/Instructor?fields=${encodeURIComponent(JSON.stringify(["name","instructor_name"]))}&limit_page_length=50`
  );
  console.log(JSON.stringify(instList.data?.data || instList.data, null, 2));

  console.log("\n=== 4. Full details of WA-00001 ===");
  const wa1 = await get(`resource/Work%20Assignment/WA-00001`);
  console.log(JSON.stringify(wa1.data?.data || wa1.data, null, 2));
})();
