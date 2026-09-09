import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

export interface BranchWithClasses {
  branch: string;
  classes: string[];
}

/**
 * GET /api/academic-planning/branches
 * Returns all active branches and the classes/programs running in each branch.
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch active batch student groups
    const sgRes = await frappeAdminGet("resource/Student Group", {
      filters: JSON.stringify([
        ["disabled", "=", 0],
        ["group_based_on", "=", "Batch"],
      ]),
      fields: JSON.stringify(["name", "custom_branch", "program"]),
      limit_page_length: "500",
    });

    const groups: any[] = sgRes?.data ?? [];

    // 2. Fetch all branch companies as master list
    const coRes = await frappeAdminGet("resource/Company", {
      fields: JSON.stringify(["name"]),
      limit_page_length: "50",
    });
    const companies: any[] = coRes?.data ?? [];

    const branchMap = new Map<string, Set<string>>();
    for (const c of companies) {
      branchMap.set(c.name, new Set<string>());
    }

    // Map programs to branches
    for (const g of groups) {
      const b = g.custom_branch || "Smart Up";
      if (!branchMap.has(b)) {
        branchMap.set(b, new Set<string>());
      }
      if (g.program) {
        branchMap.get(b)!.add(g.program);
      }
    }

    // Convert to sorted array, omitting generic Head Office if it has no classes
    const result: BranchWithClasses[] = [];
    for (const [branch, progSet] of branchMap.entries()) {
      if (branch === "Smart Up" && progSet.size === 0) continue;
      result.push({
        branch,
        classes: Array.from(progSet).sort((a, b) => a.localeCompare(b)),
      });
    }

    result.sort((a, b) => a.branch.localeCompare(b.branch));

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Error in GET /api/academic-planning/branches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
