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
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  // Look for 4-instalment and 6-instalment peer examples in SU THP 12th Science State
  const peers = [
    { name: "Alfiya aa", plan: "Basic-4" },
    { name: "Samrin v", plan: "Basic-6" }
  ];

  for (const p of peers) {
    const invRes = await frappeGet("resource/Sales Invoice", {
      filters: JSON.stringify([["customer", "=", p.name]]),
      fields: JSON.stringify(["name", "posting_date", "due_date", "grand_total"]),
      order_by: "due_date asc"
    });
    console.log(`Invoices for ${p.name} (${p.plan}):`, JSON.stringify(invRes.data, null, 2));
  }
}

run();
