const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function check() {
  const agRes = await fetch(`${base}/api/resource/Assessment Group?fields=["name","assessment_group_name"]`, { headers });
  console.log('Assessment Groups:', await agRes.json());

  const sgRes = await fetch(`${base}/api/resource/Student Group?filters=[["student_group_name","like","%Eraveli-10th State-A%"]]&fields=["name","student_group_name"]`, { headers });
  const sgs = await sgRes.json();
  console.log('Student Groups:', sgs);

  if (sgs.data && sgs.data.length > 0) {
    const sgName = sgs.data[0].name;
    const apRes = await fetch(`${base}/api/resource/Assessment Plan?filters=[["student_group","=","${sgName}"]]&fields=["name","assessment_name","assessment_group","course"]&limit_page_length=50`, { headers });
    console.log(`Assessment Plans for ${sgName}:`, await apRes.json());
  }
}
check();
