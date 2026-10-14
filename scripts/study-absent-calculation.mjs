import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/)[1].trim();
const key = env.match(/FRAPPE_API_KEY=(.*)/)[1].trim();
const sec = env.match(/FRAPPE_API_SECRET=(.*)/)[1].trim();

async function run() {
  // Abhishek K employee ID is HR-EMP-00168
  const res = await fetch(url + '/api/resource/Attendance?filters=' + encodeURIComponent(JSON.stringify([
    ["employee", "=", "HR-EMP-00168"]
  ])) + '&fields=' + encodeURIComponent(JSON.stringify(["name", "attendance_date", "status", "in_time", "out_time", "working_hours"])) + '&limit_page_length=200&order_by=attendance_date desc', {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const data = await res.json();
  const rows = data.data || [];
  console.log('Total attendance rows:', rows.length);

  const statusCount = {};
  for (const r of rows) {
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  }
  console.log('Status counts in Attendance doc:', statusCount);

  // Unique dates count
  const dateMap = {};
  for (const r of rows) {
    dateMap[r.attendance_date] = (dateMap[r.attendance_date] || []).concat(r);
  }
  console.log('Unique attendance dates:', Object.keys(dateMap).length);

  const duplicateDates = Object.entries(dateMap).filter(([k, v]) => v.length > 1);
  console.log('Dates with duplicate attendance entries:', duplicateDates.length);
  if (duplicateDates.length > 0) {
    console.log('Duplicate date example:', duplicateDates[0][0], duplicateDates[0][1]);
  }
}

run().catch(console.error);
