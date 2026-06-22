import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorStudentDetail, fetchMentorAssignments, normalize } from "@/lib/server/mentorData";

const ALLOWED_ROLES = ["Branch Manager", "Administrator", "Director", "Management", "System Manager"];

function canAccessBranch(session: { roles?: string[]; allowed_companies?: string[] }, branch: string) {
  if (session.roles?.some((role) => ["Administrator", "Director", "Management", "System Manager"].includes(role))) {
    return true;
  }
  return (session.allowed_companies ?? []).map(normalize).includes(normalize(branch));
}

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
    const assignment = assignments.find((row) => canAccessBranch(auth, row.branch)) ?? assignments[0];
    if (!assignment) {
      return NextResponse.json({ error: "No mentor assignment found for this student" }, { status: 404 });
    }
    if (!canAccessBranch(auth, assignment.branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const data = await buildMentorStudentDetail(assignment);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branch manager mentor student detail" },
      { status: 500 },
    );
  }
}
