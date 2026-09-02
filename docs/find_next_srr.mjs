const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function findHighestSrr() {
  const res = await fetch(`${baseUrl}/api/resource/Student?filters=[["custom_branch","=","Smart Up Chullickal"]]&fields=["name","student_name","custom_srr_id"]&limit_page_length=500`, { headers });
  const list = (await res.json()).data || [];
  let max = 0;
  for (const s of list) {
    const num = parseInt(s.custom_srr_id, 10);
    if (!isNaN(num) && num > max) max = num;
  }
  console.log(`Highest custom_srr_id at Chullickal: ${max}`);
  console.log(`Next available SRR ID: ${max + 1}`);

  // Verify if STU-SU CHL-26-${max+1} and PEN-10th-Chullickal 26-27-${max+1} are completely free
  const testPEN = `PEN-10th-Chullickal 26-27-${max + 1}`;
  const peCheck = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(testPEN)}`, { headers });
  console.log(`Check ${testPEN}: status ${peCheck.status} (${peCheck.status === 404 ? 'AVAILABLE ✅' : 'TAKEN ❌'})`);
}

findHighestSrr();
