import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

async function inspectEraveli() {
  const filters = JSON.stringify([
    ["assessment_group", "=", "Diagnosis Exam"],
    ["docstatus", "=", 1],
    ["custom_branch", "=", "Smart Up Eraveli"],
  ]);
  const fields = JSON.stringify(["name", "student", "student_name", "course", "custom_diagnosed_level"]);

  const res = await fetch(
    `${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
      filters
    )}&fields=${encodeURIComponent(fields)}&limit_page_length=50`,
    { headers }
  );

  const data = (await res.json()).data || [];
  const missing = data.filter((r) => !r.custom_diagnosed_level);
  console.log(`Found ${missing.length} missing in sample Eraveli batch.`);

  const sampleStudents = [...new Set(missing.map((m) => m.student))].slice(0, 5);

  for (const stuId of sampleStudents) {
    const sRes = await fetch(`${url}/api/resource/Student/${encodeURIComponent(stuId)}`, { headers });
    const sData = (await sRes.json()).data;
    console.log(`\nStudent: ${stuId} | Name: ${sData.first_name || sData.name} | Mobile: ${sData.student_mobile_number} | Custom: ${sData.custom_phone_number}`);
    console.log(`Guardians:`, sData.guardians?.map(g => ({ name: g.guardian_name, id: g.guardian })));
  }
}

inspectEraveli();
