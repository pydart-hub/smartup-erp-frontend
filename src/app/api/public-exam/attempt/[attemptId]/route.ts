import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { requireRole } from "@/lib/utils/apiAuth";

const ALLOWED_ROLES = ["General Manager", "Director", "Administrator", "System Manager", "Branch Manager"];

type RouteParams = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { attemptId } = await params;

    // Check if the attempt exists
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Delete the attempt (Prisma schema cascades the deletion to AttemptAnswer table)
    await db.examAttempt.delete({
      where: { id: attemptId },
    });

    return NextResponse.json({ success: true, message: "Attempt deleted successfully" });
  } catch (error) {
    console.error("[api/public-exam/attempt/delete] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
