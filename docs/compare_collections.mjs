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
  console.log("Fetching Payment Entries...");
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ]),
    fields: JSON.stringify(["name", "party", "party_name", "company", "paid_amount", "posting_date"]),
    limit_page_length: "20000",
  });
  const payments = paymentsRes.data || [];

  console.log("Fetching Students...");
  const studentsRes = await frappeGet("resource/Student", {
    fields: JSON.stringify(["name", "student_name", "customer", "custom_branch"]),
    limit_page_length: "20000",
  });
  const students = studentsRes.data || [];

  console.log("Fetching Fee Follow Ups...");
  const followupsRes = await frappeGet("resource/Fee Follow Up", {
    filters: JSON.stringify([]),
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "remarks"
    ]),
    limit_page_length: "20000",
  });
  const followups = followupsRes.data || [];

  // Index students
  const customerToStudent = new Map();
  for (const s of students) {
    if (s.customer) {
      customerToStudent.set(s.customer.trim(), s);
    }
  }

  // Filter payment entries that are from students
  const studentPayments = [];
  for (const p of payments) {
    const cust = p.party ? p.party.trim() : "";
    const stud = customerToStudent.get(cust);
    if (stud) {
      studentPayments.push({
        ...p,
        student_id: stud.name,
        student_name: stud.student_name,
        branch: stud.custom_branch || p.company,
      });
    }
  }

  // Group payments by branch
  const paymentsByBranch = {};
  for (const p of studentPayments) {
    const br = (p.branch || "Unknown").replace("Smart Up ", "");
    if (!paymentsByBranch[br]) paymentsByBranch[br] = [];
    paymentsByBranch[br].push(p);
  }

  // Filter followups that claim payment received
  const paymentFollowups = followups.filter(f => f.payment_received === 1 || f.call_status === "Already Paid");

  // Group followups by branch
  const followupsByBranch = {};
  for (const f of paymentFollowups) {
    const br = (f.branch || "Unknown").replace("Smart Up ", "");
    if (!followupsByBranch[br]) followupsByBranch[br] = [];
    followupsByBranch[br].push(f);
  }

  // Generate markdown report content
  let md = `# Collection Mismatch Analysis Report (All Dates)\n\n`;
  md += `This report outlines the discrepancies between the official **Payment Entries** and the sales **Fee Follow-Up** logs across all historical records.\n\n`;
  
  md += `## Summary by Branch\n\n`;
  md += `| Branch | Actual Payment Count | Actual Payments Total | Follow-up Logs Count | Follow-up Logs Total | Difference |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

  const allBranches = new Set([...Object.keys(paymentsByBranch), ...Object.keys(followupsByBranch)]);
  for (const br of [...allBranches].sort()) {
    const pList = paymentsByBranch[br] || [];
    const fList = followupsByBranch[br] || [];
    const pTotal = pList.reduce((sum, x) => sum + (x.paid_amount || 0), 0);
    const fTotal = fList.reduce((sum, x) => sum + (x.amount_received || 0), 0);
    const diff = fTotal - pTotal;
    md += `| **${br}** | ${pList.length} | ₹${pTotal.toLocaleString("en-IN")} | ${fList.length} | ₹${fTotal.toLocaleString("en-IN")} | **₹${diff.toLocaleString("en-IN")}** |\n`;
  }

  // Deep dive into Chullickal branch
  const chlPayments = paymentsByBranch["Chullickal"] || [];
  const chlFollowups = followupsByBranch["Chullickal"] || [];

  let zeroMatchCount = 0;
  let zeroMatchTotal = 0;
  let mismatchCount = 0;
  let matchCount = 0;

  const noMatchList = [];
  const mismatchList = [];

  for (const f of chlFollowups) {
    const studentId = f.student;
    const matchingPayments = chlPayments.filter(p => p.student_id === studentId);
    const matchingPaymentsTotal = matchingPayments.reduce((sum, x) => sum + x.paid_amount, 0);

    if (matchingPayments.length === 0) {
      zeroMatchCount++;
      zeroMatchTotal += (f.amount_received || 0);
      noMatchList.push(f);
    } else if (Math.abs(matchingPaymentsTotal - f.amount_received) > 2) {
      mismatchCount++;
      mismatchList.push({ f, payments: matchingPayments, totalPaid: matchingPaymentsTotal });
    } else {
      matchCount++;
    }
  }

  md += `\n## Chullickal Branch Deep Dive\n\n`;
  md += `* **Total Follow-up Logs claiming payments:** ${chlFollowups.length}\n`;
  md += `* **Perfectly matching follow-ups:** ${matchCount}\n`;
  md += `* **Follow-ups with NO matching payment entries:** ${zeroMatchCount} (Total amount claimed: ₹${zeroMatchTotal.toLocaleString("en-IN")})\n`;
  md += `* **Follow-ups with mismatched/duplicate amounts:** ${mismatchCount}\n\n`;

  md += `### 1. Follow-ups with NO matching payment entries in July\n`;
  md += `These logs represent instances where a sales user claimed a payment was received, but no submitted Payment Entry exists for that student in July.\n\n`;
  md += `| Log Name | Student | Logged By | Date | Amount Claimed | Remarks |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: | :--- |\n`;
  for (const f of noMatchList) {
    md += `| \`${f.name}\` | ${f.student_name} (\`${f.student}\`) | ${f.called_by} | ${f.call_date} | ₹${(f.amount_received || 0).toLocaleString("en-IN")} | ${f.remarks || "—"} |\n`;
  }

  md += `\n### 2. Follow-ups with mismatched/duplicate amounts\n`;
  md += `These logs show double-logging (multiple logs for the same student/payment) or splits that don't match the actual Payment Entry amounts.\n\n`;
  for (const item of mismatchList) {
    md += `#### \`${item.f.name}\` - ${item.f.student_name}\n`;
    md += `- **Logged by:** ${item.f.called_by} on ${item.f.call_date}\n`;
    md += `- **Claimed amount:** ₹${(item.f.amount_received || 0).toLocaleString("en-IN")}\n`;
    md += `- **Actual payment entries in system:** ₹${item.totalPaid.toLocaleString("en-IN")}\n`;
    for (const p of item.payments) {
      md += `  * Payment entry \`${p.name}\` on ${p.posting_date}: ₹${p.paid_amount.toLocaleString("en-IN")}\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync("docs/discrepancy_report.md", md);
  console.log("Markdown report written successfully to docs/discrepancy_report.md");
}

main().catch(console.error);
