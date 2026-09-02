const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function auditBackendMasters() {
  // 1. All Branches (Company)
  const cRes = await fetch(`${baseUrl}/api/resource/Company?fields=["name","company_name","abbr"]&limit_page_length=100`, { headers });
  const companies = (await cRes.json()).data || [];
  console.log("=== ALL FRAPPE COMPANIES (BRANCHES) ===");
  console.log(companies);

  // 2. All Programs
  const pRes = await fetch(`${baseUrl}/api/resource/Program?fields=["name","program_name","program_abbreviation","department"]&limit_page_length=100`, { headers });
  const programs = (await pRes.json()).data || [];
  console.log("\n=== ALL FRAPPE PROGRAMS ===");
  console.log(programs);

  // 3. All Student Groups active by branch & program
  const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?fields=["name","student_group_name","program","custom_branch","disabled"]&limit_page_length=500`, { headers });
  const sgs = (await sgRes.json()).data || [];
  console.log(`\nTotal Student Groups: ${sgs.length}`);
  
  const branchProgramsMap = {};
  for (const sg of sgs) {
    if (sg.disabled === 1) continue;
    const branch = sg.custom_branch || 'Unassigned';
    if (!branchProgramsMap[branch]) branchProgramsMap[branch] = new Set();
    if (sg.program) branchProgramsMap[branch].add(sg.program);
  }

  console.log("\n=== ACTIVE PROGRAMS OFFERED PER BRANCH (from live Student Groups) ===");
  for (const b in branchProgramsMap) {
    console.log(`\nBranch: ${b}`);
    console.log(Array.from(branchProgramsMap[b]).sort());
  }
}

auditBackendMasters();
