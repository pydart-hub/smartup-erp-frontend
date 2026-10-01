import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function inspectDoc() {
  const res = await fetch(`${url}/api/resource/Assessment%20Result/EDU-RES-2026-48884`, { headers });
  const data = await res.json();
  console.log("Full Doc EDU-RES-2026-48884:", JSON.stringify(data.data, null, 2));

  // Also check Nuvel John's result
  const nuvelRes = await fetch(`${url}/api/resource/Assessment%20Result/EDU-RES-2026-53067`, { headers });
  const nuvelData = await nuvelRes.json();
  console.log("Nuvel John Doc EDU-RES-2026-53067:", JSON.stringify(nuvelData.data, null, 2));
}

inspectDoc().catch(console.error);
