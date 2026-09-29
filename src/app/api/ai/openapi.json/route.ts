import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const schema = {
    openapi: "3.0.1",
    info: {
      title: "SmartUp ERP Director Context API",
      description:
        "Comprehensive real-time API providing live ERP statistics for SmartUp Learning. Includes executive KPIs, branch-wise student breakdowns (active, discontinued, admissions, plans), fee collection & outstanding analytics, student & staff attendance, support tickets, and 360-degree individual student profile lookups.",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://smartuplearning.net",
        description: "SmartUp ERP Production Server",
      },
    ],
    paths: {
      "/api/ai/director-context": {
        get: {
          operationId: "getDirectorContext",
          summary: "Retrieve real-time SmartUp ERP operational, financial, and academic intelligence",
          description:
            "Fetches real-time consolidated or branch-specific ERP metrics across students (total, active, discontinued), fees (billed, collected, pending), attendance, complaints, or looks up individual student profiles.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              description: "API access key for AI agent authorization",
              schema: {
                type: "string",
                default: "smartup-ai-agent-key-2026",
              },
            },
            {
              name: "section",
              in: "query",
              required: false,
              description: "Scope of ERP data to retrieve: 'all', 'summary', 'students', 'fees', 'attendance', 'issues'",
              schema: {
                type: "string",
                enum: ["all", "summary", "students", "fees", "attendance", "issues"],
                default: "all",
              },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              description: "Optional branch name filter: 'Smart Up Chullickal', 'Smart Up Fortkochi', 'Smart Up Palluruthy', 'Smart Up Eraveli', 'Smart Up Edappally', 'Smart Up Kadavanthara', 'Smart Up Moolamkuzhi', 'Smart Up Thopumpadi', 'Smart Up Vennala'",
              schema: {
                type: "string",
              },
            },
            {
              name: "query",
              in: "query",
              required: false,
              description: "Search for a specific student by name, student ID (e.g., STU-SU CHL-26-303), or phone number to retrieve full 360 profile (fees, invoices, attendance)",
              schema: {
                type: "string",
              },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Maximum number of recent records in sample lists (default 50)",
              schema: {
                type: "integer",
                default: 50,
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response containing real-time SmartUp ERP context",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          meta: { type: "object" },
                          executive_kpis: {
                            type: "object",
                            properties: {
                              branch: { type: "string" },
                              total_students: { type: "integer" },
                              active_students: { type: "integer" },
                              discontinued_students: { type: "integer" },
                              total_billed: { type: "number" },
                              total_collected: { type: "number" },
                              total_outstanding: { type: "number" },
                              collection_rate: { type: "string" },
                            },
                          },
                          branch_breakdown: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                branch: { type: "string" },
                                total_students: { type: "integer" },
                                active_students: { type: "integer" },
                                discontinued_students: { type: "integer" },
                                total_invoiced: { type: "number" },
                                total_collected: { type: "number" },
                                total_outstanding: { type: "number" },
                                collection_rate: { type: "string" },
                              },
                            },
                          },
                          students: { type: "object" },
                          fees: { type: "object" },
                          attendance: { type: "object" },
                          issues: { type: "object" },
                          student_lookup: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized access - invalid key",
            },
          },
        },
      },
    },
  };

  return NextResponse.json(schema, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ai-agent-key",
      "Content-Type": "application/json",
    },
  });
}
