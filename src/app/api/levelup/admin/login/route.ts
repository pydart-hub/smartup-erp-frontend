import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/scholar-admin-auth";

const LEVELUP_ADMIN_USER = "admin@LevelUp";
const LEVELUP_ADMIN_PASS = "levelup@SmartUpGCC!";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username?.trim() === LEVELUP_ADMIN_USER && password === LEVELUP_ADMIN_PASS) {
      const token = generateAdminToken();
      const response = NextResponse.json({
        success: true,
        message: "LevelUp Admin authenticated successfully",
        token,
      });

      response.cookies.set("levelup_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 12 * 60 * 60, // 12 hours
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[api/levelup/admin/login] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
