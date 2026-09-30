import { POST } from "../src/app/api/mcp/route.ts";
import { NextRequest } from "next/server";

async function test() {
  const req1 = new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_executive_kpis", arguments: {} },
    }),
  });
  const res1 = await (await POST(req1)).json();
  const kpiObj = JSON.parse(res1.result.content[0].text);
  console.log("--- Executive KPIs ---");
  console.log("Branch:", kpiObj.branch);
  console.log("Total Students:", kpiObj.total_students);
  console.log("Active Students:", kpiObj.active_students);
  console.log("Discontinued Students:", kpiObj.discontinued_students);
  console.log("Total Staff:", kpiObj.total_staff);
  console.log("Total Billed:", kpiObj.total_billed);
  console.log("Total Collected:", kpiObj.total_collected);
  console.log("Total Outstanding:", kpiObj.total_outstanding);
  console.log("Collection Rate:", kpiObj.collection_rate);

  const req2 = new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_student_metrics", arguments: {} },
    }),
  });
  const req3 = new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_fees_and_collections", arguments: {} },
    }),
  });
  const res3 = await (await POST(req3)).json();
  const feeObj = JSON.parse(res3.result.content[0].text);
  console.log("\n--- Fees & Collections ---");
  console.log("Summary:", feeObj.summary);
  console.log("Branch Breakdown sample:", feeObj.branch_breakdown.slice(0, 3));
}

test().catch(console.error);
