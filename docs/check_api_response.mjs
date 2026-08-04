async function main() {
  const FRAPPE_URL = "https://smartup.m.frappe.cloud";
  const API_KEY = "03330270e330d49";
  const API_SECRET = "9c2261ae11ac2d2";
  const AUTH = `token ${API_KEY}:${API_SECRET}`;

  // Let's call the next.js api by running its logic directly or mimicking the fetch.
  // Wait, let's fetch the data directly using the same logic as the route handler.
  // We can see what the backend would return.
  const branch = "Smart Up Chullickal";
  const sinceDate = "2026-07-30"; // 4 days ago from Aug 3

  const [followUpRes, paymentsRes, branchStudentsRes] = await Promise.all([
    fetch(`${FRAPPE_URL}/api/resource/Fee Follow Up?filters=[["branch","=","${branch}"]]&fields=["name","student","student_name","branch","call_date","called_by","call_status","payment_received","amount_received","payment_mode","remarks","next_followup_date","invoice_ref","creation"]&order_by=call_date desc&limit_page_length=1000`, { headers: { Authorization: AUTH } }).then(r => r.json()),
    fetch(`${FRAPPE_URL}/api/resource/Payment Entry?filters=[["payment_type","=","Receive"],["docstatus","=",1],["party_type","=", "Customer"],["company","=","${branch}"],["posting_date",">=","${sinceDate}"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","posting_date"]&order_by=posting_date desc&limit_page_length=1000`, { headers: { Authorization: AUTH } }).then(r => r.json()),
    fetch(`${FRAPPE_URL}/api/resource/Student?filters=[["custom_branch","=","${branch}"],["customer","is","set"]]&fields=["name","student_name","customer"]&limit_page_length=2000`, { headers: { Authorization: AUTH } }).then(r => r.json())
  ]);

  const allLogsByStudent = new Map();
  for (const log of (followUpRes.data ?? [])) {
    if (!log.student) continue;
    if (!allLogsByStudent.has(log.student)) allLogsByStudent.set(log.student, []);
    allLogsByStudent.get(log.student).push(log);
  }

  const customerToStudent = new Map();
  for (const student of (branchStudentsRes.data ?? [])) {
    const customer = student.customer?.trim();
    if (!customer || customerToStudent.has(customer)) continue;
    customerToStudent.set(customer, student);
  }

  const allPaymentsByStudent = new Map();
  for (const pe of (paymentsRes.data ?? [])) {
    const customer = pe.party?.trim();
    if (!customer) continue;
    const student = customerToStudent.get(customer);
    const studentId = student?.name?.trim();
    if (!studentId) continue;
    if (!allPaymentsByStudent.has(studentId)) allPaymentsByStudent.set(studentId, []);
    allPaymentsByStudent.get(studentId).push(pe);
  }

  const rows = [];
  for (const [studentId, payments] of allPaymentsByStudent) {
    const logsForStudent = allLogsByStudent.get(studentId) ?? [];

    for (const payment of payments) {
      const paidAmt = payment.paid_amount ?? 0;

      let claimingLog = logsForStudent.find(
        (log) => log.invoice_ref && log.invoice_ref.trim() === payment.name?.trim()
      ) ?? null;

      if (!claimingLog) {
        claimingLog = logsForStudent.find((log) => {
          const isPaymentLog =
            log.payment_received === 1 || log.call_status === "Already Paid";
          if (!isPaymentLog) return false;
          const logDate = log.call_date || log.creation?.slice(0, 10) || "";
          const paymentDate = payment.posting_date || "";
          if (logDate < paymentDate) return false;
          const amtReceived = log.amount_received ?? 0;
          const amtMatches =
            amtReceived === 0 || Math.abs(amtReceived - paidAmt) <= 1;
          return amtMatches;
        }) ?? null;
      }

      rows.push({
        student_id: studentId,
        student_name: payment.party_name || studentId,
        claim_status: claimingLog !== null ? "claimed" : "awaiting_claim",
        recent_payment: {
          name: payment.name,
          posting_date: payment.posting_date || "",
          paid_amount: paidAmt,
        },
        claimed_by_log: claimingLog ? {
          name: claimingLog.name,
          called_by: claimingLog.called_by,
          invoice_ref: claimingLog.invoice_ref
        } : null
      });
    }
  }

  // Filter rows like Sales User with email sneha.smartup@gmail.com
  const emailLower = "sneha.smartup@gmail.com";
  const filteredRows = rows.filter((row) => {
    if (row.claim_status === "awaiting_claim") return true;
    return row.claimed_by_log?.called_by?.trim().toLowerCase() === emailLower;
  });

  console.log("Filtered Rows count:", filteredRows.length);
  console.log("Baha Anas rows in filtered rows:");
  console.log(JSON.stringify(filteredRows.filter(r => r.student_id === "STU-SU CHL-26-244"), null, 2));
}

main().catch(console.error);
