const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  const query = new URLSearchParams({
    filters: JSON.stringify([["attendance_date", "=", "2026-10-06"]]),
    fields: JSON.stringify(["name", "employee", "employee_name", "in_time", "out_time", "working_hours", "custom_sessions_json", "custom_class_time"]),
    limit_page_length: "10"
  });
  const res = await fetch(`${baseUrl}/api/resource/Attendance?${query}`, {
    headers: {
      'Authorization': `token ${apiKey}:${apiSecret}`
    }
  });
  const data = await res.json();
  console.log('Records on 2026-10-06:', JSON.stringify(data.data, null, 2));
}
check();

