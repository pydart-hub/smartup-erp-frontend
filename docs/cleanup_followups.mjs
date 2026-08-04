// Using native fetch in Node.js 18+
import fs from "fs";

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

// Set DRY_RUN to true to list duplicates without deleting.
// Set to false to perform the actual deletion on the backend.
const DRY_RUN = false; 

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

async function frappeDelete(path) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "DELETE",
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe DELETE ${path} error (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Starting cleanup scan (DRY_RUN = ${DRY_RUN})...`);

  console.log("Fetching Payment Entries...");
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

  console.log("Fetching Fee Follow Ups...");
  const followupsRes = await frappeGet("resource/Fee Follow Up", {
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "remarks"
    ]),
    limit_page_length: "10000",
  });
  const followups = followupsRes.data || [];

  // Map customer name to student details
  const customerToStudent = new Map();
  for (const s of students) {
    if (s.customer) {
      customerToStudent.set(s.customer.trim(), s);
    }
  }

  // Map student ID to their payment entries
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

  // Filter followups that claim payment received
  const paymentFollowups = followups.filter(
    (f) => f.payment_received === 1 || f.call_status === "Already Paid"
  );

  // Group followups by student ID
  const followupsByStudent = new Map();
  for (const f of paymentFollowups) {
    if (f.student) {
      if (!followupsByStudent.has(f.student)) {
        followupsByStudent.set(f.student, []);
      }
      followupsByStudent.get(f.student).push(f);
    }
  }

  const duplicatesToDelete = [];
  let totalLogsChecked = 0;

  // Perform matching to identify duplicates
  for (const [studentId, studentFollowups] of followupsByStudent.entries()) {
    // Sort followups chronologically so we match early ones first
    studentFollowups.sort((a, b) => (a.call_date || "").localeCompare(b.call_date || ""));

    const studentPayments = paymentsByStudent.get(studentId) || [];
    // Keep track of which payment entries have already been claimed/matched
    const matchedPaymentNames = new Set();

    for (const log of studentFollowups) {
      totalLogsChecked++;
      const logAmt = log.amount_received || 0;

      // Find an available payment entry for this student that matches the amount (approximate match +/- 2)
      const matchingPayment = studentPayments.find(
        (p) => !matchedPaymentNames.has(p.name) && Math.abs(p.paid_amount - logAmt) <= 2
      );

      if (matchingPayment) {
        // Successfully matched this log to a real payment entry
        matchedPaymentNames.add(matchingPayment.name);
      } else {
        // No matching payment entry found (or it was already claimed by an earlier log)
        // This is a duplicate or unverified entry
        duplicatesToDelete.push(log);
      }
    }
  }

  console.log(`\nScan complete:`);
  console.log(`- Checked ${totalLogsChecked} paid follow-up logs.`);
  console.log(`- Found ${duplicatesToDelete.length} duplicate/unverified logs.`);

  if (duplicatesToDelete.length === 0) {
    console.log("No duplicate logs found to clean up.");
    return;
  }

  // Write details to log file
  const reportPath = "docs/cleanup_plan_report.md";
  let reportMd = `# Duplicate Follow-Up Cleanup Plan\n\n`;
  reportMd += `**Mode:** ${DRY_RUN ? "DRY RUN (No deletions performed)" : "LIVE EXECUTION (Deleted records)"}\n`;
  reportMd += `**Total Duplicate Records Identified:** ${duplicatesToDelete.length}\n\n`;
  reportMd += `| Log Name | Student | Logged By | Date | Amount Claimed | Remarks |\n`;
  reportMd += `| :--- | :--- | :--- | :--- | :---: | :--- |\n`;

  for (const f of duplicatesToDelete) {
    reportMd += `| \`${f.name}\` | ${f.student_name} (\`${f.student}\`) | ${f.called_by} | ${f.call_date} | ₹${(f.amount_received || 0).toLocaleString("en-IN")} | ${f.remarks || "—"} |\n`;
  }

  fs.writeFileSync(reportPath, reportMd);
  console.log(`Detailed report written to ${reportPath}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No records were deleted. Review the report in docs/cleanup_plan_report.md");
    console.log("To perform actual deletion, edit docs/cleanup_followups.mjs and set DRY_RUN = false, then run it again.");
  } else {
    console.log("\n[LIVE EXECUTION] Starting deletion of duplicates...");
    let successCount = 0;
    let failCount = 0;

    for (const f of duplicatesToDelete) {
      try {
        console.log(`Deleting duplicate: ${f.name} (Amount: ₹${f.amount_received} for student ${f.student_name})...`);
        await frappeDelete(`resource/Fee Follow Up/${encodeURIComponent(f.name)}`);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete ${f.name}:`, err.message);
        failCount++;
      }
    }

    console.log(`\nDeletion completed:`);
    console.log(`- Successfully deleted: ${successCount} records.`);
    console.log(`- Failed to delete: ${failCount} records.`);
  }
}

main().catch(console.error);
