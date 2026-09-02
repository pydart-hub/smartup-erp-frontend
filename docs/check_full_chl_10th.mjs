const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  // 1. Fetch ALL Program Enrollments without limit
  let allPEs = [];
  let start = 0;
  while (true) {
    const res = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?fields=["name","student","student_name","program","student_batch_name","academic_year","docstatus"]&limit_start=${start}&limit_page_length=500`, { headers });
    const batch = (await res.json()).data || [];
    allPEs.push(...batch);
    if (batch.length < 500) break;
    start += 500;
  }
  console.log(`Total Program Enrollments in system: ${allPEs.length}`);

  // Filter 10th standard PEs for Chullickal
  // Notice batch name / name patterns: "PEN-10th-Chullickal 26-27-003", student_batch_name: "Chullickal 26-27"
  const chl10thPEs = allPEs.filter(pe => 
    pe.docstatus === 1 &&
    (pe.name.toLowerCase().includes('chullickal') || pe.student_batch_name?.toLowerCase().includes('chullickal')) &&
    (pe.program?.toLowerCase().includes('10') || pe.name.toLowerCase().includes('10th'))
  );
  console.log(`Total Active Chullickal 10th Program Enrollments: ${chl10thPEs.length}`);

  // 2. Fetch all groups for 10th Chullickal
  const grpA = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-A`, { headers })).json();
  const grpB = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-B`, { headers })).json();
  const grpC = await (await fetch(`${baseUrl}/api/resource/Student%20Group/Chullickal-10th%20State-C`, { headers })).json();

  const studentsInA = (grpA.data?.students || []).map(s => s.student);
  const studentsInB = (grpB.data?.students || []).map(s => s.student);
  const studentsInC = (grpC.data?.students || []).map(s => s.student);

  console.log(`Group A count: ${studentsInA.length}`);
  console.log(`Group B count: ${studentsInB.length}`);
  console.log(`Group C count: ${studentsInC.length}`);

  const allAllocated10th = new Set([...studentsInA, ...studentsInB, ...studentsInC]);
  console.log(`Total Unique Students Allocated across 10th A, B, C: ${allAllocated10th.size}`);

  // 3. Find if any student in chl10thPEs is NOT in allAllocated10th
  const unallocatedFromPE = [];
  for (const pe of chl10thPEs) {
    if (!allAllocated10th.has(pe.student)) {
      unallocatedFromPE.push(pe);
    }
  }

  console.log(`\n================ RESULT ================`);
  console.log(`Unallocated Chullickal 10th Enrolled Students count: ${unallocatedFromPE.length}`);
  if (unallocatedFromPE.length > 0) {
    console.log("Unallocated Enrolled Students:", JSON.stringify(unallocatedFromPE, null, 2));
  } else {
    console.log("ALL Chullickal 10th enrolled students ARE allocated in student groups!");
  }

  // Check if any student is present in multiple groups
  const duplicateAllocations = [];
  for (const s of studentsInA) {
    if (studentsInB.includes(s)) duplicateAllocations.push({ student: s, groups: ['A', 'B'] });
    if (studentsInC.includes(s)) duplicateAllocations.push({ student: s, groups: ['A', 'C'] });
  }
  for (const s of studentsInB) {
    if (studentsInC.includes(s)) duplicateAllocations.push({ student: s, groups: ['B', 'C'] });
  }
  console.log(`Duplicate allocations across groups: ${duplicateAllocations.length}`);
  if (duplicateAllocations.length > 0) {
    console.log("Duplicates:", duplicateAllocations);
  }

  // Print summary of students in A & B
  console.log(`\nGroup A breakdown (Girls / Boys):`);
  console.log(`Total in Group A: ${grpA.data?.students?.length}`);
  console.log(`Total in Group B: ${grpB.data?.students?.length}`);
  console.log(`Total in Group C: ${grpC.data?.students?.length}`);
}

run();
