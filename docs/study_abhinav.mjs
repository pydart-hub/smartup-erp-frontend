const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function studyAbhinav() {
  console.log("Searching for 'ABHINAV' in Student master...");
  
  // 1. Search Student doctype
  const stuRes = await fetch(`${baseUrl}/api/resource/Student?filters=[["student_name","like","%ABHINAV%"]]&fields=["name","student_name","gender","custom_branch","custom_school_class","custom_board","custom_plan","custom_batch","disabled","creation","modified"]&limit_page_length=50`, { headers });
  const students = (await stuRes.json()).data || [];
  console.log(`Found ${students.length} students matching ABHINAV:`, JSON.stringify(students, null, 2));

  for (const s of students) {
    console.log(`\n================ Deep Study for Student: ${s.name} (${s.student_name}) ================`);
    
    // Fetch full Student Doc
    const fullStuRes = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(s.name)}`, { headers });
    const fullStu = (await fullStuRes.json()).data || {};
    console.log("Full Student Document:", JSON.stringify(fullStu, null, 2));

    // 2. Search Program Enrollment (PE)
    const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?filters=[["student","=","${s.name}"]]&fields=["name","program","academic_year","student_batch_name","custom_branch","docstatus","creation"]`, { headers });
    const peData = (await peRes.json()).data || [];
    console.log(`\nProgram Enrollments (${peData.length}):`, peData);

    // 3. Search Course Enrollment (CE)
    const ceRes = await fetch(`${baseUrl}/api/resource/Course%20Enrollment?filters=[["student","=","${s.name}"]]&fields=["name","course","program_enrollment","custom_batch_name","docstatus","creation"]`, { headers });
    const ceData = (await ceRes.json()).data || [];
    console.log(`\nCourse Enrollments (${ceData.length}):`, ceData);

    // 4. Search Student Group memberships
    const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?limit_page_length=200`, { headers });
    const allGroups = (await sgRes.json()).data || [];
    const memberGroups = [];
    for (const g of allGroups) {
      const gDoc = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(g.name)}`, { headers })).json();
      const inGrp = (gDoc.data?.students || []).find(st => st.student === s.name);
      if (inGrp) {
        memberGroups.push({ group: g.name, active: inGrp.active });
      }
    }
    console.log(`\nStudent Group Memberships (${memberGroups.length}):`, memberGroups);

    // 5. Search Sales Order / Fees / Invoices
    const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order?filters=[["custom_student","=","${s.name}"]]&fields=["name","customer","grand_total","status","docstatus"]`, { headers });
    const soData = (await soRes.json()).data || [];
    console.log(`\nSales Orders (${soData.length}):`, soData);

    const sinvRes = await fetch(`${baseUrl}/api/resource/Sales%20Invoice?filters=[["custom_student","=","${s.name}"]]&fields=["name","customer","grand_total","outstanding_amount","status","docstatus"]`, { headers });
    const sinvData = (await sinvRes.json()).data || [];
    console.log(`\nSales Invoices (${sinvData.length}):`, sinvData);

    // Also check Guardian links
    const guardRes = await fetch(`${baseUrl}/api/resource/Student%20Guardian?filters=[["parent","=","${s.name}"]]&fields=["name","guardian","guardian_name","relation"]`, { headers });
    const guardData = (await guardRes.json()).data || [];
    console.log(`\nGuardians:`, guardData);
  }
}

studyAbhinav();
