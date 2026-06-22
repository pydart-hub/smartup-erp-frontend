import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorStudentDetail, fetchMentorAssignments } from "@/lib/server/mentorData";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(request, ["Mentor", "Branch Manager", "Administrator", "Director", "Management", "General Manager", "System Manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const assignments = await fetchMentorAssignments({
      student: decodeURIComponent(id),
      status: "Active",
    });
    const assignment = assignments.find((row) => row.mentor_user === auth.email) ?? assignments[0];
    if (!assignment) {
      return NextResponse.json({ error: "No mentor assignment found for this student" }, { status: 404 });
    }
    if (auth.roles?.includes("Mentor") && !auth.roles?.includes("Branch Manager") && assignment.mentor_user !== auth.email) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await buildMentorStudentDetail(assignment);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentor student detail" },
      { status: 500 },
    );
  }
}
