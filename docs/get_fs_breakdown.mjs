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

  // Get details of all SU THP-12th Science State fee structures
  const fsNames = [
    "SU THP-12th Science State-Basic-1",
    "SU THP-12th Science State-Basic-4",
    "SU THP-12th Science State-Basic-6",
    "SU THP-12th Science State-Basic-8",
    "SU THP-12th Science State-Advanced-8"
  ];

  const results = {};
  for (const name of fsNames) {
    const doc = await frappeGet(`resource/Fee Structure/${name}`);
    results[name] = doc.data;
  }

  fs.writeFileSync("docs/thp_science_fee_structures.json", JSON.stringify(results, null, 2), "utf-8");
  console.log("Saved thp_science_fee_structures.json");
}

run();
