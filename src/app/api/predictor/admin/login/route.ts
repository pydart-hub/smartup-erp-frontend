import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_USERNAME = "admin@SmartUp";
const ADMIN_PASSWORD = "admin@SmartUp!";
const SESSION_COOKIE = "predictor-admin-session";
const SESSION_VALUE = "smartup-predictor-admin-2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[predictor/admin/login] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
