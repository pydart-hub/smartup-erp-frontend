import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { verifyAdminToken } from "@/lib/scholar-admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get("levelup_admin_token")?.value;

    const token = bearerToken || cookieToken;

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, remark } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
    }

    const existing = await levelupDb.levelUpRegistration.findUnique({
      where: { id },
      select: { id: true, studentName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Registration record not found." }, { status: 404 });
    }

    const updated = await levelupDb.levelUpRegistration.update({
      where: { id },
      data: {
        remark: typeof remark === "string" && remark.trim() !== "" ? remark.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Remark updated for "${existing.studentName}".`,
      registration: updated,
    });
  } catch (error: any) {
    console.error("[api/levelup/admin/registrations PATCH] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update remark" }, { status: 500 });
  }
}
