import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/admission/sibling-details?student=<studentId>
 *
 * Returns the guardian info for an existing student so the sibling
 * admission form can auto-fill guardian details.
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("student")?.trim();

  if (!studentId) {
    return NextResponse.json({ error: "student parameter required" }, { status: 400 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
  const headers: Record<string, string> = {
    Authorization: adminAuth,
    "Content-Type": "application/json",
  };

  try {
    // Fetch the student with guardians child table
    const studentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
      { headers, cache: "no-store" }
    );
    if (!studentRes.ok) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const studentJson = await studentRes.json();
    const student = studentJson?.data;

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get the first guardian link
    const guardianLink = student.guardians?.[0];
    let guardian = null;

    if (guardianLink?.guardian) {
      // Fetch full Guardian record
      const guardianRes = await fetch(
        `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianLink.guardian)}`,
        { headers, cache: "no-store" }
      );
      if (guardianRes.ok) {
        const guardianJson = await guardianRes.json();
        guardian = guardianJson?.data;
      }
    }

    // Check if the sibling already has a sibling_group
    const siblingGroup = student.custom_sibling_group || null;

    return NextResponse.json({
      student: {
        name: student.name,
        student_name: student.student_name,
        custom_branch: student.custom_branch,
        custom_srr_id: student.custom_srr_id,
      },
      guardian: guardian
        ? {
            name: guardian.name,
            guardian_name: guardian.guardian_name,
            email_address: guardian.email_address,
            mobile_number: guardian.mobile_number,
            relation: guardianLink?.relation || "Father",
          }
        : null,
      siblingGroup,
    });
  } catch (err) {
    console.error("[sibling-details] Error:", err);
    return NextResponse.json({ error: "Failed to fetch sibling details" }, { status: 500 });
  }
}
