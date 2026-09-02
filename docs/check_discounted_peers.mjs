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

  // Look for any 11th science student with custom discount or fees around 11800 or 12000
  const soList = await frappeGet(`resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["company", "=", "Smart Up Thopumpadi"], ["custom_academic_year", "=", "2026-2027"]]))}&fields=["name","student","customer","grand_total","custom_no_of_instalments","items"]&limit_page_length=100`);
  console.log("SU THP Sales Orders sample:", JSON.stringify(soList.data?.filter(s => s.grand_total < 16000), null, 2));
}

run();
