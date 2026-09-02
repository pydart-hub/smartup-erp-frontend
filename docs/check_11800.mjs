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

  // Check 11th Science State subject fee structures / partial subjects if any
  const fsList = await frappeGet(`resource/Fee Structure?filters=${encodeURIComponent(JSON.stringify([["company", "=", "Smart Up Thopumpadi"]]))}&fields=["name","total_amount","program"]&limit_page_length=100`);
  console.log("SU THP fee structures:", JSON.stringify(fsList.data, null, 2));

  // Check how admission form generates schedules with manual discount or custom fee
  // If total fee is 11,800:
  // How is 11,800 divided across 8 instalments (or remaining instalments)?
}

run();
