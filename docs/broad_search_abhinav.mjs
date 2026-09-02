const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function broadSearch() {
  // 1. Fetch ALL Students without filter and search locally case-insensitive
  let allStudents = [];
  let start = 0;
  while (true) {
    const res = await fetch(`${baseUrl}/api/resource/Student?fields=["name","student_name","first_name","last_name","middle_name","gender","custom_branch","custom_school_class","custom_board","custom_plan","disabled","creation"]&limit_start=${start}&limit_page_length=500`, { headers });
    const batch = (await res.json()).data || [];
    allStudents.push(...batch);
    if (batch.length < 500) break;
    start += 500;
  }
  console.log(`Total Student records scanned: ${allStudents.length}`);

  const matches = allStudents.filter(s => {
    const fullStr = `${s.name} ${s.student_name} ${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    return fullStr.includes('abhinav') || fullStr.includes('abhina');
  });

  console.log(`Matches in Student doctype:`, matches);

  // 2. Also search Student Applicant doctype (admissions lead / pending admission)
  const appRes = await fetch(`${baseUrl}/api/resource/Student%20Applicant?fields=["name","first_name","last_name","student_name","application_status","program","custom_branch"]&limit_page_length=100`, { headers });
  const applicants = (await appRes.json()).data || [];
  const appMatches = applicants.filter(a => JSON.stringify(a).toLowerCase().includes('abhinav'));
  console.log(`Matches in Student Applicant doctype:`, appMatches);

  // 3. Search Sales Order (in case invoice/order was created)
  const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order?fields=["name","customer","customer_name","custom_student","custom_student_name"]&limit_page_length=500`, { headers });
  const soList = (await soRes.json()).data || [];
  const soMatches = soList.filter(s => JSON.stringify(s).toLowerCase().includes('abhinav'));
  console.log(`Matches in Sales Order:`, soMatches);

  // 4. Search Customer doctype
  const custRes = await fetch(`${baseUrl}/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=500`, { headers });
  const custList = (await custRes.json()).data || [];
  const custMatches = custList.filter(c => JSON.stringify(c).toLowerCase().includes('abhinav'));
  console.log(`Matches in Customer doctype:`, custMatches);

  // 5. Search Guardian doctype
  const guardRes = await fetch(`${baseUrl}/api/resource/Guardian?fields=["name","guardian_name"]&limit_page_length=500`, { headers });
  const guardList = (await guardRes.json()).data || [];
  const guardMatches = guardList.filter(g => JSON.stringify(g).toLowerCase().includes('abhinav'));
  console.log(`Matches in Guardian doctype:`, guardMatches);
}

broadSearch();
