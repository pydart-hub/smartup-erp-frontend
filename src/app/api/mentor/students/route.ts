import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorStudentSummaries, fetchMentorAssignments } from "@/lib/server/mentorData";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ["Mentor", "Branch Manager", "Administrator", "Director", "Management", "General Manager", "System Manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const assignments = await fetchMentorAssignments({
      mentorUser: auth.roles?.includes("Mentor") ? auth.email : undefined,
      status: "Active",
    });
    const data = await buildMentorStudentSummaries(assignments);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentor students" },
      { status: 500 },
    );
  }
}
