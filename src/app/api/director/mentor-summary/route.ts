import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { buildMentorSummary } from "@/lib/server/mentorData";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ["Director", "Management", "General Manager", "Administrator", "System Manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const branch = request.nextUrl.searchParams.get("branch") || undefined;
    const data = await buildMentorSummary(branch);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentor summary" },
      { status: 500 },
    );
  }
}
