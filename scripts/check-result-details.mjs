import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function checkDetails() {
  const res = await fetch(`${url}/api/resource/Assessment%20Result/EDU-RES-2026-51869`, { headers });
  const data = await res.json();
  console.log("Assessment Result Detail:", JSON.stringify(data.data?.details, null, 2));
}

checkDetails().catch(console.error);
