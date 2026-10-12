const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function checkChildDocType() {
  const childRes = await fetch(`${baseUrl}/api/resource/DocType/Attendance Branch Session`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const childData = await childRes.json();
  console.log('Attendance Branch Session fields:');
  console.log(childData.data?.fields?.map(f => ({ name: f.fieldname, type: f.fieldtype, label: f.label })));

  const queryRowsRes = await fetch(`${baseUrl}/api/resource/Attendance Branch Session?filters=[["parent","=","HR-ATT-2026-08068"]]&fields=["*"]`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const queryRows = await queryRowsRes.json();
  console.log('Child rows for HR-ATT-2026-08068:', queryRows);
}
checkChildDocType();
