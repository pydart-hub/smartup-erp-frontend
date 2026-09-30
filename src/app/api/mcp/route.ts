import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  getLiveFeesData,
  getLiveStudentsData,
  getLiveOrdersData,
  getLiveAttendanceData,
  getLiveStaffData,
  getLiveIssuesData,
  lookupStudent360,
  fetchLiveBranchData,
  matchBranchInList,
} from "@/lib/server/aiErpEngine";
import { db } from "@/lib/public-exam/db";

export const dynamic = "force-dynamic";

const MCP_TOOLS = [
  {
    name: "get_executive_kpis",
    description:
      "Get consolidated or branch-wise real-time executive KPIs: total students, active students, discontinued students, billed fees, collected fees, outstanding fees, and batch counts.",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Optional branch name (e.g. 'Smart Up Fortkochi', 'Chullickal', 'Palluruthy')",
        },
      },
    },
  },
  {
    name: "get_fees_and_collections",
    description:
      "Get real-time financial metrics: total invoiced, total collected, pending dues, overdue invoices list, and branch-by-branch fee comparisons.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
        limit: { type: "number", description: "Max invoice sample records (default 50)" },
      },
    },
  },
  {
    name: "get_student_metrics",
    description:
      "Get live student numbers: total students, active students, discontinued students (103), admission types (fresher, existing, rejoin), and active batches.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
      },
    },
  },
  {
    name: "get_sales_orders",
    description: "Get live sales orders, booking values, and delivery statuses.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
        limit: { type: "number", description: "Max order sample records (default 50)" },
      },
    },
  },
  {
    name: "get_attendance_metrics",
    description:
      "Get daily student attendance, absenteeism rate, recent absent students, and staff attendance.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
      },
    },
  },
  {
    name: "get_exam_metrics",
    description:
      "Get diagnosis exam statistics: published papers, published exams, and total student attempts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_staff_and_instructors",
    description: "Get real-time counts of employees and instructors across branches.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "lookup_student_360",
    description:
      "360-degree comprehensive student search by name, student ID (e.g. STU-SU CHL-26-303), or phone number. Returns student profile, sales orders, invoices, payments, attendance, and dues.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Student name, student ID, or phone number",
        },
      },
      required: ["query"],
    },
  },
];

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-ai-agent-key, mcp-session-id, Last-Event-ID",
    },
  });
}

// ── GET: Return MCP Server Info or SSE Stream ──
export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") || "";

  // If client requests SSE stream (standard MCP remote connection)
  if (acceptHeader.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sessionId = "smartup-" + Math.random().toString(36).substring(2, 9);
        const endpointMsg = `event: endpoint\ndata: https://smartuplearning.net/api/mcp?sessionId=${sessionId}\n\n`;
        controller.enqueue(encoder.encode(endpointMsg));
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
        ...corsHeaders,
      },
    });
  }

  // Standard JSON response: Server metadata & tool discovery
  return NextResponse.json(
    {
      name: "smartup-erp",
      version: "1.0.0",
      protocol: "mcp-2024-11-05",
      description: "SmartUp ERP Model Context Protocol (MCP) server for live ERP operations.",
      capabilities: {
        tools: { listChanged: false },
      },
      tools: MCP_TOOLS,
    },
    { headers: corsHeaders }
  );
}

// ── POST: JSON-RPC 2.0 Handler ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, id, method, params } = body;

    // 1. Initialize
    if (method === "initialize") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: "smartup-erp",
              version: "1.0.0",
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // 2. Ping
    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} }, { headers: corsHeaders });
    }

    // 3. Notifications (e.g. notifications/initialized, notifications/cancelled)
    if (method?.startsWith("notifications/")) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    // 4. Tools List
    if (method === "tools/list") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            tools: MCP_TOOLS,
          },
        },
        { headers: corsHeaders }
      );
    }

    // 5. Prompts List
    if (method === "prompts/list") {
      return NextResponse.json(
        { jsonrpc: "2.0", id, result: { prompts: [] } },
        { headers: corsHeaders }
      );
    }

    // 6. Resources List
    if (method === "resources/list") {
      return NextResponse.json(
        { jsonrpc: "2.0", id, result: { resources: [] } },
        { headers: corsHeaders }
      );
    }

    // 4. Tools Call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      let toolOutput: unknown = null;

      switch (toolName) {
        case "get_executive_kpis": {
          const branchMeta = await fetchLiveBranchData();
          const matched = matchBranchInList(args.branch, branchMeta.liveBranchList);
          const systemTotalStudents = branchMeta.liveBranchList.reduce((s, b) => s + b.total_students, 0);
          const systemActiveStudents = branchMeta.liveBranchList.reduce((s, b) => s + b.active_students, 0);
          const systemDiscontinuedStudents = branchMeta.liveBranchList.reduce(
            (s, b) => s + b.discontinued_students,
            0
          );
          const systemTotalInvoiced = branchMeta.liveBranchList.reduce((s, b) => s + b.total_invoiced, 0);
          const systemTotalOutstanding = branchMeta.liveBranchList.reduce(
            (s, b) => s + b.total_outstanding,
            0
          );
          const systemTotalCollected = Math.max(0, systemTotalInvoiced - systemTotalOutstanding);

          toolOutput = matched
            ? {
                branch: matched.branch,
                total_students: matched.total_students,
                active_students: matched.active_students,
                discontinued_students: matched.discontinued_students,
                total_billed: matched.total_invoiced,
                total_collected: matched.total_collected,
                total_outstanding: matched.total_outstanding,
                collection_rate: matched.collection_rate,
              }
            : {
                branch: "All Branches (Consolidated)",
                total_students: systemTotalStudents,
                active_students: systemActiveStudents,
                discontinued_students: systemDiscontinuedStudents,
                total_billed: systemTotalInvoiced,
                total_collected: systemTotalCollected,
                total_outstanding: systemTotalOutstanding,
                collection_rate:
                  systemTotalInvoiced > 0
                    ? `${((systemTotalCollected / systemTotalInvoiced) * 100).toFixed(1)}%`
                    : "0.0%",
                total_branches: branchMeta.liveBranchList.length,
                total_batches: branchMeta.totalBatches,
                branch_breakdown: branchMeta.liveBranchList,
              };
          break;
        }

        case "get_fees_and_collections": {
          toolOutput = await getLiveFeesData(args.branch, args.limit || 50);
          break;
        }

        case "get_student_metrics": {
          toolOutput = await getLiveStudentsData(args.branch, 50);
          break;
        }

        case "get_sales_orders": {
          toolOutput = await getLiveOrdersData(args.branch, args.limit || 50);
          break;
        }

        case "get_attendance_metrics": {
          toolOutput = await getLiveAttendanceData(args.branch, 50);
          break;
        }

        case "get_exam_metrics": {
          try {
            const [papers, publishings, attempts] = await Promise.all([
              db.paper.count(),
              db.examPublishing.count(),
              db.examAttempt.count(),
            ]);
            toolOutput = {
              total_papers: papers,
              published_exams: publishings,
              total_student_attempts: attempts,
            };
          } catch {
            toolOutput = { message: "Exam database connection unavailable in current process" };
          }
          break;
        }

        case "get_staff_and_instructors": {
          toolOutput = await getLiveStaffData();
          break;
        }

        case "lookup_student_360": {
          if (!args.query) {
            toolOutput = { error: "Please provide a student name, student ID, or phone number" };
          } else {
            toolOutput = await lookupStudent360(String(args.query));
          }
          break;
        }

        default:
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Tool "${toolName}" not found` },
            },
            { headers: corsHeaders }
          );
      }

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(toolOutput, null, 2),
              },
            ],
          },
        },
        { headers: corsHeaders }
      );
    }

    // Default unknown method
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32601, message: `Method "${method}" not supported` },
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: msg },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
