import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "predictor-admin-session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[predictor/admin/logout] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
