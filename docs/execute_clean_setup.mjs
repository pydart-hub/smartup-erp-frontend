const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function executeCompleteAcademicSetup() {
  const studentId = 'STU-SU CHL-26-200';
  const studentName = 'ABHINAV A';
  const branchName = 'Smart Up Chullickal';
  const programName = '10th State';
  const academicYear = '2026-2027';
  const batchName = 'Chullickal 26-27';
  const targetStudentGroup = 'Chullickal-10th State-B';
  const uniqueSRR = '354';

  console.log(`Setting custom_student_srr to ${uniqueSRR} on Student & creating PE...`);

  // 1. Update Student custom_student_srr to 354
  const stuUpdate = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_srr_id: uniqueSRR })
  });
  console.log("Student SRR Update:", (await stuUpdate.json()).data ? "SUCCESS (SRR = 354)" : "FAILED");

  // 2. Fetch courses from 10th State
  const progRes = await fetch(`${baseUrl}/api/resource/Program/10th%20State`, { headers });
  const progData = (await progRes.json()).data || {};
  const courses = progData.courses || [];

  // 3. Create Program Enrollment
  const pePayload = {
    doctype: "Program Enrollment",
    student: studentId,
    student_name: studentName,
    program: programName,
    academic_year: academicYear,
    student_batch_name: batchName,
    custom_branch: branchName,
    custom_program_abb: "10th",
    custom_student_srr: uniqueSRR,
    enrollment_date: "2026-05-11",
    courses: courses.map(c => ({
      course: c.course,
      course_name: c.course_name,
      required: c.required
    }))
  };

  const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  });
  const peData = await peRes.json();
  console.log("PE Creation:", peData.data?.name || peData);

  const peName = peData.data?.name;
  if (!peName) throw new Error("PE creation failed!");

  // 4. Submit Program Enrollment
  const submitRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(peName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const submitData = await submitRes.json();
  console.log(`PE Submission (${peName}):`, submitData.data?.docstatus === 1 ? "SUCCESS (Submitted)" : submitData);

  // 5. Create Course Enrollments (CEs) for all 12 courses
  console.log("\nCreating Course Enrollments...");
  const createdCEs = [];
  for (const c of courses) {
    const cePayload = {
      doctype: "Course Enrollment",
      student: studentId,
      student_name: studentName,
      course: c.course,
      program_enrollment: peName,
      custom_batch_name: batchName
    };
    const ceRes = await fetch(`${baseUrl}/api/resource/Course%20Enrollment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cePayload)
    });
    const ceData = await ceRes.json();
    if (ceData.data?.name) {
      createdCEs.push(ceData.data.name);
      console.log(`  ✓ Created CE for ${c.course}: ${ceData.data.name}`);
    }
  }

  // 6. Add to Student Group: Chullickal-10th State-B
  console.log(`\nAdding to Student Group: ${targetStudentGroup}...`);
  const groupRes = await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(targetStudentGroup)}`, { headers });
  const groupDoc = (await groupRes.json()).data || {};
  const currentStudents = groupDoc.students || [];

  if (!currentStudents.some(s => s.student === studentId)) {
    const updatedStudents = [
      ...currentStudents,
      {
        student: studentId,
        student_name: studentName,
        active: 1
      }
    ];

    const groupUpdateRes = await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(targetStudentGroup)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ students: updatedStudents })
    });
    const groupUpdated = await groupUpdateRes.json();
    console.log(`✓ Added to ${targetStudentGroup}. New strength: ${groupUpdated.data?.students?.length}`);
  } else {
    console.log(`Student already in ${targetStudentGroup}`);
  }

  console.log("\n================ VERIFICATION ================");
  const vPE = await (await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(peName)}`, { headers })).json();
  console.log("Verified PE:", { name: vPE.data?.name, docstatus: vPE.data?.docstatus, student: vPE.data?.student, program: vPE.data?.program });

  const vCE = await (await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["student","=","${studentId}"]]`, { headers })).json();
  console.log(`Verified CE Count: ${vCE.data?.length}`);

  const vSG = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(targetStudentGroup)}`, { headers })).json();
  const found = (vSG.data?.students || []).find(s => s.student === studentId);
  console.log("Verified in Student Group:", found);
}

executeCompleteAcademicSetup().catch(console.error);
