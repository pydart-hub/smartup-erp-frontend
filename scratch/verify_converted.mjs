const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function checkUser(email, label) {
  // New logic: fetch payment_received=1, all-time, order asc, dedup by first paid log
  const qs = new URLSearchParams({
    filters: JSON.stringify([
      ["called_by", "=", email],
      ["payment_received", "=", 1],
    ]),
    fields: JSON.stringify(["student", "amount_received", "call_date"]),
    limit_page_length: '1000',
    order_by: 'call_date asc'
  });
  const res = await fetch(`${FRAPPE_URL}/api/resource/Fee%20Follow%20Up?${qs}`, {
    headers: { Authorization: AUTH, Accept: 'application/json' }
  });
  const data = await res.json();
  const paidLogs = data.data ?? [];

  const firstPaidByStudent = new Map();
  for (const log of paidLogs) {
    if (log.student && !firstPaidByStudent.has(log.student)) {
      firstPaidByStudent.set(log.student, log.amount_received ?? 0);
    }
  }
  const converted_count = firstPaidByStudent.size;
  let paid_amount = 0;
  for (const amt of firstPaidByStudent.values()) paid_amount += amt;

  console.log(`\n=== ${label} (${email}) ===`);
  console.log(`Total payment_received=1 log entries: ${paidLogs.length}`);
  console.log(`Unique converted students (new logic): ${converted_count}`);
  console.log(`Total paid_amount (first paid log per student): ${paid_amount.toLocaleString('en-IN')}`);
}

async function main() {
  await checkUser('saniya.smartup@gmail.com', 'Saniya');
  await checkUser('farijabasheer11@gmail.com', 'Farija');
  await checkUser('sneha.smartup@gmail.com', 'Sneha');

  console.log('\n=== Director leaderboard shows (last 7 days filter) ===');
  console.log('Saniya: paid_count=52, paid_amount=1,55,900');
  console.log('Farija: paid_count=37, paid_amount=1,23,250');
  console.log('Sneha:  paid_count=10, paid_amount=27,500');
}

main().catch(console.error);
