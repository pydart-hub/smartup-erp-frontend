import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  getLiveFeesData,
  getLiveOverdueDues,
  getLiveDailyCollections,
  getLiveExpensesData,
  getLiveExamPerformance,
  getLiveExamToppers,
  getLiveFeeDefaulters,
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
      "Get real-time financial metrics: total invoiced, total collected, collection rate, pending dues, total overdue fees (₹42,41,024 across 909 students matching Director portal), overdue invoices count, exact day-wise collections, and branch fee comparisons.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
        limit: { type: "number", description: "Max invoice sample records (default 50)" },
        date: { type: "string", description: "Optional date in YYYY-MM-DD format (e.g. '2026-09-29')" },
        from_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to_date: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
    },
  },
  {
    name: "get_overdue_fees",
    description:
      "Get exact real-time overdue fee dues across all branches or for a specific branch (matches Director Dues portal exactly). Returns total overdue amount (₹42,41,024 across 909 students), invoice count, and branch-by-branch breakdown (Eraveli, Chullickal, Palluruthy, Fortkochi, Thopumpadi, Edappally, Vennala, Kadavanthara, Moolamkuzhi).",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Optional branch name (e.g. 'Smart Up Eraveli', 'Chullickal', 'Fortkochi')",
        },
      },
    },
  },
  {
    name: "get_daily_collections",
    description:
      "Get exact real-time fee collections for a specific date (e.g. yesterday, today, or date range '2026-09-29'). Returns grand total collections, payment count, branch-wise totals, payment modes (Cash, Bank Transfer, CoFee), and individual payments.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Target date in YYYY-MM-DD format (e.g. '2026-09-29')" },
        from_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to_date: { type: "string", description: "End date in YYYY-MM-DD format" },
        branch: { type: "string", description: "Optional branch name filter" },
      },
    },
  },
  {
    name: "get_expenses",
    description:
      "Get real-time operational and branch expenses from ERP General Ledger (GL) for a specific date or date range (e.g. yesterday, today). Returns total expenses, breakdown by branch, expense account categories (office expense, rent, salaries, utilities), and transaction vouchers.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Target date in YYYY-MM-DD format (e.g. '2026-09-29')" },
        from_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to_date: { type: "string", description: "End date in YYYY-MM-DD format" },
        branch: { type: "string", description: "Optional branch name filter" },
      },
    },
  },
  {
    name: "get_exam_metrics",
    description:
      "Get comprehensive exam statistics, rankings, and performance metrics across SmartUp ERP: best performing exams (ranked by student average score percentage and pass rate), top performing students overall, CWC exam toppers and branch breakdown, and online diagnosis paper totals (26 papers, 4,869 attempts). Answers 'which exam did students perform best', 'who is the best performer', and 'in CWC exam who performed best'.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name" },
        exam_group: { type: "string", description: "Optional exam filter (e.g. 'CWC Exam 1', 'CWC', 'all')" },
      },
    },
  },
  {
    name: "get_exam_performance",
    description:
      "Get real-time exam performance rankings and statistics: best performing exams (ranked by student average score percentage and pass rate), per-paper averages, student attempt counts, and top scorers for each exam.",
    inputSchema: {
      type: "object",
      properties: {
        exam_group: {
          type: "string",
          description: "Optional exam filter (e.g. 'CWC Exam 1', 'CWC', 'Quarterly Exam', 'all')",
        },
        branch: { type: "string", description: "Optional branch name filter" },
        limit: { type: "number", description: "Max exams to return (default 15)" },
      },
    },
  },
  {
    name: "get_top_students",
    description:
      "Get top performing students and rank holders across SmartUp ERP exams (overall and per branch). Returns student name, student ID, branch, total score, max marks, percentage, and best exam.",
    inputSchema: {
      type: "object",
      properties: {
        exam_name: {
          type: "string",
          description: "Optional exam filter (e.g. 'CWC Exam 1', 'CWC', 'Quarterly Exam', 'all')",
        },
        branch: { type: "string", description: "Optional branch name (e.g. 'Chullickal', 'Edappally', 'Palluruthy')" },
        limit: { type: "number", description: "Max students to return (default 15)" },
      },
    },
  },
  {
    name: "get_exam_toppers",
    description:
      "Get student toppers, rankings, and exam scores for CWC exams (CWC Exam 1, CWC Exam 2, etc.), weekly exams, or online diagnosis exams. Returns top scoring students overall and per branch with student ID, name, marks, and percentage.",
    inputSchema: {
      type: "object",
      properties: {
        exam_name: {
          type: "string",
          description: "Exam type or name (e.g. 'CWC Exam 1', 'CWC', 'weekly', 'diagnosis')",
        },
        branch: { type: "string", description: "Optional branch name" },
        limit: { type: "number", description: "Max toppers per branch (default 10)" },
      },
    },
  },
  {
    name: "get_fee_defaulters",
    description:
      "Get students with unpaid or zero fee payments from start to end (100% outstanding fee dues). Returns student name, ID, branch, total billed, amount unpaid, and due dates, sorted by highest outstanding dues.",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Optional branch name filter" },
        zero_paid_only: {
          type: "boolean",
          description: "If true, only returns students who have paid ZERO rupees (default true)",
        },
        min_due: { type: "number", description: "Minimum due amount filter" },
        limit: { type: "number", description: "Max defaulters to return (default 50)" },
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
      "360-degree comprehensive student search by name, student ID (e.g. STU-SU CHL-26-303), or phone number. Returns student profile, sales orders, invoices, payments, attendance, program enrollments, and exam results.",
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
          toolOutput = await getLiveFeesData(
            args.branch,
            args.limit || 50,
            args.date,
            args.from_date,
            args.to_date
          );
          break;
        }

        case "get_overdue_fees": {
          toolOutput = await getLiveOverdueDues(args.branch);
          break;
        }

        case "get_daily_collections": {
          toolOutput = await getLiveDailyCollections(
            args.date,
            args.from_date,
            args.to_date,
            args.branch
          );
          break;
        }

        case "get_expenses": {
          toolOutput = await getLiveExpensesData(
            args.date,
            args.from_date,
            args.to_date,
            args.branch
          );
          break;
        }

        case "get_exam_performance": {
          toolOutput = await getLiveExamPerformance(
            args.exam_group || args.exam_name,
            args.branch,
            args.limit || 15
          );
          break;
        }

        case "get_top_students": {
          const perf = await getLiveExamPerformance(
            args.exam_name || args.exam_group,
            args.branch,
            args.limit || 15
          );
          toolOutput = {
            exam_scope: args.exam_name || "All Exams",
            branch_scope: args.branch || "All Branches",
            total_evaluated_students: perf.summary.total_evaluated_students,
            top_students: perf.best_performing_students,
            branch_toppers: perf.cwc_exam_toppers_by_branch,
            best_exam: perf.summary.best_performing_exam,
            best_exam_avg_score: perf.summary.best_exam_avg_score,
          };
          break;
        }

        case "get_exam_toppers": {
          toolOutput = await getLiveExamToppers(
            args.exam_name || "cwc",
            args.branch,
            args.limit || 15
          );
          break;
        }

        case "get_fee_defaulters": {
          toolOutput = await getLiveFeeDefaulters(
            args.branch,
            args.min_due || 0,
            args.zero_paid_only !== false,
            args.limit || 50
          );
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
          let prismaStats = {
            total_papers: 0,
            published_exams: 0,
            total_student_attempts: 0,
          };
          try {
            const [papers, publishings, attempts] = await Promise.all([
              db.paper.count(),
              db.examPublishing.count(),
              db.examAttempt.count(),
            ]);
            prismaStats = {
              total_papers: papers,
              published_exams: publishings,
              total_student_attempts: attempts,
            };
          } catch {
            // Postgres db not available in this instance
          }

          const examPerf = await getLiveExamPerformance(args.exam_group, args.branch, 10);

          toolOutput = {
            online_diagnosis_exams: prismaStats,
            total_papers: prismaStats.total_papers,
            published_exams: prismaStats.published_exams,
            total_student_attempts: prismaStats.total_student_attempts,
            best_performing_exams: examPerf.best_performing_exams,
            best_performing_students: examPerf.best_performing_students,
            cwc_summary: {
              total_participants: examPerf.summary.total_cwc_participants,
              overall_topper: examPerf.summary.top_student_overall,
              overall_topper_percentage: examPerf.summary.top_student_percentage,
              overall_topper_branch: examPerf.summary.top_student_branch,
              branch_toppers: examPerf.cwc_exam_toppers_by_branch,
            },
            summary: examPerf.summary,
          };
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
