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

  const enrollmentName = "PEN-12sc state-Thopumpadi 26-27-103";
  const studentId = "STU-SU THP-26-103";

  // Check CEs
  const ceRes = await frappeGet(`resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([["program_enrollment", "=", enrollmentName]]))}`);
  console.log("Course Enrollments:", JSON.stringify(ceRes, null, 2));

  // Check Student Attendance or Groups
  const attRes = await frappeGet(`resource/Student Attendance?filters=${encodeURIComponent(JSON.stringify([["student", "=", studentId]]))}`);
  console.log("Student Attendance:", JSON.stringify(attRes, null, 2));

  const groupRes = await frappeGet(`resource/Student Group Student?filters=${encodeURIComponent(JSON.stringify([["student", "=", studentId]]))}`);
  console.log("Student Group Student:", JSON.stringify(groupRes, null, 2));
}

run();
