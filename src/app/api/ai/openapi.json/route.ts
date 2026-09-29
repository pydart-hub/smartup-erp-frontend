import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const schema = {
    openapi: "3.0.1",
    info: {
      title: "SmartUp ERP Director Intelligence API",
      description:
        "Comprehensive real-time API providing live ERP statistics for SmartUp Learning. Includes master executive KPIs, branch-wise student breakdowns, fee collections & pending dues, overdue invoices, sales orders, attendance, exams, complaints, and 360-degree student lookups.",
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
          operationId: "getDirectorMasterContext",
          summary: "Retrieve all-in-one real-time SmartUp ERP operational, financial, and academic intelligence",
          description:
            "Fetches live consolidated or branch-specific ERP metrics across students, fees, sales orders, attendance, staff, complaints, and student 360 profiles.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              description: "AI agent authorization key",
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
            {
              name: "section",
              in: "query",
              required: false,
              description: "Scope: 'all', 'summary', 'fees', 'overdue', 'students', 'orders', 'attendance', 'staff', 'exams', 'issues'",
              schema: {
                type: "string",
                enum: ["all", "summary", "fees", "overdue", "students", "orders", "attendance", "staff", "exams", "issues"],
                default: "all",
              },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              description: "Filter by branch: 'Smart Up Chullickal', 'Smart Up Fortkochi', 'Smart Up Palluruthy', 'Smart Up Eraveli', 'Smart Up Edappally', 'Smart Up Kadavanthara', 'Smart Up Moolamkuzhi', 'Smart Up Thopumpadi', 'Smart Up Vennala'",
              schema: { type: "string" },
            },
            {
              name: "query",
              in: "query",
              required: false,
              description: "Search student by name, student ID (e.g., STU-SU CHL-26-303), or phone number for 360 profile",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Sample limit (default 50)",
              schema: { type: "integer", default: 50 },
            },
          ],
          responses: {
            "200": { description: "Successful real-time response" },
          },
        },
      },
      "/api/ai/fees": {
        get: {
          operationId: "getFeesAndCollections",
          summary: "Retrieve live fees, collections, pending dues, overdue invoices, and branch fee breakdowns",
          description: "Returns real-time financial stats: total invoiced, total collected, total outstanding, overdue invoices, and branch fee tables.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              description: "Filter by branch name",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 50 },
            },
          ],
          responses: { "200": { description: "Live fee statistics" } },
        },
      },
      "/api/ai/students": {
        get: {
          operationId: "getStudentsAndAcademics",
          summary: "Retrieve live student counts (total, active, discontinued), admission types, batches, and branch breakdown",
          description: "Returns real-time student numbers: total students, active students, discontinued students, admission types (fresher, existing, rejoin), and batches.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              description: "Filter by branch name",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 50 },
            },
          ],
          responses: { "200": { description: "Live student metrics" } },
        },
      },
      "/api/ai/orders": {
        get: {
          operationId: "getSalesOrders",
          summary: "Retrieve live sales orders, booking values, and status",
          description: "Returns real-time sales order counts, total order values, and recent sales order records.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Live sales orders" } },
        },
      },
      "/api/ai/attendance": {
        get: {
          operationId: "getAttendanceMetrics",
          summary: "Retrieve live daily student attendance, absenteeism rates, and staff attendance",
          description: "Returns real-time attendance stats: present count, absent count, absenteeism rate, and recent absentees.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
            {
              name: "branch",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Live attendance metrics" } },
        },
      },
      "/api/ai/exams": {
        get: {
          operationId: "getExamMetrics",
          summary: "Retrieve live diagnosis exams, papers, and student attempt statistics",
          description: "Returns diagnosis exam metrics: total papers, published exams, and total student attempts.",
          parameters: [
            {
              name: "key",
              in: "query",
              required: false,
              schema: { type: "string", default: "smartup-ai-agent-key-2026" },
            },
          ],
          responses: { "200": { description: "Live exam statistics" } },
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
