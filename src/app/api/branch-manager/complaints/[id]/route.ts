import { NextRequest, NextResponse } from "next/server";
import type { UpdateComplaintPayload } from "@/lib/types/complaint";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const VALID_STATUSES = ["Open", "In Review", "Resolved", "Closed"];

function getBranchManagerSession(
  request: NextRequest
): { email: string; full_name?: string; defaultCompany: string } | null {
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
    return { email: sessionData.email, full_name: sessionData.full_name, defaultCompany };
  } catch {
    return null;
  }
}

/**
 * PATCH /api/branch-manager/complaints/[id]
 * Body: { status?, resolution_notes? }
 * Validates the complaint belongs to the branch manager's branch.
 * Auto-sets resolved_by and resolved_date when status becomes "Resolved".
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getBranchManagerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Complaint ID is required" }, { status: 400 });
    }

    const body: UpdateComplaintPayload = await request.json();

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (body.resolution_notes && body.resolution_notes.length > 5000) {
      return NextResponse.json({ error: "Resolution notes must be 5000 characters or less" }, { status: 400 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Verify complaint belongs to this branch manager's branch
    const checkParams = new URLSearchParams({
      filters: JSON.stringify([["name", "=", id]]),
      fields: JSON.stringify(["name", "branch"]),
      limit_page_length: "1",
    });

    const checkRes = await fetch(
      `${FRAPPE_URL}/api/resource/Complaint?${checkParams}`,
      { headers, cache: "no-store" }
    );

    if (!checkRes.ok) {
      return NextResponse.json({ error: "Failed to verify complaint" }, { status: 500 });
    }

    const checkJson = await checkRes.json();
    const complaint = checkJson?.data?.[0];
    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    if (complaint.branch !== session.defaultCompany) {
      return NextResponse.json({ error: "Access denied: complaint belongs to another branch" }, { status: 403 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.resolution_notes !== undefined) updateData.resolution_notes = body.resolution_notes;

    if (body.status === "Resolved") {
      updateData.resolved_by = session.full_name || session.email;
      updateData.resolved_date = new Date().toISOString().split("T")[0];
    }

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Complaint/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[branch-manager/complaints] Update failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to update complaint" },
        { status: res.status === 404 ? 404 : 500 }
      );
    }

    const updated = await res.json();
    return NextResponse.json({ complaint: updated.data });
  } catch (error: unknown) {
    console.error("[branch-manager/complaints] PATCH error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
