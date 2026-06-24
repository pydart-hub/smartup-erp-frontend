const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function main() {
  // Get ALL Saniya logs (no filter on payment_received)
  const qs = new URLSearchParams({
    filters: JSON.stringify([["called_by","=","saniya.smartup@gmail.com"]]),
    fields: JSON.stringify(["name","student","student_name","call_date","call_status","payment_received","amount_received"]),
    limit_page_length: '1000',
    order_by: 'call_date desc'
  });
  const res = await fetch(`${FRAPPE_URL}/api/resource/Fee%20Follow%20Up?${qs}`, {
    headers: { Authorization: AUTH, Accept: 'application/json' }
  });
  const data = await res.json();
  const allLogs = data.data ?? [];
  console.log('Total log entries:', allLogs.length);

  // The Director route uses:
  //   by_user key = called_by + "||" + branch (separate entry per branch!)
  //   paid_count++ and paid_amount += for each log where payment_received === 1
  // But notice: Director groups by (user, branch) pairs!
  
  const byUserBranch = new Map();
  const NO_ANSWER = ["Called – No Answer", "Called – Busy"];
  const PROMISED = ["Promised to Pay", "Will Pay This Week"];
  
  for (const log of allLogs) {
    const key = `${log.called_by}||${log.branch}`;
    if (!byUserBranch.has(key)) {
      byUserBranch.set(key, { called_by: log.called_by, branch: log.branch, calls: 0, answered: 0, promised: 0, paid_count: 0, paid_amount: 0 });
    }
    const entry = byUserBranch.get(key);
    entry.calls++;
    if (!NO_ANSWER.includes(log.call_status)) entry.answered++;
    if (PROMISED.includes(log.call_status)) entry.promised++;
    if (log.payment_received === 1 || log.payment_received === '1') {
      entry.paid_count++;
      entry.paid_amount += (log.amount_received ?? 0);
    }
  }

  console.log('\n=== Director by_user breakdown for Saniya ===');
  let totalPaidCount = 0;
  let totalPaidAmount = 0;
  for (const [key, entry] of byUserBranch) {
    if (entry.called_by === 'saniya.smartup@gmail.com') {
      console.log(`Branch: ${entry.branch} | calls: ${entry.calls} | answered: ${entry.answered} | promised: ${entry.promised} | paid_count: ${entry.paid_count} | paid_amount: ${entry.paid_amount}`);
      totalPaidCount += entry.paid_count;
      totalPaidAmount += entry.paid_amount;
    }
  }
  console.log('\nTotal paid_count across branches:', totalPaidCount);
  console.log('Total paid_amount across branches:', totalPaidAmount);

  // Now check: Director leaderboard shows 52 paid, ₹1,55,900
  // This is the AGGREGATED sum per user in the leaderboard component
  // Let me also check if the frontend aggregates differently

  // Fetch leaderboard API directly to see what it returns
  console.log('\n=== Checking Director leaderboard API ===');
  const leaderQs = new URLSearchParams({
    filters: JSON.stringify([["called_by","=","saniya.smartup@gmail.com"]]),
    fields: JSON.stringify(["name","student","called_by","branch","payment_received","amount_received","call_status"]),
    limit_page_length: '1000',
    order_by: 'call_date desc'
  });

  // Dedup: one entry per student (first occurrence = most recent since ordered desc)
  const latestByStudent = new Map();
  for (const log of allLogs) {
    if (log.student && !latestByStudent.has(log.student)) {
      latestByStudent.set(log.student, log);
    }
  }
  
  // If Director leaderboard deduplicates by student (latest log only):
  let dedupPaidCount = 0;
  let dedupPaidAmount = 0;
  for (const [studentId, log] of latestByStudent) {
    if (log.payment_received === 1 || log.payment_received === '1') {
      dedupPaidCount++;
      dedupPaidAmount += (log.amount_received ?? 0);
    }
  }
  console.log('Dedup (latest log per student, payment_received=1): count=', dedupPaidCount, 'amount=', dedupPaidAmount);

  // Maybe 500 limit is cutting data in Director route
  // Director route uses limit_page_length: "500" - should be fine for 298 logs
  
  // The director shows 52/155900 - let's see which grouping gives that
  // Try: per-student dedup, ONLY counting logs where payment_received=1 AND it's the FIRST payment log per student  
  const firstPaidByStudent = new Map();
  // Go in date ASC to find first payment
  const logsAsc = [...allLogs].sort((a, b) => a.call_date.localeCompare(b.call_date));
  for (const log of logsAsc) {
    if ((log.payment_received === 1 || log.payment_received === '1') && log.student && !firstPaidByStudent.has(log.student)) {
      firstPaidByStudent.set(log.student, log);
    }
  }
  let firstPaidCount = firstPaidByStudent.size;
  let firstPaidAmount = 0;
  for (const log of firstPaidByStudent.values()) firstPaidAmount += (log.amount_received ?? 0);
  console.log('First payment log per student (earliest): count=', firstPaidCount, 'amount=', firstPaidAmount);

  // Show all unique paid students with their payment counts
  const paidStudentMap = new Map();
  for (const log of allLogs) {
    if (log.payment_received === 1 || log.payment_received === '1') {
      if (!paidStudentMap.has(log.student)) paidStudentMap.set(log.student, []);
      paidStudentMap.get(log.student).push({ amount: log.amount_received, date: log.call_date });
    }
  }
  console.log('\nUnique students with any payment_received=1 log:', paidStudentMap.size);
  let multiPayCount = 0;
  for (const [s, logs] of paidStudentMap) {
    if (logs.length > 1) {
      multiPayCount++;
      // console.log('  Student with multiple paid logs:', s, logs);
    }
  }
  console.log('Students with MULTIPLE payment_received=1 logs:', multiPayCount);
}

main().catch(console.error);
