const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testSync() {
  const res = await fetch(`${baseUrl}/api/resource/Attendance/HR-ATT-2026-08068`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const data = await res.json();
  console.log('Docstatus:', data.data?.docstatus);
  console.log('custom_branch_sessions:', data.data?.custom_branch_sessions);
}
testSync();
