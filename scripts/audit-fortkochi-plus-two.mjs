import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function fetchRetry(endpoint, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${url}/api/${endpoint}`, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET ${endpoint} (${res.status}): ${text.slice(0, 300)}`);
      }
      return (await res.json()).data;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

async function main() {
  console.log("=== SCANNING FOR ALL PLUS TWO STUDENTS IN FORTKOCHI BRANCH ===");

  // 1. Fetch Students in Smart Up Fortkochi
  const stuFilters = JSON.stringify([
    ["custom_branch", "=", "Smart Up Fortkochi"],
    ["enabled", "=", 1],
  ]);
  const stuFields = JSON.stringify(["name", "student_name", "first_name", "customer", "custom_srr_id", "joining_date"]);
  
  const students = await fetchRetry(`resource/Student?filters=${encodeURIComponent(stuFilters)}&fields=${encodeURIComponent(stuFields)}&limit_page_length=1000`);

  console.log(`Found ${students.length} active students in Smart Up Fortkochi. Checking Program Enrollments for 12th / Plus Two...\n`);

  const plusTwoStudents = [];

  for (let i = 0; i < students.length; i++) {
    const stu = students[i];
    const peFilters = JSON.stringify([
      ["student", "=", stu.name],
      ["docstatus", "!=", 2],
    ]);
    const peFields = JSON.stringify(["name", "program", "student_batch_name", "academic_year"]);
    
    try {
      const enrollments = (await fetchRetry(`resource/Program Enrollment?filters=${encodeURIComponent(peFilters)}&fields=${encodeURIComponent(peFields)}&order_by=creation desc&limit_page_length=5`)) || [];
      const activeEnr = enrollments[0];
      if (!activeEnr) continue;

      const prog = (activeEnr.program || "").toLowerCase();
      const batch = (activeEnr.student_batch_name || "").toLowerCase();

      if (prog.includes("12th") || prog.includes("plus two") || batch.includes("12th") || batch.includes("fortkochi 26-27") || prog.includes("science") || prog.includes("commerce")) {
        plusTwoStudents.push({
          student: stu,
          enrollment: activeEnr,
        });
      }
    } catch (e) {
      console.warn(`Could not fetch PE for ${stu.name}: ${e.message}`);
    }
    
    // Pause briefly to prevent socket congestion
    await new Promise((r) => setTimeout(r, 30));
  }

  console.log(`Identified ${plusTwoStudents.length} Plus Two / 12th Grade students in Fortkochi.\nAuditing Invoices & Payments for all ${plusTwoStudents.length} students...\n`);

  const auditResults = [];

  for (let i = 0; i < plusTwoStudents.length; i++) {
    const item = plusTwoStudents[i];
    const stu = item.student;
    const enr = item.enrollment;
    const customerName = stu.customer || stu.student_name || stu.name;

    if ((i + 1) % 10 === 0 || i === plusTwoStudents.length - 1) {
      console.log(`Audited ${i + 1}/${plusTwoStudents.length} students...`);
    }

    try {
      // Fetch active Sales Invoices (docstatus = 1)
      const siFilters = JSON.stringify([
        ["customer", "=", customerName],
        ["company", "=", "Smart Up Fortkochi"],
        ["docstatus", "=", 1],
      ]);
      const siFields = JSON.stringify(["name", "due_date", "posting_date", "grand_total", "outstanding_amount", "status"]);
      const invoices = (await fetchRetry(`resource/Sales Invoice?filters=${encodeURIComponent(siFilters)}&fields=${encodeURIComponent(siFields)}&order_by=due_date asc&limit_page_length=100`)) || [];

      // Fetch full invoice detail for schedule check
      let scheduleMismatches = [];
      for (const inv of invoices) {
        try {
          const fullInv = await fetchRetry(`resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
          const sched = fullInv.payment_schedule || [];
          if (sched.length > 0) {
            const schedTotal = sched.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
            if (Math.abs(schedTotal - inv.grand_total) > 0.5) {
              scheduleMismatches.push({
                name: inv.name,
                grandTotal: inv.grand_total,
                schedTotal,
                outstanding: inv.outstanding_amount,
              });
            }
          }
        } catch (err) {
          // ignore fetch error
        }
      }

      // Fetch submitted Payment Entries (docstatus = 1)
      const peFiltersCustomer = JSON.stringify([
        ["party", "=", customerName],
        ["party_type", "=", "Customer"],
        ["company", "=", "Smart Up Fortkochi"],
        ["docstatus", "=", 1],
      ]);
      const peFieldsCustomer = JSON.stringify(["name", "posting_date", "paid_amount", "mode_of_payment"]);
      const paymentEntries = (await fetchRetry(`resource/Payment Entry?filters=${encodeURIComponent(peFiltersCustomer)}&fields=${encodeURIComponent(peFieldsCustomer)}&order_by=posting_date asc&limit_page_length=100`)) || [];

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
      const totalPaidPE = paymentEntries.reduce((sum, pe) => sum + (pe.paid_amount || 0), 0);
      const currentOutstandingSystem = invoices.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0);
      const trueOutstanding = Math.max(0, totalInvoiced - totalPaidPE);
      const discrepancy = currentOutstandingSystem - trueOutstanding;

      const isAffected = Math.abs(discrepancy) > 0.5 || scheduleMismatches.length > 0;

      auditResults.push({
        studentId: stu.name,
        srrId: stu.custom_srr_id || "-",
        studentName: stu.student_name || stu.first_name,
        program: enr.program,
        batch: enr.student_batch_name,
        customerName,
        invoiceCount: invoices.length,
        peCount: paymentEntries.length,
        totalInvoiced,
        totalPaidPE,
        currentOutstandingSystem,
        trueOutstanding,
        discrepancy,
        hasScheduleMismatch: scheduleMismatches.length > 0,
        scheduleMismatches,
        isAffected,
      });
    } catch (e) {
      console.warn(`Error auditing ${stu.student_name}: ${e.message}`);
    }

    await new Promise((r) => setTimeout(r, 40));
  }

  console.log("\n==================================================================");
  console.log("   FORTKOCHI PLUS TWO (12th GRADE) COMPREHENSIVE AUDIT REPORT    ");
  console.log("==================================================================\n");

  const affected = auditResults.filter((r) => r.isAffected);
  console.log(`Total 12th Grade Students Audited: ${auditResults.length}`);
  console.log(`Clean Students (Zero Discrepancy): ${auditResults.length - affected.length}`);
  console.log(`AFFECTED / DISCREPANT STUDENTS: ${affected.length}\n`);

  for (const r of affected) {
    console.log(`------------------------------------------------------------------`);
    console.log(`STUDENT: ${r.studentName} | ID: ${r.studentId} | SRR: ${r.srrId}`);
    console.log(`Class: ${r.program} | Batch: ${r.batch}`);
    console.log(`Total Invoiced:  ₹${r.totalInvoiced.toLocaleString("en-IN")}`);
    console.log(`Total Paid (PE): ₹${r.totalPaidPE.toLocaleString("en-IN")}`);
    console.log(`System Outstanding (Shown in UI): ₹${r.currentOutstandingSystem.toLocaleString("en-IN")}`);
    console.log(`True Expected Outstanding:       ₹${r.trueOutstanding.toLocaleString("en-IN")}`);
    console.log(`Over-reported Pending Amount:    ₹${r.discrepancy.toLocaleString("en-IN")}`);
    if (r.hasScheduleMismatch) {
      console.log(`⚠️ Payment Schedule Mismatch on Invoices:`);
      for (const m of r.scheduleMismatches) {
        console.log(`   - ${m.name}: Rate/Total = ₹${m.grandTotal}, Payment Schedule Total = ₹${m.schedTotal}, System Outstanding = ₹${m.outstanding}`);
      }
    }
  }

  console.log("\n=== SUMMARY TABLE OF ALL AFFECTED 12th GRADE STUDENTS ===");
  console.table(
    affected.map((a) => ({
      SRR: a.srrId,
      Name: a.studentName,
      Class: a.program,
      Invoiced: a.totalInvoiced,
      Paid: a.totalPaidPE,
      ShownPending: a.currentOutstandingSystem,
      TruePending: a.trueOutstanding,
      OverReported: a.discrepancy,
    }))
  );
}

main().catch(console.error);
