import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function check() {
  const filter = JSON.stringify([["assessment_group", "=", "Diagnosis Exam"]]);
  const fields = JSON.stringify(["name", "student", "student_name", "course", "total_score", "maximum_score", "custom_diagnosed_level"]);
  const res = await fetch(`${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(filter)}&fields=${encodeURIComponent(fields)}&limit_page_length=15`, { headers });
  const data = await res.json();
  console.log("Count:", data.data?.length);
  console.log("Sample Diagnosis Assessment Results:", data.data);
}

check().catch(console.error);
