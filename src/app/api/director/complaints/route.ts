import { NextRequest, NextResponse } from "next/server";
import type { Complaint } from "@/lib/types/complaint";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getDirectorSession(request: NextRequest): { email: string; roles: string[] } | null {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    const roles: string[] = sessionData.roles ?? [];
    if (
      !roles.includes("Administrator") &&
      !roles.includes("Director") &&
      !roles.includes("Accounts Manager")
    ) {
      return null;
    }
    return { email: sessionData.email, roles };
  } catch {
    return null;
  }
}

/**
 * GET /api/director/complaints
 * Query params: ?branch=X&status=X&category=X&limit=50
 * Returns { complaints, stats }
 */
export async function GET(request: NextRequest) {
  try {
    const session = getDirectorSession(request);
    if (!session) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Build filters
    const filters: unknown[][] = [];
    if (branch) filters.push(["branch", "=", branch]);
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
      console.error("[director/complaints] Frappe error:", res.status);
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }

    const json = await res.json();
    const complaints: Complaint[] = json?.data ?? [];

    // Fetch counts for stats (all complaints, not filtered by status/category)
    const statsFilters: unknown[][] = [];
    if (branch) statsFilters.push(["branch", "=", branch]);

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
      // Stats are non-critical, continue with zeros
    }

    return NextResponse.json({ complaints, stats });
  } catch (error: unknown) {
    console.error("[director/complaints] GET error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
