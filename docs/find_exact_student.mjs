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

  // 1. Search student by SRR 103
  const srrRes = await frappeGet("resource/Student", {
    filters: JSON.stringify([["custom_srr_id", "=", "103"]]),
    fields: JSON.stringify(["*"])
  });
  console.log("SRR 103 Students:", JSON.stringify(srrRes, null, 2));

  // 2. Search student with 'Thopumpadi' and 'Bilal' or '103'
  const branchStudents = await frappeGet("resource/Student", {
    filters: JSON.stringify([
      ["custom_branch", "like", "%Thopumpadi%"]
    ]),
    fields: JSON.stringify(["name", "student_name", "custom_srr_id", "custom_branch", "customer"]),
    limit_page_length: "100"
  });
  console.log("Thopumpadi students count:", branchStudents.data ? branchStudents.data.length : 0);
  const matched = (branchStudents.data || []).filter(s => 
    (s.student_name && s.student_name.toLowerCase().includes("bilal")) ||
    s.custom_srr_id === "103"
  );
  console.log("Matched in Thopumpadi:", JSON.stringify(matched, null, 2));

  // 3. Search Program Enrollments for Thopumpadi 26-27 / 12th Science State
  const peRes = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([
      ["student_batch_name", "like", "%Thopumpadi%"]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "100"
  });
  const matchedPE = (peRes.data || []).filter(p => 
    (p.student_name && p.student_name.toLowerCase().includes("bilal")) ||
    p.custom_student_srr === "103" ||
    (p.program && p.program.toLowerCase().includes("12th"))
  );
  console.log("Matched PE:", JSON.stringify(matchedPE, null, 2));
}

run();
