import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getBranchManagerSession(request: NextRequest) {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    const roles: string[] = data.roles ?? [];
    if (!roles.includes("Branch Manager") && !roles.includes("Director") && !roles.includes("Management")) {
      return null;
    }
    const defaultCompany: string = data.default_company ?? "";
    return { email: data.email, fullName: data.full_name, roles, defaultCompany };
  } catch {
    return null;
  }
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
const adminHeaders = { Authorization: adminAuth, "Content-Type": "application/json" };

/**
 * PATCH /api/syllabus-parts/[id]/approve
 * BM approves a part → status="Completed"
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getBranchManagerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    // Fetch record
    const getRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(id)}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!getRes.ok) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const record = (await getRes.json()).data;

    // Verify branch scope
    if (record.company !== session.defaultCompany && !session.roles.includes("Director") && !session.roles.includes("Management")) {
      return NextResponse.json({ error: "Access denied: wrong branch" }, { status: 403 });
    }

    // Only approve from "Pending Approval"
    if (record.status !== "Pending Approval") {
      return NextResponse.json(
        { error: `Cannot approve from status: ${record.status}` },
        { status: 400 },
      );
    }

    const updatePayload = {
      status: "Completed",
      approved_date: new Date().toISOString().split("T")[0],
      approved_by: session.email,
    };

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(id)}`,
      { method: "PUT", headers: adminHeaders, body: JSON.stringify(updatePayload) },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[syllabus-parts/approve] error:", res.status, errText);
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }

    const updated = (await res.json()).data;
    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[syllabus-parts/approve] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
