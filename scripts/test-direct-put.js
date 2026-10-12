const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testDirectUpdate() {
  const payload = {
    custom_branch_sessions: [
      {
        branch: "Smart Up Kadavanthara",
        session_type: "Morning",
        status: "Present",
        in_time: "09:10:00",
        out_time: "11:30:00",
        class_time: "09:00:00",
        is_visiting: 0,
        remarks: "Session 1"
      },
      {
        branch: "Smart Up Kadavanthara",
        session_type: "Evening",
        status: "Present",
        in_time: "16:05:00",
        out_time: "18:00:00",
        class_time: "16:00:00",
        is_visiting: 0,
        remarks: "Session 2"
      }
    ]
  };

  const res = await fetch(`${baseUrl}/api/resource/Attendance/HR-ATT-2026-08068`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('PUT response:', data);
}
testDirectUpdate();
