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
  console.log("Fetching Fee Follow Ups for Chullickal in July 2026...");
  const followupsRes = await frappeGet("resource/Fee Follow Up", {
    filters: JSON.stringify([
      ["branch", "=", "Smart Up Chullickal"],
      ["call_date", ">=", "2026-07-01 00:00:00"],
      ["call_date", "<=", "2026-07-31 23:59:59"],
      ["payment_received", "=", 1],
    ]),
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "amount_received", "remarks", "invoice_ref"
    ]),
    limit_page_length: "1000",
  });
  const followups = followupsRes.data || [];

  console.log("Fetching Students...");
  const studentsRes = await frappeGet("resource/Student", {
    fields: JSON.stringify(["name", "student_name", "customer"]),
    limit_page_length: "10000",
  });
  const students = studentsRes.data || [];

  console.log("Fetching Payment Entries for July 2026...");
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
      ["posting_date", ">=", "2026-07-01"],
      ["posting_date", "<=", "2026-07-31"],
    ]),
    fields: JSON.stringify(["name", "party", "paid_amount", "posting_date", "mode_of_payment"]),
    limit_page_length: "5000",
  });
  const payments = paymentsRes.data || [];

  // Map customer -> student
  const customerToStudent = new Map();
  for (const s of students) {
    if (s.customer) {
      customerToStudent.set(s.customer.trim(), s);
    }
  }

  // Index payments by student ID
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

  // Group followups by student ID
  const followupsByStudent = new Map();
  for (const f of followups) {
    if (f.student) {
      if (!followupsByStudent.has(f.student)) {
        followupsByStudent.set(f.student, []);
      }
      followupsByStudent.get(f.student).push(f);
    }
  }

  console.log("\n=== Deep Study of Duplicate Follow-Ups vs Actual Payments ===");

  const reportData = [];

  for (const [studentId, studentFollowups] of followupsByStudent.entries()) {
    const studentPayments = paymentsByStudent.get(studentId) || [];
    const studentName = studentFollowups[0].student_name;

    // Check if there are any duplicates or mismatch
    const totalClaimed = studentFollowups.reduce((sum, f) => sum + (f.amount_received || 0), 0);
    const totalPaid = studentPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

    if (studentFollowups.length > 1 || totalClaimed !== totalPaid) {
      // Trace matching
      // Sort logs and payments
      studentFollowups.sort((a, b) => (a.call_date || "").localeCompare(b.call_date || ""));
      studentPayments.sort((a, b) => (a.posting_date || "").localeCompare(b.posting_date || ""));

      const matchedPaymentNames = new Set();
      const confirmedLogs = [];
      const duplicateLogs = [];

      for (const log of studentFollowups) {
        const logAmt = log.amount_received || 0;
        
        // Find matching payment entry in July
        const match = studentPayments.find(
          (p) => !matchedPaymentNames.has(p.name) && Math.abs(p.paid_amount - logAmt) <= 2
        );

        if (match) {
          matchedPaymentNames.add(match.name);
          confirmedLogs.push({ log, payment: match });
        } else {
          duplicateLogs.push(log);
        }
      }

      if (duplicateLogs.length > 0) {
        reportData.push({
          studentName,
          studentId,
          payments: studentPayments,
          confirmed: confirmedLogs,
          duplicates: duplicateLogs,
        });
      }
    }
  }

  // Print results
  let md = `# Deep Study: Exact Duplicate Follow-up Logs & Matching July Payments\n\n`;
  
  for (const item of reportData) {
    md += `### Student: ${item.studentName} (${item.studentId})\n`;
    
    md += `**Actual July Payment Entries:**\n`;
    if (item.payments.length > 0) {
      for (const p of item.payments) {
        md += `* \`${p.name}\` posted on **${p.posting_date}** : **₹${p.paid_amount.toLocaleString("en-IN")}** (${p.mode_of_payment})\n`;
      }
    } else {
      md += `* *No Payment Entries found in July 2026!*\n`;
    }

    md += `\n**Confirmed Follow-up Logs (Valid):**\n`;
    for (const c of item.confirmed) {
      md += `* \`${c.log.name}\` logged on **${c.log.call_date}** : **₹${c.log.amount_received.toLocaleString("en-IN")}** (Matched to Payment \`${c.payment.name}\`)\n`;
    }

    md += `\n**Exactly Duplicate Follow-up Logs (To Be Cleaned):**\n`;
    for (const d of item.duplicates) {
      md += `* **\`${d.name}\`** logged on **${d.call_date}** : **₹${(d.amount_received || 0).toLocaleString("en-IN")}** (No matching payment or already matched) | Remarks: "${d.remarks || "none"}"\n`;
    }
    
    md += `\n---\n\n`;
  }

  fs.writeFileSync("docs/exact_duplicates_deep_study.md", md);
  console.log("Deep study report written to docs/exact_duplicates_deep_study.md");
}

main().catch(console.error);
