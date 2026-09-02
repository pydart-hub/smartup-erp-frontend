const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const auth = 'token 03330270e330d49:9c2261ae11ac2d2';

async function main() {
  const p1 = new URLSearchParams({
    fields: JSON.stringify(['student', 'program', 'docstatus', 'enrollment_date']),
    filters: JSON.stringify([['docstatus', '!=', 2]]),
    order_by: 'enrollment_date desc',
    limit_page_length: '20'
  });
  const r1 = await fetch(FRAPPE_URL + '/api/resource/Program Enrollment?' + p1, { headers: { Authorization: auth } });
  const data1 = (await r1.json()).data || [];
  console.log('With [docstatus, !=, 2]: count =', data1.length);
  
  const p2 = new URLSearchParams({
    fields: JSON.stringify(['student', 'program', 'docstatus', 'enrollment_date']),
    filters: JSON.stringify([['docstatus', '!=', '2']]),
    order_by: 'enrollment_date desc',
    limit_page_length: '20'
  });
  const r2 = await fetch(FRAPPE_URL + '/api/resource/Program Enrollment?' + p2, { headers: { Authorization: auth } });
  const data2 = (await r2.json()).data || [];
  console.log('With [docstatus, !=, "2"]: count =', data2.length);

  const p3 = new URLSearchParams({
    fields: JSON.stringify(['student', 'program', 'docstatus', 'enrollment_date']),
    order_by: 'enrollment_date desc',
    limit_page_length: '20'
  });
  const r3 = await fetch(FRAPPE_URL + '/api/resource/Program Enrollment?' + p3, { headers: { Authorization: auth } });
  const data3 = (await r3.json()).data || [];
  console.log('With NO docstatus filter: count =', data3.length);
  console.log('Sample data3:', data3.slice(0, 5));
}
main().catch(console.error);
