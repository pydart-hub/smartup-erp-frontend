import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken, verifyAdminToken } from "@/lib/scholar-admin-auth";

const ENQUIRY_ADMIN_USER =
  process.env.ENQUIRY_ADMIN_USER || "enquiry@SmartUp";
const ENQUIRY_ADMIN_PASS =
  process.env.ENQUIRY_ADMIN_PASS || "enquiry@SmartUp!";

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get("enquiry_admin_token")?.value;
  return NextResponse.json({
    authenticated: verifyAdminToken(cookieToken),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const cleanUser = typeof username === "string" ? username.trim() : "";

    const isEnquiryAdmin =
      cleanUser === ENQUIRY_ADMIN_USER && password === ENQUIRY_ADMIN_PASS;
    const isMasterAdmin =
      cleanUser === "admin@SmartUp" && password === "admin@SmartUp!";

    if (!isEnquiryAdmin && !isMasterAdmin) {
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
