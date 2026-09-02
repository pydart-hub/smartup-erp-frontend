const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function checkUnallocated() {
  const ids = [
    "STU-SU CHL-26-035",
    "STU-SU CHL-26-147",
    "STU-SU ERV-26-180",
    "STU-SU CHL-26-188",
    "STU-SU CHL-26-219",
    "STU-SU CHL-26-344",
    "STU-SU CHL-26-345"
  ];

  // 1. Fetch details from Student Doc
  for (const id of ids) {
    const res = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(id)}`, { headers });
    const data = (await res.json()).data || {};
    console.log(`Student: ${id}`);
    console.log(`  Name: ${data.student_name}`);
    console.log(`  Gender: ${data.gender}`);
    console.log(`  custom_branch: ${data.custom_branch}`);
    console.log(`  custom_plan: ${data.custom_plan}`);
    console.log(`  disabled: ${data.disabled}`);
  }

  // 2. Also check if these 7 are allocated to ANY OTHER Student Group in Frappe
  const sgRes = await fetch(`${baseUrl}/api/resource/Student%20Group?limit_page_length=500`, { headers });
  const allSgs = (await sgRes.json()).data || [];
  
  for (const id of ids) {
    const memberships = [];
    for (const sg of allSgs) {
      const gDoc = await (await fetch(`${baseUrl}/api/resource/Student%20Group/${encodeURIComponent(sg.name)}`, { headers })).json();
      const inGrp = (gDoc.data?.students || []).find(s => s.student === id);
      if (inGrp) {
        memberships.push({ group: sg.name, active: inGrp.active });
      }
    }
    console.log(`\nMembership for ${id}:`, memberships.length ? memberships : "NONE (Completely Unallocated across entire ERP)");
  }
}

checkUnallocated();
