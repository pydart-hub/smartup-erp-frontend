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

  const peDoc = await frappeGet(`resource/Program Enrollment/PEN-12sc state-Thopumpadi 26-27-103`);
  console.log("Verified PE Doc:", JSON.stringify({
    name: peDoc.data.name,
    student: peDoc.data.student,
    custom_plan: peDoc.data.custom_plan,
    custom_fee_structure: peDoc.data.custom_fee_structure,
    custom_no_of_instalments: peDoc.data.custom_no_of_instalments,
    docstatus: peDoc.data.docstatus
  }, null, 2));
}

run();
