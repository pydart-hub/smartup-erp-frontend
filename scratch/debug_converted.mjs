const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function main() {
  // 1. Get ALL logs for Saniya
  const qs1 = new URLSearchParams({
    filters: JSON.stringify([["called_by","=","saniya.smartup@gmail.com"]]),
    fields: JSON.stringify(["name","student","student_name","call_date","call_status","payment_received","amount_received"]),
    limit_page_length: '1000',
    order_by: 'call_date desc'
  });
  const res1 = await fetch(`${FRAPPE_URL}/api/resource/Fee%20Follow%20Up?${qs1}`, {
    headers: { Authorization: AUTH, Accept: 'application/json' }
  });
  const data1 = await res1.json();
  const allLogs = data1.data ?? [];
  console.log('=== ALL Saniya logs ===');
  console.log('Total log entries:', allLogs.length);

  // 2. Build latest-log-per-student map
  const latestByStudent = new Map();
  for (const log of allLogs) {
    if (log.student && !latestByStudent.has(log.student)) {
      latestByStudent.set(log.student, log);
    }
  }
  console.log('Unique students with any log:', latestByStudent.size);

  // 3. Director method: payment_received=1 logs (ALL logs, not deduped)
  const paidLogs = allLogs.filter(l => l.payment_received === 1 || l.payment_received === '1');
  console.log('\n=== Director method (payment_received=1, ALL log entries, NOT deduped) ===');
  console.log('paid_count (Director):', paidLogs.length);
  const directorAmount = paidLogs.reduce((s, l) => s + (l.amount_received ?? 0), 0);
  console.log('paid_amount (Director - sum of amount_received):', directorAmount);

  // 4. My new method: unique students whose LATEST log shows paid
  const convertedStudents = [];
  for (const [studentId, latestLog] of latestByStudent) {
    if (latestLog.payment_received === 1 || latestLog.payment_received === '1' || latestLog.call_status === 'Already Paid') {
      convertedStudents.push({ studentId, log: latestLog });
    }
  }
  console.log('\n=== New method (unique students, latest log paid) ===');
  console.log('converted_count (new):', convertedStudents.length);
  const newAmountReceived = convertedStudents.reduce((s, {log}) => s + (log.amount_received ?? 0), 0);
  console.log('paid_amount (new - sum of amount_received from latest logs only):', newAmountReceived);

  // 5. What the Director leaderboard shows
  console.log('\n=== Director leaderboard shows ===');
  console.log('paid_count: 52, paid_amount: 1,55,900');

  // 6. What the Sales User dashboard was showing before
  console.log('\n=== Summary of discrepancy ===');
  console.log('Director paid_count:', paidLogs.length, '(all payment_received=1 log entries, not deduped per student)');
  console.log('Director amount_received sum:', directorAmount);
  console.log('Deduped unique converted students:', convertedStudents.length);
  console.log('Deduped amount_received sum:', newAmountReceived);

  // 7. Check "Already Paid" status logs separately
  const alreadyPaidStatus = allLogs.filter(l => l.call_status === 'Already Paid');
  console.log('\nLogs with call_status="Already Paid" (regardless of payment_received field):', alreadyPaidStatus.length);
  const mixedPaid = allLogs.filter(l => l.payment_received === 1 || l.payment_received === '1' || l.call_status === 'Already Paid');
  console.log('Logs with payment_received=1 OR status=Already Paid:', mixedPaid.length);
}

main().catch(console.error);
