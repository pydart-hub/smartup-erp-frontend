import { NextRequest, NextResponse } from "next/server";
import type { Complaint } from "@/lib/types/complaint";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getBranchManagerSession(
  request: NextRequest
): { email: string; roles: string[]; defaultCompany: string } | null {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    const roles: string[] = sessionData.roles ?? [];
    if (!roles.includes("Branch Manager")) return null;
    const defaultCompany: string = sessionData.default_company ?? "";
    if (!defaultCompany) return null;
    return { email: sessionData.email, roles, defaultCompany };
  } catch {
    return null;
  }
}

/**
 * GET /api/branch-manager/complaints
 * Complaints scoped to the branch manager's company.
 * Query params: ?status=X&category=X&limit=100
 */
export async function GET(request: NextRequest) {
  try {
    const session = getBranchManagerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Always scope to the branch manager's company
    const filters: unknown[][] = [["branch", "=", session.defaultCompany]];
    if (status) filters.push(["status", "=", status]);
    if (category) filters.push(["category", "=", category]);

    const fields = [
      "name", "subject", "category", "priority", "status",
      "description", "student", "student_name", "branch", "branch_abbr",
      "guardian", "guardian_name", "guardian_email",
      "resolution_notes", "resolved_by", "resolved_date",
      "creation", "modified",
    ];

    const params = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      limit_page_length: String(limit),
      order_by: "creation desc",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Complaint?${params}`,
      { headers, cache: "no-store" }
    );

    if (!res.ok) {
      console.error("[branch-manager/complaints] Frappe error:", res.status);
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }

    const json = await res.json();
    const complaints: Complaint[] = json?.data ?? [];

    // Stats scoped to branch
    const statsFilters: unknown[][] = [["branch", "=", session.defaultCompany]];
    const countParams = new URLSearchParams({
      filters: JSON.stringify(statsFilters),
      fields: JSON.stringify(["status", "count(name) as count"]),
      group_by: "status",
      limit_page_length: "10",
    });

    let stats = { open: 0, in_review: 0, resolved: 0, closed: 0, total: 0 };
    try {
      const statsRes = await fetch(
        `${FRAPPE_URL}/api/resource/Complaint?${countParams}`,
        { headers, cache: "no-store" }
      );
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        const rows: { status: string; count: number }[] = statsJson?.data ?? [];
        for (const row of rows) {
          const c = row.count || 0;
          stats.total += c;
          if (row.status === "Open") stats.open = c;
          else if (row.status === "In Review") stats.in_review = c;
          else if (row.status === "Resolved") stats.resolved = c;
          else if (row.status === "Closed") stats.closed = c;
        }
      }
    } catch {
      // Stats are non-critical
    }

    return NextResponse.json({ complaints, stats });
  } catch (error: unknown) {
    console.error("[branch-manager/complaints] GET error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
