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
  
  const name = "Fathima Rahfa";
  console.log("Fetching instructor:", name);
  const res = await fetch(`${url}/api/resource/Instructor/${encodeURIComponent(name)}`, {
    headers: { Authorization: `token ${key}:${secret}` }
  });
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}
run();
