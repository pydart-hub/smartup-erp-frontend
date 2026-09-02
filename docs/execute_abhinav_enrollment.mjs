const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function executeAbhinavEnrollment() {
  const studentId = 'STU-SU CHL-26-200';
  const studentName = 'ABHINAV A';
  const branchName = 'Smart Up Chullickal';
  const programName = '10th State';
  const academicYear = '2026-2027';
  const batchName = 'Chullickal 26-27';
  const targetStudentGroup = 'Chullickal-10th State-B';

  console.log(`Starting academic enrollment for ${studentName} (${studentId})...`);

  // 1. Fetch courses list from 10th State Program
  const progRes = await fetch(`${baseUrl}/api/resource/Program/10th%20State`, { headers });
  const progData = (await progRes.json()).data || {};
  const courses = progData.courses || [];
  console.log(`Found ${courses.length} courses in ${programName}`);

  // 2. Create Program Enrollment (PE)
  console.log("\nStep 1: Creating Program Enrollment...");
  const pePayload = {
    doctype: "Program Enrollment",
    student: studentId,
    student_name: studentName,
    program: programName,
    academic_year: academicYear,
    student_batch_name: batchName,
    custom_branch: branchName,
    custom_program_abb: "10th",
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
  const peCreated = await peRes.json();
  console.log("PE Creation response:", peCreated);

  if (!peCreated.data?.name) {
    throw new Error(`Failed to create PE: ${JSON.stringify(peCreated)}`);
  }
  const peName = peCreated.data.name;
  console.log(`Created PE (Draft): ${peName}`);

  // Submit the Program Enrollment (docstatus = 1)
  console.log("\nStep 2: Submitting Program Enrollment...");
  const peSubmitRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(peName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const peSubmitted = await peSubmitRes.json();
  console.log("PE Submission response:", peSubmitted);

  // 3. Create Course Enrollments (CE) for all courses if not automatically created
  console.log("\nStep 3: Checking / Creating Course Enrollments...");
  const ceExistingRes = await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["program_enrollment","=","${peName}"]]`, { headers });
  const ceExisting = (await ceExistingRes.json()).data || [];
  console.log(`Existing CEs automatically created: ${ceExisting.length}`);

  if (ceExisting.length === 0) {
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
      console.log(`  Created CE for ${c.course}: ${ceData.data?.name || JSON.stringify(ceData)}`);
    }
  }

  // 4. Add student to Student Group (Chullickal-10th State-B - Boys Batch)
  console.log(`\nStep 4: Adding student to ${targetStudentGroup}...`);
  const groupRes = await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(targetStudentGroup)}`, { headers });
  const groupDoc = (await groupRes.json()).data || {};
  const currentStudents = groupDoc.students || [];

  const isAlreadyInGroup = currentStudents.some(s => s.student === studentId);
  if (!isAlreadyInGroup) {
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
    console.log(`Added to ${targetStudentGroup}. New count: ${groupUpdated.data?.students?.length}`);
  } else {
    console.log(`Student is already present in ${targetStudentGroup}`);
  }

  console.log("\n================ VERIFICATION ================");
  // Verify PE
  const verifyPE = await (await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(peName)}`, { headers })).json();
  console.log("Verified PE:", { name: verifyPE.data?.name, docstatus: verifyPE.data?.docstatus, student: verifyPE.data?.student });

  // Verify CEs
  const verifyCEs = await (await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["student","=","${studentId}"]]`, { headers })).json();
  console.log(`Verified CEs count: ${verifyCEs.data?.length}`);

  // Verify Group
  const verifyGroup = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(targetStudentGroup)}`, { headers })).json();
  const foundInGroup = (verifyGroup.data?.students || []).find(s => s.student === studentId);
  console.log("Verified in Group:", foundInGroup);

  console.log("\nSUCCESS: All academic records created and verified for ABHINAV A!");
}

executeAbhinavEnrollment().catch(console.error);
