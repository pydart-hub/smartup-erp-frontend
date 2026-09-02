const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  // Check Program Enrollment fields & sample
  const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?limit_page_length=10`, { headers });
  const samplePE = (await peRes.json()).data || [];
  console.log("Sample PE:", samplePE);

  // Check how Program Enrollments link to branch or program
  const allPEs = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?limit_page_length=500`, { headers });
  const pes = (await allPEs.json()).data || [];
  console.log("Total PEs in DB:", pes.length);

  // Fetch full doc of one PE
  if (pes.length > 0) {
    const singlePE = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(pes[0].name)}`, { headers });
    console.log("Single PE doc fields:", Object.keys((await singlePE.json()).data || {}));
  }

  // Check all Students at Chullickal
  const stuRes = await fetch(`${baseUrl}/api/resource/Student?limit_page_length=500`, { headers });
  const stus = (await stuRes.json()).data || [];
  console.log("Total Students in DB:", stus.length);
  if (stus.length > 0) {
    const singleStu = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(stus[0].name)}`, { headers });
    const sDoc = (await singleStu.json()).data || {};
    console.log("Single Student doc:", {
      name: sDoc.name,
      student_name: sDoc.student_name,
      custom_branch: sDoc.custom_branch,
      custom_school_class: sDoc.custom_school_class,
      gender: sDoc.gender
    });
  }

  // Fetch all students and inspect how branch / class is populated
  const fullStuRes = await fetch(`${baseUrl}/api/resource/Student?fields=["name","student_name","gender","custom_branch","custom_school_class","disabled"]&limit_page_length=1000`, { headers });
  const allStudentDocs = (await fullStuRes.json()).data || [];
  
  const chlAll = allStudentDocs.filter(s => s.name?.startsWith('STU-SU CHL') || s.custom_branch?.toLowerCase().includes('chullickal'));
  console.log(`\nTotal Chullickal Students in Master: ${chlAll.length}`);

  // Also fetch all 10th Group students
  const grpA = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-A`, { headers })).json();
  const grpB = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-B`, { headers })).json();
  const grpC = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-C`, { headers })).json();

  const allocatedStudentIds = new Set([
    ...(grpA.data?.students || []).map(s => s.student),
    ...(grpB.data?.students || []).map(s => s.student),
    ...(grpC.data?.students || []).map(s => s.student)
  ]);

  console.log(`\nAllocated in Chullickal 10th Groups: Group A (${grpA.data?.students?.length}), Group B (${grpB.data?.students?.length}), Group C (${grpC.data?.students?.length})`);
  console.log(`Total Unique Allocated: ${allocatedStudentIds.size}`);

  // Check if any Chullickal student with class 10 (or no class / 10th) is NOT in allocatedStudentIds
  const unallocatedChl = [];
  for (const s of chlAll) {
    if (!allocatedStudentIds.has(s.name)) {
      unallocatedChl.push(s);
    }
  }

  console.log(`\nChullickal Students NOT in Chullickal 10th (A, B, or C): Total ${unallocatedChl.length}`);
  // Group unallocated by custom_school_class
  const classBreakdown = {};
  for (const s of unallocatedChl) {
    const cls = s.custom_school_class || 'EMPTY / NOT SET';
    classBreakdown[cls] = (classBreakdown[cls] || 0) + 1;
  }
  console.log("Breakdown by custom_school_class:", classBreakdown);

  // List students who have class 10 or empty class
  const class10Unallocated = unallocatedChl.filter(s => 
    s.custom_school_class?.toString().toLowerCase().includes('10') || 
    s.custom_school_class === '10th' ||
    s.custom_school_class === '10'
  );
  console.log(`\nSpecifically Class 10 Students in Chullickal NOT in any 10th Group: ${class10Unallocated.length}`);
  console.log(class10Unallocated);

  // Let's also check other Student Groups across Chullickal to see where all other students are allocated!
  const allChlGroupsRes = await fetch(`${baseUrl}/api/resource/Student%20Group?filters=[["custom_branch","=","Smart Up Chullickal"]]&limit_page_length=100`, { headers });
  const chlGroups = (await allChlGroupsRes.json()).data || [];
  
  const allChlAllocated = new Map();
  for (const g of chlGroups) {
    const gDoc = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(g.name)}`, { headers })).json();
    for (const st of gDoc.data?.students || []) {
      allChlAllocated.set(st.student, g.name);
    }
  }

  const completelyUnallocatedInChullickal = chlAll.filter(s => !allChlAllocated.has(s.name) && s.disabled !== 1);
  console.log(`\nTotal Active Chullickal Students completely unallocated to ANY group in Chullickal: ${completelyUnallocatedInChullickal.length}`);
  console.log(completelyUnallocatedInChullickal);
}

run();
