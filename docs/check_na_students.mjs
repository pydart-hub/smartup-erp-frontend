import axios from "axios";

const client = axios.create({
  baseURL: "https://smartup.m.frappe.cloud",
  headers: {
    Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

async function inspectStudentGroups(studentId, studentName) {
  console.log(`\n🔍 Searching for Student Group memberships for ${studentName} (${studentId})...`);
  const res = await client.get("/api/resource/Student Group", {
    params: {
      fields: JSON.stringify(["name", "program", "batch"]),
      filters: JSON.stringify([["Student Group Student", "student", "=", studentId]]),
      limit_page_length: 10
    }
  });
  console.log("Result Groups:", JSON.stringify(res.data.data, null, 2));
}

async function main() {
  await inspectStudentGroups("STU-SU CHL-26-019", "HEBA ANAS");
  await inspectStudentGroups("STU-SU ERV-26-063", "ZIYA UL HAQ B");
}

main().catch(console.error);
