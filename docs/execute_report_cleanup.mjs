import fs from "fs";
// Using native fetch in Node.js 18+

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeDelete(path) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "DELETE",
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe DELETE ${path} error (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  const content = fs.readFileSync("docs/exact_duplicates_deep_study.md", "utf8");
  
  // Find all log IDs like FU-2026-XXXXX inside the "Exactly Duplicate Follow-up Logs" sections
  const regex = /\*\*`(FU-\d{4}-\d{5})`\*\*/g;
  const duplicateIds = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    duplicateIds.push(match[1]);
  }

  console.log(`Found ${duplicateIds.length} duplicate follow-up log IDs to delete:`);
  console.log(duplicateIds);

  if (duplicateIds.length === 0) {
    console.log("No duplicate IDs found in the report.");
    return;
  }

  console.log("\nStarting live deletion from backend database...");
  let successCount = 0;
  let failCount = 0;

  for (const id of duplicateIds) {
    try {
      console.log(`Deleting: ${id}...`);
      await frappeDelete(`resource/Fee Follow Up/${encodeURIComponent(id)}`);
      successCount++;
    } catch (err) {
      console.error(`Failed to delete ${id}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nCleanup finished:`);
  console.log(`- Successfully deleted: ${successCount}`);
  console.log(`- Failed: ${failCount}`);
}

main().catch(console.error);
