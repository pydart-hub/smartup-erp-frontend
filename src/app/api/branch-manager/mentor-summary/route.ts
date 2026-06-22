import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorSummary, normalize } from "@/lib/server/mentorData";

const ALLOWED_ROLES = ["Branch Manager", "Administrator", "Director", "Management", "System Manager"];

function canAccessBranch(session: { roles?: string[]; allowed_companies?: string[] }, branch: string) {
  const roles = session.roles ?? [];
  if (roles.includes("Administrator") || roles.includes("Director") || roles.includes("Management") || roles.includes("System Manager")) {
    return true;
  }
  const allowed = session.allowed_companies ?? [];
  return allowed.length === 0 || allowed.some((row) => normalize(row) === normalize(branch));
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const branch = request.nextUrl.searchParams.get("branch") || auth.default_company || "";
    if (!branch) {
      return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    }
    if (!canAccessBranch(auth, branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const data = await buildMentorSummary(branch);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentor summary" },
      { status: 500 },
    );
  }
}
