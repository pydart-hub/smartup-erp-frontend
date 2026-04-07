import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    const roles: string[] = data.roles ?? [];
    const defaultCompany: string = data.default_company ?? "";
    return {
      email: data.email,
      roles,
      defaultCompany,
      instructorName: data.instructor_name as string | undefined,
    };
  } catch {
    return null;
  }
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
const adminHeaders = { Authorization: adminAuth, "Content-Type": "application/json" };

/**
 * PATCH /api/syllabus-parts/[id]
 * Teacher marks part as "Pending Approval" or re-submits after rejection.
 * Body: { remarks?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch the existing record
    const getRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(id)}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!getRes.ok) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const record = (await getRes.json()).data;

    // Instructors can only update their own records
    const isInstructor = session.roles.includes("Instructor");
    const isBM = session.roles.includes("Branch Manager");
    if (isInstructor && !isBM && session.instructorName && record.instructor !== session.instructorName) {
      return NextResponse.json({ error: "Access denied: not your record" }, { status: 403 });
    }

    // Only allow marking from "Not Started" or "Rejected" to "Pending Approval"
    if (record.status !== "Not Started" && record.status !== "Rejected") {
      return NextResponse.json(
        { error: `Cannot submit from status: ${record.status}` },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: "Pending Approval",
      completed_date: new Date().toISOString().split("T")[0],
      rejection_reason: "",
    };
    if (body.remarks !== undefined) updatePayload.remarks = body.remarks;

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(id)}`,
      { method: "PUT", headers: adminHeaders, body: JSON.stringify(updatePayload) },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[syllabus-parts/[id]] PATCH error:", res.status, errText);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    const updated = (await res.json()).data;
    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[syllabus-parts/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
