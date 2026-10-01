import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

// Map of Nuvel's Frappe Assessment Result records to their computed online exam Diagnosed Levels
const nuvelUpdates = [
  { name: 'EDU-RES-2026-51869', course: '10th Biology', diagnosed_level: '7th' },
  { name: 'EDU-RES-2026-52080', course: '10th Mathematics', diagnosed_level: '7th' },
  { name: 'EDU-RES-2026-52228', course: '10th Chemistry', diagnosed_level: '6th' },
  { name: 'EDU-RES-2026-52397', course: '10th English', diagnosed_level: '6th' },
  { name: 'EDU-RES-2026-52553', course: '10th Hindi', diagnosed_level: '6th' },
  { name: 'EDU-RES-2026-52827', course: '10th Malayalam', diagnosed_level: '6th' },
];

async function updateNuvel() {
  console.log("=== UPDATING REMAINING SUBJECTS FOR NUVEL JOHN K J ===");
  for (const item of nuvelUpdates) {
    const res = await fetch(`${url}/api/resource/Assessment%20Result/${encodeURIComponent(item.name)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ custom_diagnosed_level: item.diagnosed_level }),
    });

    if (!res.ok) {
      console.error(`Failed to update ${item.course} (${item.name}):`, await res.text());
    } else {
      console.log(`✅ Updated ${item.course} (${item.name}) => custom_diagnosed_level: "${item.diagnosed_level}"`);
    }
  }

  // Verification
  console.log("\n=== VERIFYING NUVEL JOHN IN FRAPPE ===");
  const filter = JSON.stringify([["student", "=", "STU-SU CHL-26-006"], ["assessment_group", "=", "Diagnosis Exam"]]);
  const fields = JSON.stringify(["name", "course", "total_score", "custom_diagnosed_level"]);
  const verifyRes = await fetch(`${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(filter)}&fields=${encodeURIComponent(fields)}`, { headers });
  const verifyData = await verifyRes.json();
  console.table(verifyData.data);
}

updateNuvel().catch(console.error);
