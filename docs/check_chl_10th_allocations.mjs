const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  try {
    // 1. Find exact 10th program names & Chullickal branch names
    const pRes = await fetch(`${baseUrl}/api/resource/Program?fields=["name","program_name","program_abbreviation"]&limit_page_length=100`, { headers });
    const programs = (await pRes.json()).data || [];
    console.log("All Programs with '10':", programs.filter(p => JSON.stringify(p).toLowerCase().includes('10')));

    const bRes = await fetch(`${baseUrl}/api/resource/Company?fields=["name","company_name","abbr"]&limit_page_length=100`, { headers });
    const branches = (await bRes.json()).data || [];
    console.log("Chullickal Branch:", branches.filter(b => JSON.stringify(b).toLowerCase().includes('chullickal') || JSON.stringify(b).toLowerCase().includes('chl')));

    // 2. Fetch all Student Groups in Chullickal
    const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?fields=["name","student_group_name","program","custom_branch","disabled"]&limit_page_length=200`, { headers });
    const allSgs = (await sgRes.json()).data || [];
    const chlSgs = allSgs.filter(sg => 
      (sg.custom_branch?.toLowerCase().includes('chullickal') || sg.name?.toLowerCase().includes('chl')) &&
      (sg.program?.toLowerCase().includes('10') || sg.name?.toLowerCase().includes('10') || sg.student_group_name?.toLowerCase().includes('10'))
    );
    console.log("\nChullickal 10th Student Groups found:", chlSgs);

    // 3. For each 10th Student Group, get full doc to see members
    const groupMembersMap = new Map(); // student_id -> array of group names
    const allGroupStudents = new Set();
    const groupDetails = [];

    for (const sg of chlSgs) {
      const docRes = await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(sg.name)}`, { headers });
      const doc = (await docRes.json()).data || {};
      const students = doc.students || [];
      groupDetails.push({
        name: doc.name,
        student_group_name: doc.student_group_name,
        program: doc.program,
        disabled: doc.disabled,
        total_students: students.length,
        active_students: students.filter(s => s.active !== 0).length,
        student_list: students.map(s => ({ student: s.student, student_name: s.student_name, active: s.active }))
      });

      for (const s of students) {
        if (s.active !== 0) {
          allGroupStudents.add(s.student);
          if (!groupMembersMap.has(s.student)) groupMembersMap.set(s.student, []);
          groupMembersMap.get(s.student).push(doc.name);
        }
      }
    }

    // 4. Fetch all Active Program Enrollments for Chullickal + 10th
    const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?fields=["name","student","student_name","program","student_batch_name","academic_year","custom_branch","docstatus"]&limit_page_length=500`, { headers });
    const allPEs = (await peRes.json()).data || [];
    const chl10thPEs = allPEs.filter(pe => 
      pe.docstatus === 1 &&
      (pe.custom_branch?.toLowerCase().includes('chullickal') || pe.name?.toLowerCase().includes('chl')) &&
      (pe.program?.toLowerCase().includes('10') || pe.student_batch_name?.toLowerCase().includes('10'))
    );

    console.log(`\nTotal Active Program Enrollments for Chullickal 10th: ${chl10thPEs.length}`);

    // Also fetch all Students whose custom_branch is Chullickal
    const stuRes = await fetch(`${baseUrl}/api/resource/Student?fields=["name","student_name","gender","custom_branch","custom_branch_abbr","custom_school_class","custom_board","custom_plan"]&limit_page_length=500`, { headers });
    const allStudents = (await stuRes.json()).data || [];
    const chlStudents = allStudents.filter(s => 
      (s.custom_branch?.toLowerCase().includes('chullickal') || s.custom_branch_abbr?.toLowerCase() === 'chl') &&
      (s.custom_school_class?.toString().includes('10') || s.custom_school_class === '10th')
    );
    console.log(`Total Students with custom_branch = Chullickal and Class 10: ${chlStudents.length}`);

    // Let's identify unallocated students from Program Enrollments
    const unallocatedFromPE = [];
    for (const pe of chl10thPEs) {
      if (!allGroupStudents.has(pe.student)) {
        // Find student details
        const stu = allStudents.find(s => s.name === pe.student) || {};
        unallocatedFromPE.push({
          student: pe.student,
          student_name: pe.student_name || stu.student_name,
          gender: stu.gender,
          program: pe.program,
          custom_branch: pe.custom_branch || stu.custom_branch,
          custom_school_class: stu.custom_school_class,
          custom_plan: stu.custom_plan,
          enrollment_id: pe.name
        });
      }
    }

    // Also check if any student has custom_branch = Chullickal & Class 10 but no group
    const unallocatedFromStudents = [];
    for (const stu of chlStudents) {
      if (!allGroupStudents.has(stu.name)) {
        unallocatedFromStudents.push({
          student: stu.name,
          student_name: stu.student_name,
          gender: stu.gender,
          custom_branch: stu.custom_branch,
          custom_school_class: stu.custom_school_class,
          custom_plan: stu.custom_plan
        });
      }
    }

    console.log("\n================ SUMMARY OF STUDENT GROUPS ================");
    console.log(JSON.stringify(groupDetails.map(g => ({
      name: g.name,
      student_group_name: g.student_group_name,
      program: g.program,
      disabled: g.disabled,
      active_count: g.active_students
    })), null, 2));

    console.log("\n================ UNALLOCATED STUDENTS FROM PROGRAM ENROLLMENT ================");
    console.log(`Count: ${unallocatedFromPE.length}`);
    console.log(JSON.stringify(unallocatedFromPE, null, 2));

    console.log("\n================ UNALLOCATED STUDENTS FROM STUDENT MASTER (Class 10 + Chullickal) ================");
    console.log(`Count: ${unallocatedFromStudents.length}`);
    console.log(JSON.stringify(unallocatedFromStudents, null, 2));

    // Also check all allocated students breakdown by gender and group
    console.log("\n================ ALLOCATED STUDENTS IN 10th GROUPS ================");
    for (const gd of groupDetails) {
      console.log(`\nGroup: ${gd.name} (${gd.student_group_name}) - Active Count: ${gd.active_students}`);
      const studentsWithGender = gd.student_list.filter(s => s.active !== 0).map(s => {
        const fullStu = allStudents.find(st => st.name === s.student);
        return {
          student: s.student,
          student_name: s.student_name,
          gender: fullStu?.gender || 'Unknown'
        };
      });
      const boys = studentsWithGender.filter(s => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy');
      const girls = studentsWithGender.filter(s => s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl');
      const other = studentsWithGender.filter(s => !['male','female','boy','girl'].includes(s.gender?.toLowerCase()));
      console.log(`  Boys: ${boys.length}, Girls: ${girls.length}, Unknown/Other: ${other.length}`);
      console.log('  Students:', JSON.stringify(studentsWithGender, null, 2));
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
