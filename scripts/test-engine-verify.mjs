import {
  getLiveOverdueDues,
  getLiveFeesData,
  getLiveExamPerformance,
  getLiveExamToppers,
} from "../src/lib/server/aiErpEngine.ts";

async function verify() {
  console.log("--- 1. Testing Overdue Dues ---");
  const overdue = await getLiveOverdueDues();
  console.log("Total Overdue:", overdue.total_overdue);
  console.log("Students with Overdue:", overdue.students_with_overdue);
  console.log("Overdue Invoices:", overdue.overdue_invoices_count);
  console.log("Branches:", overdue.branch_breakdown.length);
  console.log("Sample branch:", overdue.branch_breakdown[0]);

  console.log("\n--- 2. Testing Fees Data Summary ---");
  const fees = await getLiveFeesData();
  console.log("Fees Summary Total Overdue:", fees.summary.total_overdue);
  console.log("Fees Summary Students with Overdue:", fees.summary.students_with_overdue);
  console.log("Fees Summary Invoices Count:", fees.summary.overdue_invoices_count);

  console.log("\n--- 3. Testing Exam Performance ---");
  const examPerf = await getLiveExamPerformance();
  console.log("Exam Summary:", examPerf.summary);
  console.log("Best performing exams count:", examPerf.best_performing_exams.length);
  console.log("Top 3 best performing exams:", examPerf.best_performing_exams.slice(0, 3));
  console.log("Top 3 students overall:", examPerf.best_performing_students.slice(0, 3));
  console.log("CWC branches with toppers:", Object.keys(examPerf.cwc_exam_toppers_by_branch));

  console.log("\n--- All tests completed successfully! ---");
}

verify().catch(console.error);
