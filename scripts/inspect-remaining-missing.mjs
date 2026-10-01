import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

async function inspectRemaining() {
  // fetch 15 unpopulated results
  const filters = JSON.stringify([
    ["assessment_group", "=", "Diagnosis Exam"],
    ["docstatus", "=", 1],
  ]);
  const fields = JSON.stringify([
    "name",
    "student",
    "student_name",
    "course",
    "custom_branch",
    "custom_diagnosed_level"
  ]);

  const res = await fetch(
    `${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
      filters
    )}&fields=${encodeURIComponent(fields)}&limit_page_length=500`,
    { headers }
  );

  const data = (await res.json()).data || [];
  const missing = data.filter((r) => !r.custom_diagnosed_level);
  console.log(`Found ${missing.length} missing in first batch.`);

  // sample 5 students
  const sampleStudents = [...new Set(missing.map(m => m.student))].slice(0, 10);

  for (const stuId of sampleStudents) {
    const sRes = await fetch(`${url}/api/resource/Student/${encodeURIComponent(stuId)}`, { headers });
    const sData = (await sRes.json()).data;
    console.log(`\nStudent: ${stuId} | Name: ${sData.first_name || sData.name} | Mobile: ${sData.student_mobile_number}`);
    
    if (sData.student_mobile_number) {
      const cleanPhone = sData.student_mobile_number.replace(/\D/g, "").slice(-10);
      const histRes = await fetch(`https://smartuplearning.net/api/public-exam/history?phone=${cleanPhone}`);
      if (histRes.ok) {
        const histData = await histRes.json();
        console.log(`  Online attempts count: ${histData.attempts?.length || 0}`);
        if (histData.attempts?.length > 0) {
          console.log(`  Sample attempt titles:`, histData.attempts.map(a => a.examTitle).slice(0, 3));
        }
      } else {
        console.log(`  History API status: ${histRes.status}`);
      }
    }
  }
}

inspectRemaining();
