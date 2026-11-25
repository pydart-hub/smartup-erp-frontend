import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseBranchProgress,
  type CrashCourseBatchSummary,
} from "@/lib/types/crashCourse";
import {
  MIN_BATCH_CAPACITY,
  MAX_BATCH_CAPACITY,
  WARN_BATCH_CAPACITY,
} from "@/lib/utils/crashCoursePricing";

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    // 1. Fetch all Crash Course Program Enrollments for 2026-2027
    const peRes = await frappeAdminGet("resource/Program Enrollment", {
      fields: JSON.stringify([
        "name",
        "student",
        "student_name",
        "student_category",
        "academic_year",
        "student_batch_name",
        "custom_branch",
      ]),
      filters: JSON.stringify([
        ["academic_year", "=", "2026-2027"],
        ["student_category", "=", "Crash Course"],
        ["docstatus", "!=", 2],
      ]),
      limit_page_length: "1000",
    }).catch(() => ({ data: [] }));

    const enrollments = (peRes.data || []) as Array<{
      name: string;
      student: string;
      student_name: string;
      custom_branch?: string;
      student_batch_name?: string;
    }>;

    // 2. Fetch Sales Invoices for Crash Course to get financial tracking
    const invRes = await frappeAdminGet("resource/Sales Invoice", {
      fields: JSON.stringify([
        "name",
        "company",
        "grand_total",
        "outstanding_amount",
        "status",
        "docstatus",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
      ]),
      limit_page_length: "1000",
    }).catch(() => ({ data: [] }));

    const rawInvoices = (invRes.data || []) as Array<{
      name: string;
      company: string;
      grand_total: number;
      outstanding_amount: number;
      status: string;
    }>;

    // 3. Fetch Student Groups for batches
    const sgRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify([
        "name",
        "student_group_name",
        "custom_branch",
        "program",
      ]),
      filters: JSON.stringify([
        ["academic_year", "=", "2026-2027"],
      ]),
      limit_page_length: "200",
    }).catch(() => ({ data: [] }));

    const rawGroups = (sgRes.data || []) as Array<{
      name: string;
      student_group_name: string;
      custom_branch?: string;
      program?: string;
    }>;

    const ccGroups = rawGroups.filter(
      (g) =>
        g.name.startsWith("CC-2026-") ||
        (g.student_group_name &&
          g.student_group_name.toLowerCase().includes("crash course"))
    );

    // Build branch summaries
    const branchSummaries: CrashCourseBranchProgress[] = await Promise.all(
      CRASH_COURSE_BRANCHES.map(async (branchCfg) => {
        const branchEnrollments = enrollments.filter(
          (pe) =>
            pe.custom_branch &&
            pe.custom_branch.toLowerCase() === branchCfg.company.toLowerCase()
        );
        const enrolledCount = branchEnrollments.length;

        // Financials for this branch
        const branchInvoices = rawInvoices.filter(
          (inv) =>
            inv.company &&
            inv.company.toLowerCase() === branchCfg.company.toLowerCase()
        );

        let totalRevenue = 0;
        let totalOutstanding = 0;
        branchInvoices.forEach((inv) => {
          totalRevenue += Number(inv.grand_total || 0);
          totalOutstanding += Number(inv.outstanding_amount || 0);
        });
        const totalCollected = Math.max(0, totalRevenue - totalOutstanding);

        // Batches for this branch
        const branchBatches = ccGroups.filter(
          (g) =>
            g.custom_branch &&
            g.custom_branch.toLowerCase() === branchCfg.company.toLowerCase()
        );

        const batchSummaries: CrashCourseBatchSummary[] = await Promise.all(
          branchBatches.map(async (g) => {
            try {
              const detail = await frappeAdminGet(
                `resource/Student Group/${encodeURIComponent(g.name)}`
              );
              const students = detail.data?.students || [];
              const count = students.length;
              return {
                name: g.name,
                student_group_name: g.student_group_name || g.name,
                class_level: g.name.includes("-9-")
                  ? "9th"
                  : g.name.includes("-10-")
                  ? "10th"
                  : g.name.includes("-P1-")
                  ? "Plus One"
                  : "Plus Two",
                branch: branchCfg.company,
                enrolled_count: count,
                min_capacity: MIN_BATCH_CAPACITY,
                max_capacity: MAX_BATCH_CAPACITY,
                is_full: count >= MAX_BATCH_CAPACITY,
                is_near_capacity: count >= WARN_BATCH_CAPACITY,
                seats_remaining: Math.max(0, MAX_BATCH_CAPACITY - count),
              };
            } catch {
              return {
                name: g.name,
                student_group_name: g.student_group_name || g.name,
                class_level: "10th",
                branch: branchCfg.company,
                enrolled_count: 0,
                min_capacity: MIN_BATCH_CAPACITY,
                max_capacity: MAX_BATCH_CAPACITY,
                is_full: false,
                is_near_capacity: false,
                seats_remaining: MAX_BATCH_CAPACITY,
              };
            }
          })
        );

        return {
          branch: branchCfg.label,
          company: branchCfg.company,
          enrolledCount,
          minTarget: branchCfg.minTarget, // 80
          recTarget: branchCfg.recTarget, // 150
          minTargetAchievedPercent: Math.min(
            100,
            Math.round((enrolledCount / branchCfg.minTarget) * 100)
          ),
          recTargetAchievedPercent: Math.min(
            100,
            Math.round((enrolledCount / branchCfg.recTarget) * 100)
          ),
          totalRevenuePotential: totalRevenue,
          totalCollected,
          totalOutstanding,
          batches: batchSummaries,
        };
      })
    );

    const totalEnrolled = branchSummaries.reduce(
      (sum, b) => sum + b.enrolledCount,
      0
    );
    const overallMinTarget = 240; // 80 * 3
    const overallRecTarget = 450; // 150 * 3

    return NextResponse.json({
      branches: branchSummaries,
      overall: {
        totalEnrolled,
        minTarget: overallMinTarget,
        recTarget: overallRecTarget,
        minTargetPercent: Math.min(
          100,
          Math.round((totalEnrolled / overallMinTarget) * 100)
        ),
        recTargetPercent: Math.min(
          100,
          Math.round((totalEnrolled / overallRecTarget) * 100)
        ),
      },
    });
  } catch (err) {
    console.error("[crash-course/targets] GET Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
