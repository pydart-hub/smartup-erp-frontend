const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  // 1. Fetch all Student Groups with Chullickal or 10th
  const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?fields=["name","student_group_name","program","custom_branch","disabled"]&limit_page_length=500`, { headers });
  const allSgs = (await sgRes.json()).data || [];
  
  console.log("ALL STUDENT GROUPS AT CHULLICKAL:");
  const chlGroups = allSgs.filter(sg => sg.custom_branch?.toLowerCase().includes('chullickal') || sg.name?.toLowerCase().includes('chl'));
  console.log(chlGroups);

  // 2. Fetch all students in Chullickal 10th Groups
  const groupStudentMap = new Map();
  for (const sg of chlGroups) {
    if (sg.program?.toLowerCase().includes('10') || sg.name?.toLowerCase().includes('10') || sg.student_group_name?.toLowerCase().includes('10')) {
      const docRes = await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(sg.name)}`, { headers });
      const doc = (await docRes.json()).data || {};
      const students = doc.students || [];
      console.log(`\nGroup ${doc.name}: ${students.length} students (${students.filter(s => s.active !== 0).length} active)`);
      for (const s of students) {
        if (s.active !== 0) {
          groupStudentMap.set(s.student, {
            student_name: s.student_name,
            group: doc.name
          });
        }
      }
    }
  }

  // 3. Fetch all Program Enrollments for Chullickal + 10th
  const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?fields=["name","student","student_name","program","student_batch_name","academic_year","custom_branch","docstatus"]&limit_page_length=1000`, { headers });
  const allPEs = (await peRes.json()).data || [];
  
  const chl10thPEs = allPEs.filter(pe => 
    pe.docstatus === 1 &&
    (pe.custom_branch?.toLowerCase().includes('chullickal') || pe.name?.toLowerCase().includes('chl')) &&
    (pe.program?.toLowerCase().includes('10') || pe.student_batch_name?.toLowerCase().includes('10'))
  );

  console.log(`\nTotal Active Program Enrollments in Chullickal 10th: ${chl10thPEs.length}`);

  // Fetch Student Master details for all students
  const stuRes = await fetch(`${baseUrl}/api/resource/Student?fields=["name","student_name","gender","custom_branch","custom_branch_abbr","custom_school_class","custom_board","custom_plan","disabled"]&limit_page_length=1000`, { headers });
  const allStudents = (await stuRes.json()).data || [];
  const stuMap = new Map(allStudents.map(s => [s.name, s]));

  // Check which enrolled students have NO Student Group
  const unallocatedEnrolled = [];
  for (const pe of chl10thPEs) {
    if (!groupStudentMap.has(pe.student)) {
      const stu = stuMap.get(pe.student);
      unallocatedEnrolled.push({
        student: pe.student,
        student_name: pe.student_name || stu?.student_name,
        gender: stu?.gender || 'Not specified',
        program: pe.program,
        batch_name: pe.student_batch_name,
        plan: stu?.custom_plan,
        disabled: stu?.disabled,
        enrollment_id: pe.name
      });
    }
  }

  console.log(`\n=== UNALLOCATED STUDENTS (Have Active 10th Program Enrollment in Chullickal, but NOT in any Student Group) ===`);
  console.log(`Total Count: ${unallocatedEnrolled.length}`);
  console.log(JSON.stringify(unallocatedEnrolled, null, 2));

  // Also check if there are any Student records marked Chullickal + Class 10 that don't have PE or don't have Group
  const chlClass10Students = allStudents.filter(s => 
    (s.custom_branch?.toLowerCase().includes('chullickal') || s.custom_branch_abbr?.toLowerCase() === 'chl') &&
    (s.custom_school_class?.toString().includes('10') || s.custom_school_class === '10th')
  );

  const unallocatedMasterStudents = [];
  for (const s of chlClass10Students) {
    if (!groupStudentMap.has(s.name)) {
      const hasPE = chl10thPEs.some(pe => pe.student === s.name);
      unallocatedMasterStudents.push({
        student: s.name,
        student_name: s.student_name,
        gender: s.gender || 'Not specified',
        custom_plan: s.custom_plan,
        has_active_pe: hasPE,
        disabled: s.disabled
      });
    }
  }

  console.log(`\n=== UNALLOCATED STUDENTS (From Student Master: Chullickal + 10th, not in any 10th Student Group) ===`);
  console.log(`Total Count: ${unallocatedMasterStudents.length}`);
  console.log(JSON.stringify(unallocatedMasterStudents, null, 2));
}

run();
