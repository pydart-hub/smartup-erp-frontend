import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken, verifyAdminToken } from "@/lib/scholar-admin-auth";
import { verifyEnquiryAdminCredentials } from "@/lib/enquiry/admin-auth";

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get("enquiry_admin_token")?.value;
  return NextResponse.json({
    authenticated: verifyAdminToken(cookieToken),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const cleanUser = typeof username === "string" ? username : "";
    const cleanPass = typeof password === "string" ? password : "";

    if (!verifyEnquiryAdminCredentials(cleanUser, cleanPass)) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = generateAdminToken();
    const response = NextResponse.json({
      success: true,
      message: "Authenticated successfully",
    });

    response.cookies.set("enquiry_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("[api/enquiry/admin/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("enquiry_admin_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
