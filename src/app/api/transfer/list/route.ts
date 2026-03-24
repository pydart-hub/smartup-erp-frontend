/**
 * GET /api/transfer/list
 *
 * List Student Branch Transfer records.
 * Query params:
 *   - status: "Pending" | "Approved" | "Completed" | "Rejected" | "Failed"
 *   - direction: "incoming" | "outgoing" | "all"
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

const LIST_FIELDS = JSON.stringify([
  "name", "student", "student_name", "program", "academic_year",
  "from_branch", "to_branch", "status",
  "amount_already_paid", "adjusted_amount", "new_total_amount",
  "requested_by", "approved_by", "request_date", "completion_date",
  "creation", "modified",
]);

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const session = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const direction = searchParams.get("direction") || "all";

    const isAdmin =
      session.roles?.includes("Director") ||
      session.roles?.includes("Administrator") ||
      session.roles?.includes("System Manager");

    const allowed = session.allowed_companies || [];

    // Build Frappe filters
    const filters: (string | number)[][] = [];
    if (status) filters.push(["status", "=", status]);

    if (!isAdmin && direction === "incoming") {
      // Only show transfers TO user's branches
      if (allowed.length === 1) {
        filters.push(["to_branch", "=", allowed[0]]);
      } else if (allowed.length > 1) {
        filters.push(["to_branch", "in", allowed as unknown as string]);
      }
    } else if (!isAdmin && direction === "outgoing") {
      if (allowed.length === 1) {
        filters.push(["from_branch", "=", allowed[0]]);
      } else if (allowed.length > 1) {
        filters.push(["from_branch", "in", allowed as unknown as string]);
      }
    } else if (!isAdmin && direction === "all") {
      // Show transfers where user's branch is either source or target
      // Frappe doesn't support OR natively in filters, so we fetch both
      // and merge client-side
    }

    const query = new URLSearchParams({
      fields: LIST_FIELDS,
      filters: JSON.stringify(filters),
      order_by: "creation desc",
      limit_page_length: searchParams.get("limit") || "50",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Student Branch Transfer?${query}`,
      {
        headers: {
          Authorization: `token ${API_KEY}:${API_SECRET}`,
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch transfers: ${res.status}` },
        { status: 502 },
      );
    }

    let transfers = (await res.json()).data || [];

    // Client-side filtering for "all" direction when non-admin
    if (!isAdmin && direction === "all" && allowed.length > 0) {
      transfers = transfers.filter(
        (t: { from_branch: string; to_branch: string }) =>
          allowed.includes(t.from_branch) || allowed.includes(t.to_branch),
      );
    }

    // Enrich with disabilities from Student doctype
    const studentIds = [...new Set(transfers.map((t: { student: string }) => t.student).filter(Boolean))] as string[];
    if (studentIds.length > 0) {
      const sq = new URLSearchParams({
        fields: JSON.stringify(["name", "custom_disabilities"]),
        filters: JSON.stringify([["name", "in", studentIds]]),
        limit_page_length: String(studentIds.length),
      });
      const sr = await fetch(
        `${FRAPPE_URL}/api/resource/Student?${sq}`,
        { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } },
      );
      if (sr.ok) {
        const stuData = (await sr.json()).data || [];
        const disMap = new Map<string, string>();
        for (const s of stuData) {
          if (s.custom_disabilities) disMap.set(s.name, s.custom_disabilities);
        }
        for (const t of transfers) {
          t.custom_disabilities = disMap.get(t.student) ?? "";
        }
      }
    }

    return NextResponse.json({ data: transfers });
  } catch (err) {
    console.error("[transfer/list] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
