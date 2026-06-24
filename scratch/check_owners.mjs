const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";

async function main() {
  const url = `${FRAPPE_URL}/api/resource/Student?limit_page_length=1000&fields=["user"]`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${API_KEY}:${API_SECRET}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    console.error("Failed:", res.status, await res.text());
    return;
  }
  const json = await res.json();
  const userCounts = {};
  for (const s of json.data ?? []) {
    if (s.user) {
      userCounts[s.user] = (userCounts[s.user] || 0) + 1;
    }
  }
  console.log("Student User field counts:", userCounts);
}

main().catch(console.error);
