const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function fixAndEnrollAbhinav() {
  const studentId = 'STU-SU CHL-26-200';
  const studentName = 'ABHINAV A';
  const branchName = 'Smart Up Chullickal';
  const programName = '10th State';
  const academicYear = '2026-2027';
  const batchName = 'Chullickal 26-27';
  const targetStudentGroup = 'Chullickal-10th State-B';

  // 1. Fetch courses from 10th State Program
  const progRes = await fetch(`${baseUrl}/api/resource/Program/10th%20State`, { headers });
  const progData = (await progRes.json()).data || {};
  const courses = progData.courses || [];

  // Find latest PEN sequence for Chullickal 10th
  const peListRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?filters=[["name","like","PEN-10th-Chullickal 26-27-%"]]&order_by=name%20desc&limit_page_length=50`, { headers });
  const peList = (await peListRes.json()).data || [];
  console.log("Existing top PENs:", peList.slice(0, 5));

  // Let's create PE with standard naming or let Frappe auto-generate if naming series exists, 
  // or use the next available number (e.g. 346 if 345 was the latest)
  let maxNum = 0;
  for (const pe of peList) {
    const match = pe.name.match(/PEN-10th-Chullickal 26-27-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = String(maxNum + 1).padStart(3, '0');
  const targetPEName = `PEN-10th-Chullickal 26-27-${nextNum}`;
  console.log(`Next Program Enrollment ID will be: ${targetPEName}`);

  // Create Program Enrollment
  const pePayload = {
    doctype: "Program Enrollment",
    name: targetPEName,
    student: studentId,
    student_name: studentName,
    program: programName,
    academic_year: academicYear,
    student_batch_name: batchName,
    custom_branch: branchName,
    custom_program_abb: "10th",
    custom_student_srr: "200",
    enrollment_date: "2026-05-11",
    courses: courses.map(c => ({
      course: c.course,
      course_name: c.course_name,
      required: c.required
    }))
  };

  console.log("Submitting PE Payload...");
  const createRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  });
  const createData = await createRes.json();
  console.log("PE Create Response:", createData);

  const createdPEName = createData.data?.name;
  if (!createdPEName) {
    throw new Error(`Failed to create PE: ${JSON.stringify(createData)}`);
  }

  // Submit PE (docstatus = 1)
  console.log(`Submitting PE ${createdPEName}...`);
  const submitRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(createdPEName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const submitData = await submitRes.json();
  console.log("PE Submit Response:", submitData.data?.docstatus === 1 ? "SUCCESS (Submitted)" : submitData);

  // Create Course Enrollments (CEs)
  console.log("\nCreating Course Enrollments for 12 courses...");
  const createdCEs = [];
  for (const c of courses) {
    const cePayload = {
      doctype: "Course Enrollment",
      student: studentId,
      student_name: studentName,
      course: c.course,
      program_enrollment: createdPEName,
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
    } else {
      console.log(`  ✗ CE response for ${c.course}:`, ceData);
    }
  }

  // Add to Student Group (Chullickal-10th State-B - Boys Batch)
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
    console.log(`Student already present in ${targetStudentGroup}`);
  }

  console.log("\n================ SUMMARY ================");
  console.log(`Student: ${studentName} (${studentId})`);
  console.log(`Program Enrollment: ${createdPEName} (docstatus: 1)`);
  console.log(`Course Enrollments Created: ${createdCEs.length} courses`);
  console.log(`Assigned Student Group: ${targetStudentGroup}`);
}

fixAndEnrollAbhinav().catch(console.error);
