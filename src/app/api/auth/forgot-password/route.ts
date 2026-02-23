import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }


    await axios.post(`${FRAPPE_URL}/api/method/frappe.core.doctype.user.user.reset_password`, {
      user: email,
    });

    return NextResponse.json({
      message: "If this email is registered, a password reset link has been sent.",
    });
  } catch (error: unknown) {
    // Don't reveal if email exists or not (security)
    console.error("Forgot password error:", error);
    return NextResponse.json({
      message: "If this email is registered, a password reset link has been sent.",
    });
  }
}
