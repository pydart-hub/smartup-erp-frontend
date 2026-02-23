import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Verify credentials — Frappe returns 401 if wrong
    await axios.post(
      `${FRAPPE_URL}/api/method/login`,
      { usr: email, pwd: password },
      { headers: { "Content-Type": "application/json" } }
    );

    // 2. Use server admin token to fetch full User document
    //    The User doc includes a `roles` child table — no separate get_list needed
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    const userResponse = await axios.get(
      `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
        },
      }
    );

    const userData = userResponse.data?.data;
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Extract roles from the User doc's roles child table
    const roles = (userData.roles || []).map((r: { role: string }) => r.role);

    // 4. Generate fresh API key/secret for this user via admin token.
    //    generate_keys always returns a new secret (previous tokens invalidated).
    let apiKey = "";
    let apiSecret = "";
    try {
      const keysResponse = await axios.post(
        `${FRAPPE_URL}/api/method/frappe.core.doctype.user.user.generate_keys`,
        null,
        {
          params: { user: email },
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
        }
      );
      apiKey = keysResponse.data?.message?.api_key || "";
      apiSecret = keysResponse.data?.message?.api_secret || "";
    } catch {
      // generate_keys unavailable — fall back to existing key (secret will be empty,
      // proxy will use server admin credentials instead)
      apiKey = userData.api_key || "";
    }

    const user = {
      name: userData.name,
      email: userData.email,
      full_name: userData.full_name,
      user_image: userData.user_image,
      role_profile_name: userData.role_profile_name,
      roles,
      api_key: apiKey,
    };

    const response = NextResponse.json({ user, message: "Login successful" });

    const sessionData = JSON.stringify({
      email: user.email,
      api_key: apiKey,
      api_secret: apiSecret,
      roles,
      full_name: user.full_name,
    });

    response.cookies.set("smartup_session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data?: { message?: string } } };
    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
