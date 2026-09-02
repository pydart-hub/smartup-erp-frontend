const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function checkFrappeFeeStructures() {
  const res = await fetch(`${baseUrl}/api/resource/Fee%20Structure?limit_page_length=500`, { headers });
  const list = (await res.json()).data || [];
  console.log(`Total Fee Structure records in Frappe: ${list.length}`);
  
  // Sample
  console.log("Sample Fee Structures:", list.slice(0, 15));

  // Check how many have Basic-5 or Basic-1
  const basic5 = list.filter(f => f.name.includes('Basic-5') || f.name.includes('-5'));
  console.log(`Fee Structures matching Basic-5: ${basic5.length}`, basic5);

  const basic1 = list.filter(f => f.name.includes('Basic-1') || f.name.includes('-1'));
  console.log(`Fee Structures matching Basic-1: ${basic1.length}`, basic1.slice(0, 10));
}

checkFrappeFeeStructures();
