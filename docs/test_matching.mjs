async function main() {
  const FRAPPE_URL = "https://smartup.m.frappe.cloud";
  const API_KEY = "03330270e330d49";
  const API_SECRET = "9c2261ae11ac2d2";
  const AUTH = `token ${API_KEY}:${API_SECRET}`;

  // Fetch Baha Anas payments
  const student = "STU-SU CHL-26-244";
  const studentUrl = `${FRAPPE_URL}/api/resource/Student/${student}`;
  const studentRes = await fetch(studentUrl, { headers: { Authorization: AUTH } });
  const studentData = await studentRes.json();
  const customer = studentData.data.customer;

  // Payments
  const peUrl = `${FRAPPE_URL}/api/resource/Payment Entry?filters=[["party","=","${customer}"],["posting_date",">=","2026-08-01"]]&fields=["name","party","paid_amount","posting_date","mode_of_payment"]&order_by=posting_date desc`;
  const peRes = await fetch(peUrl, { headers: { Authorization: AUTH } });
  const payments = (await peRes.json()).data || [];

  // Logs
  const fuUrl = `${FRAPPE_URL}/api/resource/Fee Follow Up?filters=[["student","=","${student}"]]&fields=["name","student","student_name","call_status","payment_received","amount_received","invoice_ref","creation","called_by","call_date"]&order_by=call_date desc`;
  const fuRes = await fetch(fuUrl, { headers: { Authorization: AUTH } });
  const logsForStudent = (await fuRes.json()).data || [];

  console.log("Payments count:", payments.length);
  console.log("Logs count:", logsForStudent.length);

  // We track used logs to prevent double claiming (wait, does the original code do this? No, let's see what the original code does first)
  const rows = [];
  for (const payment of payments) {
    const paidAmt = payment.paid_amount ?? 0;

    // PRIMARY
    let claimingLog = logsForStudent.find(
      (log) => log.invoice_ref && log.invoice_ref.trim() === payment.name?.trim()
    ) ?? null;

    let matchType = claimingLog ? "PRIMARY" : "NONE";

    // FALLBACK
    if (!claimingLog) {
      claimingLog = logsForStudent.find((log) => {
        const isPaymentLog =
          log.payment_received === 1 || log.call_status === "Already Paid";
        if (!isPaymentLog) return false;
        const logDate = log.call_date || log.creation?.slice(0, 10) || "";
        const paymentDate = payment.posting_date || "";
        if (logDate < paymentDate) return false; // must be on or after payment
        const amtReceived = log.amount_received ?? 0;
        const amtMatches =
          amtReceived === 0 || Math.abs(amtReceived - paidAmt) <= 1;
        return amtMatches;
      }) ?? null;
      if (claimingLog) matchType = "FALLBACK";
    }

    rows.push({
      paymentName: payment.name,
      paid_amount: paidAmt,
      claim_status: claimingLog !== null ? "claimed" : "awaiting_claim",
      claimingLog: claimingLog ? { name: claimingLog.name, invoice_ref: claimingLog.invoice_ref, amount_received: claimingLog.amount_received } : null,
      matchType
    });
  }

  console.log("Matching results:");
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
