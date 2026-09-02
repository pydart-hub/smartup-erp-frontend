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

  const headers = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  async function frappeGet(pathStr) {
    const res = await fetch(`${url}/api/${pathStr}`, { headers });
    return res.json();
  }

  const pe3 = await frappeGet("resource/Payment Entry/ACC-PAY-2026-06361");
  console.log("Original ACC-PAY-2026-06361:", JSON.stringify(pe3.data, null, 2));

  const pe4 = await frappeGet("resource/Payment Entry/ACC-PAY-2026-07578");
  console.log("Original ACC-PAY-2026-07578:", JSON.stringify(pe4.data, null, 2));
}

run();
