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
        allowed_companies: sessionData.allowed_companies || [],
        default_company: sessionData.default_company || "",
        instructor_name: sessionData.instructor_name || undefined,
        instructor_display_name: sessionData.instructor_display_name || undefined,
        allowed_batches: sessionData.allowed_batches || undefined,
        default_batch: sessionData.default_batch || undefined,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
