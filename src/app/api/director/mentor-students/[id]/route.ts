import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorStudentDetail, fetchMentorAssignments } from "@/lib/server/mentorData";

const ALLOWED_ROLES = ["Director", "Management", "General Manager", "Administrator", "System Manager"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const assignments = await fetchMentorAssignments({
      student: decodeURIComponent(id),
      status: "Active",
    });
    const assignment = assignments[0];
    if (!assignment) {
      return NextResponse.json({ error: "No mentor assignment found for this student" }, { status: 404 });
    }

    const data = await buildMentorStudentDetail(assignment);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch director mentor student detail" },
      { status: 500 },
    );
  }
}
