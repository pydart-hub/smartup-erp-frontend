import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

export interface BranchPortionSummary {
  branch: string;
  totalPortions: number;
  completedPortions: number;
  inProgressPortions: number;
  notStartedPortions: number;
  pendingPortions: number; // inProgress + notStarted
  overduePortions: number;
  averageProgress: number; // 0 - 100%
  classesCount: number;
  batchesCount: number;
}

/**
 * GET /api/branch-manager/portions/dashboard
 * Returns minimal, crystal-clear portion completion & pending statistics for ALL branches.
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Fetch all Branch Portion Status records (all branches)
    const statusesRes = await frappeAdminGet("resource/Branch Portion Status", {
      fields: JSON.stringify([
        "name",
        "portion_ref",
        "branch",
        "student_group",
        "class_level",
        "course",
        "portion_title",
        "target_date",
        "status",
        "remarks",
        "completed_on",
      ]),
      limit_page_length: "2000",
    });

    const records: any[] = statusesRes?.data ?? [];

    // Also fetch all company branches to ensure even branches with 0 portions appear cleanly
    const companiesRes = await frappeAdminGet("resource/Company", {
      fields: JSON.stringify(["name"]),
      limit_page_length: "100",
    });
    const companies: any[] = companiesRes?.data ?? [];

    const branchMap = new Map<
      string,
      {
        branch: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentage: number;
        classes: Set<string>;
        batches: Set<string>;
      }
    >();

    // Initialize with companies
    for (const c of companies) {
      if (c.name) {
        branchMap.set(c.name, {
          branch: c.name,
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overdue: 0,
          sumPercentage: 0,
          classes: new Set<string>(),
          batches: new Set<string>(),
        });
      }
    }

    // Process all portion status records
    for (const r of records) {
      const b = r.branch || "Smart Up";
      if (!branchMap.has(b)) {
        branchMap.set(b, {
          branch: b,
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overdue: 0,
          sumPercentage: 0,
          classes: new Set<string>(),
          batches: new Set<string>(),
        });
      }

      const entry = branchMap.get(b)!;
      entry.total += 1;

      // Extract progress from [progress:X%] or status
      let pct = 0;
      if (r.remarks) {
        const m = r.remarks.match(/\[progress:(\d+)%\]/);
        if (m && m[1]) pct = parseInt(m[1], 10);
      }
      if (pct === 0 && r.status === "Completed") pct = 100;

      entry.sumPercentage += pct;

      if (pct >= 100) {
        entry.completed += 1;
      } else if (pct > 0) {
        entry.inProgress += 1;
      } else {
        entry.notStarted += 1;
      }

      if (pct < 100 && r.target_date && r.target_date < todayStr) {
        entry.overdue += 1;
      }

      if (r.class_level) entry.classes.add(r.class_level);
      if (r.student_group) entry.batches.add(r.student_group);
    }

    // Convert into clean, minimal dashboard summary list
    const branchSummaries: BranchPortionSummary[] = [];

    for (const [branch, data] of branchMap.entries()) {
      // Include branches that either have portions or are active institutes
      if (data.total > 0 || (session.allowed_companies && session.allowed_companies.includes(branch))) {
        const avg = data.total > 0 ? Math.round(data.sumPercentage / data.total) : 0;
        branchSummaries.push({
          branch,
          totalPortions: data.total,
          completedPortions: data.completed,
          inProgressPortions: data.inProgress,
          notStartedPortions: data.notStarted,
          pendingPortions: data.inProgress + data.notStarted,
          overduePortions: data.overdue,
          averageProgress: avg,
          classesCount: data.classes.size,
          batchesCount: data.batches.size,
        });
      }
    }

    // Sort by branch name or highest portions
    branchSummaries.sort((a, b) => b.totalPortions - a.totalPortions || a.branch.localeCompare(b.branch));

    // Calculate network-wide overall totals
    const networkTotal = branchSummaries.reduce((a, b) => a + b.totalPortions, 0);
    const networkCompleted = branchSummaries.reduce((a, b) => a + b.completedPortions, 0);
    const networkPending = branchSummaries.reduce((a, b) => a + b.pendingPortions, 0);
    const networkOverdue = branchSummaries.reduce((a, b) => a + b.overduePortions, 0);
    const networkAvg =
      networkTotal > 0
        ? Math.round(
            branchSummaries.reduce((a, b) => a + b.averageProgress * b.totalPortions, 0) /
              networkTotal
          )
        : 0;

    return NextResponse.json({
      branches: branchSummaries,
      overview: {
        totalBranches: branchSummaries.length,
        networkTotal,
        networkCompleted,
        networkPending,
        networkOverdue,
        networkAvg,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/branch-manager/portions/dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
