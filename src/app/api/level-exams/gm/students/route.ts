import { NextRequest, NextResponse } from "next/server";
import { listLevelExamEligibleStudents } from "@/lib/server/levelExamAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const levelCode = request.nextUrl.searchParams.get("levelCode") || "";
    const data = await listLevelExamEligibleStudents(request, search, levelCode || undefined);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to fetch students" }, { status: 500 });
  }
}
