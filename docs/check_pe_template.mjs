const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function getCoursesAndSamplePE() {
  // 1. Get 10th State Program courses
  const progRes = await fetch(`${baseUrl}/api/resource/Program/10th%20State`, { headers });
  const prog = (await progRes.json()).data || {};
  console.log("10th State Program:", {
    name: prog.name,
    program_name: prog.program_name,
    courses: prog.courses
  });

  // 2. Fetch a sample completed 10th PE from Chullickal
  const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/PEN-10th-Chullickal%2026-27-003`, { headers });
  const peDoc = (await peRes.json()).data || {};
  console.log("\nSample Valid PE (Chullickal 10th):", JSON.stringify(peDoc, null, 2));

  // 3. Fetch courses of this sample PE
  const ceRes = await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["program_enrollment","=","PEN-10th-Chullickal 26-27-003"]]&fields=["name","course","program_enrollment","student","custom_batch_name"]`, { headers });
  console.log("\nSample Course Enrollments:", await ceRes.json());
}

getCoursesAndSamplePE();
