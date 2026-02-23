import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;

export async function POST(request: NextRequest) {
  try {
    // Get session cookie to forward to Frappe
    const sessionCookie = request.cookies.get("smartup_session");

    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(
          Buffer.from(sessionCookie.value, "base64").toString()
        );
        if (sessionData.api_key && sessionData.api_secret) {
          await axios.post(`${FRAPPE_URL}/api/method/logout`, null, {
            headers: {
              Authorization: `token ${sessionData.api_key}:${sessionData.api_secret}`,
            },
          });
        }
      } catch {
        // Frappe logout failed — still clear local session
      }
    }

    const response = NextResponse.json({ message: "Logged out successfully" });

    // Clear the session cookie
    response.cookies.set("smartup_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: "Logged out" });
  }
}
