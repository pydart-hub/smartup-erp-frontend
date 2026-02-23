import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    return NextResponse.json({
      user: {
        name: sessionData.email,
        email: sessionData.email,
        full_name: sessionData.full_name,
        roles: sessionData.roles || [],
        role_profile_name: sessionData.roles?.[0] || null,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
