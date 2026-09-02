const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function getFeeStructures() {
  const res = await fetch(`${baseUrl}/api/resource/Fee%20Structure?fields=["name","program","academic_year","total_amount","custom_plan","custom_no_of_instalments","custom_branch"]&limit_page_length=500`, { headers });
  const list = (await res.json()).data || [];
  console.log(`Total Fee Structure records in Frappe: ${list.length}`);
  console.log('Sample Fee Structures:', list.slice(0, 10));

  const instalmentOptions = new Set(list.map(f => f.custom_no_of_instalments).filter(Boolean));
  console.log('Existing instalment options in Frappe:', Array.from(instalmentOptions));

  const plans = new Set(list.map(f => f.custom_plan).filter(Boolean));
  console.log('Existing plans in Frappe:', Array.from(plans));

  // Check how many have custom_no_of_instalments = "5"
  const inst5 = list.filter(f => f.custom_no_of_instalments === '5');
  console.log(`Fee Structures with 5 instalments: ${inst5.length}`);
}

getFeeStructures();
