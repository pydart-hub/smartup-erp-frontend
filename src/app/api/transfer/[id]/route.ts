/**
 * GET /api/transfer/[id]
 *
 * Fetch a single Student Branch Transfer by ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const session = authResult;

    const { id } = await params;

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Student Branch Transfer/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `token ${API_KEY}:${API_SECRET}`,
        },
      },
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Transfer not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch transfer: ${res.status}` },
        { status: 502 },
      );
    }

    const transfer = (await res.json()).data;

    // Access check: user must own from_branch or to_branch, or be admin/director
    const isAdmin =
      session.roles?.includes("Director") ||
      session.roles?.includes("Administrator") ||
      session.roles?.includes("System Manager");
    const allowed = session.allowed_companies || [];

    if (
      !isAdmin &&
      !allowed.includes(transfer.from_branch) &&
      !allowed.includes(transfer.to_branch)
    ) {
      return NextResponse.json(
        { error: "You do not have access to this transfer" },
        { status: 403 },
      );
    }

    return NextResponse.json({ data: transfer });
  } catch (err) {
    console.error("[transfer/[id]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
