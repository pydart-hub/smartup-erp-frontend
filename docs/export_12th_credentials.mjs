import axios from "axios";
import fs from "fs";
import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = process.env.FRAPPE_API_KEY || "03330270e330d49";
const API_SECRET = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const client = axios.create({
  baseURL: API_URL,
  auth: { username: API_KEY, password: API_SECRET },
  headers: { "Content-Type": "application/json" },
});

async function fetchEnrollments() {
  let start = 0;
  const limit = 100;
  let allRecords = [];

  while (true) {
    const response = await client.get(`/api/resource/Program Enrollment`, {
      params: {
        filters: JSON.stringify([
          ["program", "in", ["12th Science State", "12th Science CBSE"]],
          ["docstatus", "!=", 2]
        ]),
        fields: JSON.stringify([
          "name",
          "student",
          "student_name",
          "program",
          "academic_year"
        ]),
        limit_start: start,
        limit_page_length: limit
      }
    });

    const batch = response.data?.data || [];
    allRecords.push(...batch);
    if (batch.length < limit) break;
    start += limit;
  }

  return allRecords;
}

async function fetchStudent(studentId) {
  try {
    const res = await client.get(`/api/resource/Student/${encodeURIComponent(studentId)}`);
    return res.data.data;
  } catch (e) {
    console.error(`Failed to fetch student ${studentId}:`, e.message);
    return null;
  }
}

async function fetchGuardian(guardianId) {
  try {
    const res = await client.get(`/api/resource/Guardian/${encodeURIComponent(guardianId)}`);
    return res.data.data;
  } catch (e) {
    console.error(`Failed to fetch guardian ${guardianId}:`, e.message);
    return null;
  }
}

async function main() {
  console.log("Fetching 12th grade enrollments with full pagination...");
  const enrollments = await fetchEnrollments();
  console.log(`Found ${enrollments.length} enrollments.`);

  const results = [];

  for (let i = 0; i < enrollments.length; i++) {
    const enrollment = enrollments[i];
    console.log(`[${i + 1}/${enrollments.length}] Fetching credentials for ${enrollment.student} (${enrollment.student_name})...`);

    const student = await fetchStudent(enrollment.student);
    if (!student) continue;

    let guardianEmail = "";
    let guardianName = "";
    let parentPassword = "";

    if (student.guardians && student.guardians.length > 0) {
      const guardianId = student.guardians[0].guardian;
      const guardian = await fetchGuardian(guardianId);
      if (guardian) {
        guardianEmail = guardian.email_address || "";
        guardianName = guardian.guardian_name || "";
        parentPassword = guardian.custom_portal_password || "";
      }
    }

    const studentEmail = student.student_email_id || student.user_id || guardianEmail;

    results.push({
      student_id: enrollment.student,
      student_name: enrollment.student_name,
      program: enrollment.program,
      branch: student.custom_branch || "",
      guardian_name: guardianName,
      guardian_email: guardianEmail || studentEmail,
      parent_portal_password: parentPassword || "SmartUp@123"
    });
  }

  const csvHeader = "Student ID,Student Name,Program,Branch,Guardian Name,Guardian Email,Parent Portal Password\n";
  const csvRows = results.map(r => 
    `"${r.student_id}","${r.student_name}","${r.program}","${r.branch}","${r.guardian_name}","${r.guardian_email}","${r.parent_portal_password}"`
  ).join("\n");

  fs.writeFileSync("docs/12th_students_credentials.csv", csvHeader + csvRows);
  console.log("\n✅ Successfully generated docs/12th_students_credentials.csv with individual actual passwords!");
}

main().catch(console.error);
