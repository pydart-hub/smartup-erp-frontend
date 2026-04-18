// Add 5 unassigned students to Chullickal-10th State-B Student Group
const BASE = "https://smartup.m.frappe.cloud";
const TOKEN = "token 03330270e330d49:9c2261ae11ac2d2";
const GROUP_NAME = "Chullickal-10th State-B";

const STUDENTS_TO_ADD = [
  { student: "STU-SU CHL-26-082", student_name: "MOHAMMED FAYAZ SHANAVAS" },
  { student: "STU-SU CHL-26-075", student_name: "MOHAMMED RIZWAN" },
  { student: "STU-SU CHL-26-084", student_name: "SAIRA A S" },
  { student: "STU-SU CHL-26-077", student_name: "IREM K.A" },
  { student: "STU-SU CHL-26-081", student_name: "NATASHA SHIHAB" },
];

async function main() {
  const headers = {
    Authorization: TOKEN,
    "Content-Type": "application/json",
  };

  // Step 1: Fetch current Student Group
  console.log(`Fetching Student Group: ${GROUP_NAME}`);
  const getRes = await fetch(
    `${BASE}/api/resource/Student%20Group/${encodeURIComponent(GROUP_NAME)}`,
    { headers }
  );
  if (!getRes.ok) {
    console.error("Failed to fetch Student Group:", await getRes.text());
    process.exit(1);
  }
  const doc = (await getRes.json()).data;
  console.log(`Current members: ${doc.students.length}`);

  // Step 2: Check for duplicates
  const existingStudents = new Set(doc.students.map((s) => s.student));
  const toAdd = STUDENTS_TO_ADD.filter((s) => !existingStudents.has(s.student));
  if (toAdd.length === 0) {
    console.log("All students already in this batch!");
    return;
  }
  console.log(`Adding ${toAdd.length} new students...`);

  // Step 3: Append new students
  for (const s of toAdd) {
    doc.students.push({
      student: s.student,
      student_name: s.student_name,
      active: 1,
    });
  }

  // Step 4: Save
  const putRes = await fetch(
    `${BASE}/api/resource/Student%20Group/${encodeURIComponent(GROUP_NAME)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ students: doc.students }),
    }
  );

  if (!putRes.ok) {
    console.error("Failed to update:", await putRes.text());
    process.exit(1);
  }

  const updated = (await putRes.json()).data;
  console.log(`Updated! Total members now: ${updated.students.length}`);

  // Verify
  for (const s of toAdd) {
    const found = updated.students.find((m) => m.student === s.student);
    console.log(`  ${found ? "✓" : "✗"} ${s.student_name} (${s.student})`);
  }
}

main().catch(console.error);
