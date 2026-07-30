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
  
  console.log("Fetching instructors from:", url);
  const res = await fetch(`${url}/api/resource/Instructor?fields=["name","instructor_name","employee"]&limit_page_length=1000`, {
    headers: { Authorization: `token ${key}:${secret}` }
  });
  const data = await res.json();
  console.log("Response (first 2):", data.data ? data.data.slice(0,2) : data);
  if (data.data) console.log("Total instructors fetched:", data.data.length);
}
run();
