import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const urlMatch = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/);
  const keyMatch = env.match(/FRAPPE_API_KEY=(.*)/);
  const secretMatch = env.match(/FRAPPE_API_SECRET=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : "";
  const key = keyMatch ? keyMatch[1].trim() : "";
  const secret = secretMatch ? secretMatch[1].trim() : "";
  const auth = `token ${key}:${secret}`;

  async function frappeGet(pathStr, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}/api/${pathStr}${qs ? '?' + qs : ''}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });
    return res.json();
  }

  const customerId = "Mohammed bilal";
  const studentId = "STU-SU THP-26-103";

  // Check Sales Orders for this student
  const soRes = await frappeGet("resource/Sales Order", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"])
  });
  console.log("Sales Orders for student:", JSON.stringify(soRes.data, null, 2));

  // Check all Sales Orders for this customer
  const soCustRes = await frappeGet("resource/Sales Order", {
    filters: JSON.stringify([["customer", "=", customerId]]),
    fields: JSON.stringify(["*"])
  });
  console.log("Sales Orders for customer:", JSON.stringify(soCustRes.data, null, 2));
}

run();
