import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/scholar-admin-auth";

const ADMIN_USER = "admin@SmartUp";
const ADMIN_PASS = "admin@SmartUp!";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username?.trim() === ADMIN_USER && password === ADMIN_PASS) {
      const token = generateAdminToken();
      const response = NextResponse.json({
        success: true,
        message: "Authenticated successfully",
        token,
      });

      response.cookies.set("scholar_admin_token", token, {
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
    console.error("[api/scholar/admin/login] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
