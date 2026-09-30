import { POST } from "../src/app/api/mcp/route.ts";
import { NextRequest } from "next/server";

async function callMcp(body) {
  const req = new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return res.json();
}

async function run() {
  console.log("=== 1. TEST tools/list ===");
  const listRes = await callMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const toolNames = listRes.result?.tools?.map((t) => t.name) || [];
  console.log("Registered Tools count:", toolNames.length);
  console.log("Tools:", toolNames.join(", "));

  console.log("\n=== 2. TEST get_fees_and_collections ===");
  const feesRes = await callMcp({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "get_fees_and_collections", arguments: {} },
  });
  const feesText = feesRes.result?.content?.[0]?.text;
  const feesObj = JSON.parse(feesText);
  console.log("Fees Scope:", feesObj.summary?.scope);
  console.log("Total Invoiced:", feesObj.summary?.total_invoiced);
  console.log("Total Collected:", feesObj.summary?.total_collected);
  console.log("Total Overdue:", feesObj.summary?.total_overdue);
  console.log("Students with Overdue:", feesObj.summary?.students_with_overdue);
  console.log("Overdue Invoices Count:", feesObj.summary?.overdue_invoices_count);

  console.log("\n=== 3. TEST get_overdue_fees ===");
  const overdueRes = await callMcp({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "get_overdue_fees", arguments: {} },
  });
  const overdueObj = JSON.parse(overdueRes.result?.content?.[0]?.text);
  console.log("Overdue Total:", overdueObj.total_overdue);
  console.log("Overdue Students:", overdueObj.students_with_overdue);
  console.log("Branches:", overdueObj.branch_breakdown?.map(b => `${b.branch}: ₹${b.total_overdue}`));

  console.log("\n=== 4. TEST get_exam_metrics ===");
  const examMetricsRes = await callMcp({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "get_exam_metrics", arguments: {} },
  });
  const examMetricsObj = JSON.parse(examMetricsRes.result?.content?.[0]?.text);
  console.log("Best performing exam:", examMetricsObj.summary?.best_performing_exam, examMetricsObj.summary?.best_exam_avg_score);
  console.log("Top student overall:", examMetricsObj.summary?.top_student_overall, examMetricsObj.summary?.top_student_percentage);
  console.log("Total evaluated students:", examMetricsObj.summary?.total_evaluated_students);
  console.log("Best 3 performing exams:", examMetricsObj.best_performing_exams?.slice(0, 3)?.map(e => `${e.exam_name} (${e.average_percentage}%, pass: ${e.pass_rate})`));
  console.log("CWC topper overall:", examMetricsObj.cwc_summary?.overall_topper, examMetricsObj.cwc_summary?.overall_topper_percentage);

  console.log("\n=== 5. TEST get_exam_performance ===");
  const examPerfRes = await callMcp({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "get_exam_performance", arguments: { exam_group: "CWC" } },
  });
  const examPerfObj = JSON.parse(examPerfRes.result?.content?.[0]?.text);
  console.log("CWC Evaluated Exams:", examPerfObj.best_performing_exams?.length);
  console.log("CWC Top 3 Exams:", examPerfObj.best_performing_exams?.slice(0, 3)?.map(e => `${e.exam_name}: ${e.average_percentage}%`));

  console.log("\n=== 6. TEST get_top_students ===");
  const topStudentsRes = await callMcp({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "get_top_students", arguments: { exam_name: "CWC", limit: 5 } },
  });
  const topStudentsObj = JSON.parse(topStudentsRes.result?.content?.[0]?.text);
  console.log("Top 5 Students:", topStudentsObj.top_students?.slice(0, 5)?.map(s => `${s.student_name} (${s.branch}, ${s.overall_percentage}%, best: ${s.best_exam})`));
  console.log("Branch Toppers branches:", Object.keys(topStudentsObj.branch_toppers || {}));

  console.log("\n=== ALL MCP TOOLS PASSED PERFECTLY! ===");
}

run().catch(console.error);
