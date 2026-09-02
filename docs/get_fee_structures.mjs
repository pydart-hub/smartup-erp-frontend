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

  // 1. Fee structures for 12th Science State / SU THP
  const feeStructures = await frappeGet("resource/Fee Structure", {
    filters: JSON.stringify([
      ["program", "=", "12th Science State"],
      ["custom_branch_abbr", "=", "SU THP"]
    ]),
    fields: JSON.stringify(["*"]),
  });

  const detailedFS = [];
  for (const fsDoc of (feeStructures.data || [])) {
    const detail = await frappeGet(`resource/Fee Structure/${fsDoc.name}`);
    detailedFS.push(detail.data);
  }

  // 2. Also check if there are other fee structures for 12th Science State in other branches or generally
  const all12thFS = await frappeGet("resource/Fee Structure", {
    filters: JSON.stringify([
      ["program", "=", "12th Science State"]
    ]),
    fields: JSON.stringify(["name", "custom_branch_abbr", "custom_plan", "custom_no_of_instalments", "total_amount"]),
  });

  // 3. Other students in Thopumpadi 12th Science State
  const peers = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([
      ["program", "=", "12th Science State"],
      ["student_batch_name", "like", "%Thopumpadi%"]
    ]),
    fields: JSON.stringify(["name", "student", "student_name", "custom_fee_structure", "custom_plan", "custom_no_of_instalments"]),
  });

  console.log("SU THP 12th Science State Fee Structures:", JSON.stringify(detailedFS, null, 2));
  console.log("\nAll 12th Science State Fee Structures Summary:", JSON.stringify(all12thFS.data, null, 2));
  console.log("\nPeers in Thopumpadi 12th Science State:", JSON.stringify(peers.data, null, 2));
}

run();
