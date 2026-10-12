const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function checkDocType() {
  const res = await fetch(`${baseUrl}/api/resource/Custom Field?filters=[["dt","=","Attendance"],["fieldname","=","custom_branch_sessions"]]&fields=["fieldname","fieldtype","options"]`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const data = await res.json();
  console.log('custom_branch_sessions Custom Field:', data);

  const res2 = await fetch(`${baseUrl}/api/resource/DocType/Attendance`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const dtData = await res2.json();
  console.log('Attendance fields count:', dtData.data?.fields?.length);
  const sessionField = dtData.data?.fields?.find(f => f.fieldname === 'custom_branch_sessions');
  console.log('sessionField in DocType:', sessionField);

  // Check child doctype Branch Attendance Session
  const childRes = await fetch(`${baseUrl}/api/resource/DocType/Branch Attendance Session`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const childData = await childRes.json();
  console.log('Branch Attendance Session fields:', childData.data?.fields?.map(f => ({ name: f.fieldname, type: f.fieldtype, label: f.label })));

  // Query database table for child rows
  const queryRowsRes = await fetch(`${baseUrl}/api/resource/Branch Attendance Session?filters=[["parent","=","HR-ATT-2026-08068"]]&fields=["*"]`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const queryRows = await queryRowsRes.json();
  console.log('Child rows for HR-ATT-2026-08068:', queryRows);
}
checkDocType();
