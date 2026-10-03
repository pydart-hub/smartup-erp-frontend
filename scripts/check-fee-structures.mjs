const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkFees() {
  const p = new URLSearchParams();
  p.append('doctype', 'Fee Structure');
  p.append('fields', JSON.stringify(['name', 'program', 'total_amount']));
  p.append('filters', JSON.stringify([['Fee Structure', 'name', 'like', '%CHL%']]));
  p.append('limit_page_length', '100');

  const feeRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString()
  })).json();
  
  console.log('Fee structures:', feeRes.message?.values?.filter(v => v[0].includes('12th') || v[0].includes('Science')));
}

checkFees().catch(console.error);
