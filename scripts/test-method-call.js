const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = process.env.FRAPPE_API_KEY || '03330270e330d49';
const apiSecret = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testCall() {
  const sessions = [
    {
      id: "sess_1",
      branch: "Smart Up Kadavanthara",
      title: "Session 1",
      session_type: "Morning",
      status: "Present",
      in_time: "2026-10-06 09:10:00",
      out_time: "2026-10-06 11:30:00",
      class_time: "09:00",
      is_visiting: 0
    },
    {
      id: "sess_2",
      branch: "Smart Up Kadavanthara",
      title: "Session 2",
      session_type: "Evening",
      status: "Present",
      in_time: "2026-10-06 16:05:00",
      out_time: "2026-10-06 18:00:00",
      class_time: "16:00",
      is_visiting: 0
    }
  ];

  const payload = {
    existing_name: "HR-ATT-2026-08068",
    employee: "HR-EMP-00067",
    employee_name: "Anju S venu",
    attendance_date: "2026-10-06",
    status: "Present",
    company: "Smart Up Kadavanthara",
    session_branch: "Smart Up Kadavanthara",
    in_time: "2026-10-06 09:10:00",
    out_time: "2026-10-06 18:00:00",
    custom_class_time: "09:00",
    is_visiting: 0,
    sessions_json: JSON.stringify(sessions)
  };

  const res = await fetch(`${baseUrl}/api/method/set_attendance_status`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.json();
  console.log('Method response:', resData);

  // Read record to inspect custom_branch_sessions
  const getRes = await fetch(`${baseUrl}/api/resource/Attendance/HR-ATT-2026-08068`, {
    headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
  });
  const recData = await getRes.json();
  console.log('After method call, custom_branch_sessions:');
  console.log(recData.data?.custom_branch_sessions);
}
testCall();
