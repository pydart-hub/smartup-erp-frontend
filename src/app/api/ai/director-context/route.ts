import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  handleOptions,
  verifyAiAccess,
  fetchLiveBranchData,
  matchBranchInList,
  getLiveFeesData,
  getLiveStudentsData,
  getLiveOrdersData,
  getLiveAttendanceData,
  getLiveStaffData,
  getLiveIssuesData,
  lookupStudent360,
} from "@/lib/server/aiErpEngine";
import { db } from "@/lib/public-exam/db";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, identity } = verifyAiAccess(request);
    if (!authorized) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Provide valid Authorization Bearer token, x-ai-agent-key header, or query key (?key=smartup-ai-agent-key-2026).",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawSection = searchParams.get("section") || "all";
    const section = rawSection.toLowerCase().trim();
    const rawBranch = searchParams.get("branch");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const searchQuery =
      searchParams.get("query") ||
      searchParams.get("search") ||
      searchParams.get("student") ||
      searchParams.get("student_id") ||
      searchParams.get("student_name");

    const now = new Date();

    // 1. Fetch live branch intelligence
    const branchMeta = await fetchLiveBranchData();
    const matchedBranch = matchBranchInList(rawBranch, branchMeta.liveBranchList);
    const branchName = matchedBranch ? matchedBranch.branch : (rawBranch || undefined);

    // Section classification
    const includeSummary =
      section === "all" || section === "summary" || section === "overview" || section === "kpis";
    const includeFees =
      includeSummary ||
      section === "fees" ||
      section === "fee" ||
      section === "finance" ||
      section === "collections" ||
      section === "pending" ||
      section === "outstanding" ||
      section === "overdue" ||
      section === "invoices";
    const includeStudents =
      includeSummary ||
      section === "students" ||
      section === "student" ||
      section === "academics" ||
      section === "batches" ||
      section === "discontinued" ||
      section === "admission";
    const includeOrders =
      includeSummary ||
      section === "orders" ||
      section === "sales_orders" ||
      section === "sales" ||
      section === "salesorders";
    const includeAttendance =
      includeSummary || section === "attendance" || section === "absentees" || section === "staff";
    const includeStaff =
      includeSummary || section === "staff" || section === "instructors" || section === "employees" || section === "teachers";
    const includeIssues =
      includeSummary ||
      section === "issues" ||
      section === "complaints" ||
      section === "tickets" ||
      section === "system_issues";
    const includeExams =
      includeSummary || section === "exams" || section === "diagnosis" || section === "assessments";

    // System-wide Grand Totals
    const systemTotalStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_students, 0);
    const systemActiveStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.active_students, 0);
    const systemDiscontinuedStudents = branchMeta.liveBranchList.reduce(
      (sum, b) => sum + b.discontinued_students,
      0
    );
    const systemTotalInvoiced = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_invoiced, 0);
    const systemTotalOutstanding = branchMeta.liveBranchList.reduce(
      (sum, b) => sum + b.total_outstanding,
      0
    );
    const systemTotalCollected = Math.max(0, systemTotalInvoiced - systemTotalOutstanding);
    const systemCollectionRate =
      systemTotalInvoiced > 0
        ? `${((systemTotalCollected / systemTotalInvoiced) * 100).toFixed(1)}%`
        : "0.0%";

    // Executive KPIs
    const executiveKpis = matchedBranch
      ? {
          branch: matchedBranch.branch,
          total_students: matchedBranch.total_students,
          active_students: matchedBranch.active_students,
          discontinued_students: matchedBranch.discontinued_students,
          total_billed: matchedBranch.total_invoiced,
          total_collected: matchedBranch.total_collected,
          total_outstanding: matchedBranch.total_outstanding,
          collection_rate: matchedBranch.collection_rate,
        }
      : {
          branch: "All Branches (Consolidated)",
          total_students: systemTotalStudents,
          active_students: systemActiveStudents,
          discontinued_students: systemDiscontinuedStudents,
          total_billed: systemTotalInvoiced,
          total_collected: systemTotalCollected,
          total_outstanding: systemTotalOutstanding,
          collection_rate: systemCollectionRate,
          total_branches: branchMeta.liveBranchList.length,
          total_batches: branchMeta.totalBatches,
        };

    const responsePayload: Record<string, unknown> = {
      meta: {
        system_name: "SmartUp ERP",
        data_mode: "live_database_query",
        timestamp: now.toISOString(),
        queried_by: identity,
        scope: {
          section: rawSection,
          branch: branchName || "All Branches",
          limit,
          search_query: searchQuery || undefined,
        },
      },
      executive_kpis: executiveKpis,
      branch_breakdown: matchedBranch ? [matchedBranch] : branchMeta.liveBranchList,
      admission_types_live: branchMeta.admissionTypes,
    };

    // Parallel modular data fetches
    const tasks: Promise<void>[] = [];

    if (includeFees) {
      tasks.push(
        getLiveFeesData(branchName, limit).then((fees) => {
          responsePayload.fees = fees;
          responsePayload.finance = fees;
        })
      );
    }

    if (includeStudents) {
      tasks.push(
        getLiveStudentsData(branchName, limit).then((students) => {
          responsePayload.students = students;
          responsePayload.academics = students;
        })
      );
    }

    if (includeOrders) {
      tasks.push(
        getLiveOrdersData(branchName, limit).then((orders) => {
          responsePayload.sales_orders = orders;
        })
      );
    }

    if (includeAttendance) {
      tasks.push(
        getLiveAttendanceData(branchName, limit).then((attendance) => {
          responsePayload.attendance = attendance;
        })
      );
    }

    if (includeStaff) {
      tasks.push(
        getLiveStaffData().then((staff) => {
          responsePayload.staff = staff;
          responsePayload.instructors = staff;
        })
      );
    }

    if (includeIssues) {
      tasks.push(
        getLiveIssuesData(branchName).then((issues) => {
          responsePayload.issues = issues;
          responsePayload.complaints = issues;
        })
      );
    }

    if (includeExams) {
      tasks.push(
        (async () => {
          try {
            const [papers, publishings, attempts] = await Promise.all([
              db.paper.count(),
              db.examPublishing.count(),
              db.examAttempt.count(),
            ]);
            responsePayload.exams = {
              summary: {
                total_papers: papers,
                published_exams: publishings,
                total_student_attempts: attempts,
              },
            };
          } catch {
            responsePayload.exams = { status: "Exam database query unavailable in current worker" };
          }
        })()
      );
    }

    if (searchQuery) {
      tasks.push(
        lookupStudent360(searchQuery).then((res) => {
          responsePayload.student_lookup = res;
        })
      );
    }

    await Promise.all(tasks);

    return NextResponse.json({ success: true, data: responsePayload }, { headers: corsHeaders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500, headers: corsHeaders });
  }
}
