// Using native fetch in Node.js 18+
import fs from "fs";

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

const fromDate = "2026-07-01";
const toDate = "2026-07-31";

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
  console.log("Fetching Payment Entries for July 2026...");
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
      ["posting_date", ">=", fromDate],
      ["posting_date", "<=", toDate],
    ]),
    fields: JSON.stringify(["name", "party", "party_name", "company", "paid_amount", "posting_date"]),
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
      ["call_date", ">=", `${fromDate} 00:00:00`],
      ["call_date", "<=", `${toDate} 23:59:59`],
    ]),
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "remarks"
    ]),
    limit_page_length: "10000",
  });
  const followups = followupsRes.data || [];

  const customerToStudent = new Map();
  for (const s of students) {
    if (s.customer) {
      customerToStudent.set(s.customer.trim(), s);
    }
  }

  // Filter payment entries that are from students of Chullickal branch
  const chlPayments = [];
  for (const p of payments) {
    const cust = p.party ? p.party.trim() : "";
    const stud = customerToStudent.get(cust);
    const branch = stud ? stud.custom_branch : p.company;
    if (branch === "Smart Up Chullickal" || branch === "Chullickal") {
      chlPayments.push({
        ...p,
        student_id: stud ? stud.name : "Unknown",
        student_name: stud ? stud.student_name : p.party_name,
      });
    }
  }

  // Filter Chullickal followups in July that claimed payments
  const chlFollowups = followups.filter(
    (f) =>
      (f.branch === "Smart Up Chullickal" || f.branch === "Chullickal") &&
      (f.payment_received === 1 || f.call_status === "Already Paid")
  );

  console.log("\n=== Analyzing Chullickal Branch for July 2026 ===");
  console.log(`Total July Payment Entries (Accounts): ${chlPayments.length} items, Total: ₹${chlPayments.reduce((sum, p) => sum + p.paid_amount, 0).toLocaleString("en-IN")}`);
  console.log(`Total July Follow-up Conversions (Sales): ${chlFollowups.length} items, Total: ₹${chlFollowups.reduce((sum, f) => sum + (f.amount_received || 0), 0).toLocaleString("en-IN")}`);

  // Let's find exactly which follow-up logs do not have matching payment entries in July 2026
  console.log("\n--- Follow-up logs in July that do not have matching Payment Entry in July ---");
  let unmatchedTotal = 0;
  for (const f of chlFollowups) {
    const studentId = f.student;
    // Find all payment entries in July for this student
    const studentJulyPayments = chlPayments.filter((p) => p.student_id === studentId);
    
    // Check if there is an exact or near match
    const hasMatch = studentJulyPayments.some(
      (p) => Math.abs(p.paid_amount - f.amount_received) <= 2
    );

    if (!hasMatch) {
      unmatchedTotal += (f.amount_received || 0);
      console.log(`\nFollow-up: ${f.name} | Date: ${f.call_date} | User: ${f.called_by}`);
      console.log(`  Student: ${f.student_name} (${f.student})`);
      console.log(`  Claimed Amount: ₹${f.amount_received?.toLocaleString("en-IN")}`);
      console.log(`  Remarks: ${f.remarks}`);
      if (studentJulyPayments.length > 0) {
        console.log(`  Actual July Payment Entries (No amount match):`);
        for (const p of studentJulyPayments) {
          console.log(`    * ${p.name} on ${p.posting_date}: ₹${p.paid_amount.toLocaleString("en-IN")}`);
        }
      } else {
        console.log("  No payment entries found for this student in July 2026.");
      }
    }
  }
  console.log(`\nTotal unmatched/unverified follow-up amount in July: ₹${unmatchedTotal.toLocaleString("en-IN")}`);
}

main().catch(console.error);
