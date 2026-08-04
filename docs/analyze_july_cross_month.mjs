// Using native fetch in Node.js 18+
import fs from "fs";

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeGet(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Frappe GET ${path} error: ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log("Fetching ALL Payment Entries...");
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ]),
    fields: JSON.stringify(["name", "party", "paid_amount", "posting_date", "company"]),
    limit_page_length: "10000",
  });
  const payments = paymentsRes.data || [];

  console.log("Fetching Students...");
  const studentsRes = await frappeGet("resource/Student", {
    fields: JSON.stringify(["name", "student_name", "customer", "custom_branch"]),
    limit_page_length: "10000",
  });
  const students = studentsRes.data || [];

  console.log("Fetching Fee Follow Ups for July 2026...");
  const followupsRes = await frappeGet("resource/Fee Follow Up", {
    filters: JSON.stringify([
      ["call_date", ">=", "2026-07-01 00:00:00"],
      ["call_date", "<=", "2026-07-31 23:59:59"],
    ]),
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "remarks"
    ]),
    limit_page_length: "5000",
  });
  const followups = followupsRes.data || [];

  const customerToStudent = new Map();
  for (const s of students) {
    if (s.customer) {
      customerToStudent.set(s.customer.trim(), s);
    }
  }

  // Index all payments by student ID
  const paymentsByStudent = new Map();
  for (const p of payments) {
    const cust = p.party ? p.party.trim() : "";
    const stud = customerToStudent.get(cust);
    if (stud) {
      const studentId = stud.name;
      if (!paymentsByStudent.has(studentId)) {
        paymentsByStudent.set(studentId, []);
      }
      paymentsByStudent.get(studentId).push(p);
    }
  }

  // Filter Chullickal followups in July that claimed payments
  const chlFollowups = followups.filter(
    (f) =>
      (f.branch === "Smart Up Chullickal" || f.branch === "Chullickal") &&
      (f.payment_received === 1 || f.call_status === "Already Paid")
  );

  console.log("\n=== Trace July 2026 Chullickal Follow-Up matches ===");

  const matchedPaymentNames = new Set();
  const matchedLogs = [];
  const unmatchedLogs = [];

  // Sort chronologically
  chlFollowups.sort((a, b) => (a.call_date || "").localeCompare(b.call_date || ""));

  for (const log of chlFollowups) {
    const studentId = log.student;
    const studentPayments = paymentsByStudent.get(studentId) || [];
    const logAmt = log.amount_received || 0;

    // Find matching payment entry (approximate match +/- 2)
    const matchingPayment = studentPayments.find(
      (p) => !matchedPaymentNames.has(p.name) && Math.abs(p.paid_amount - logAmt) <= 2
    );

    if (matchingPayment) {
      matchedPaymentNames.add(matchingPayment.name);
      matchedLogs.push({ log, payment: matchingPayment });
    } else {
      unmatchedLogs.push(log);
    }
  }

  console.log(`\nTotal July follow-up logs claiming payment: ${chlFollowups.length}`);
  console.log(`- Matched to a payment entry: ${matchedLogs.length}`);
  console.log(`- Unmatched (no payment entry found): ${unmatchedLogs.length}`);

  console.log("\n--- Analysis of Matches (Cross-Month / Outside July) ---");
  let crossMonthCount = 0;
  let crossMonthTotal = 0;
  for (const m of matchedLogs) {
    const payDate = m.payment.posting_date || "";
    const isJulyPayment = payDate.startsWith("2026-07");
    
    if (!isJulyPayment) {
      crossMonthCount++;
      crossMonthTotal += m.log.amount_received;
      console.log(`Log: ${m.log.name} (Date: ${m.log.call_date}, Amt: ₹${m.log.amount_received})`);
      console.log(`  Matched Payment: ${m.payment.name} (Posting Date: ${payDate}, Amt: ₹${m.payment.paid_amount})`);
    }
  }

  console.log(`\nTotal Cross-Month matched logs in July: ${crossMonthCount} logs, Total amount: ₹${crossMonthTotal.toLocaleString("en-IN")}`);
}

main().catch(console.error);
