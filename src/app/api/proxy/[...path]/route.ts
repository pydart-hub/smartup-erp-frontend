import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;

// Generic proxy for all Frappe API calls
// Routes: /api/proxy/resource/Student → FRAPPE_URL/api/resource/Student
//         /api/proxy/method/some.method → FRAPPE_URL/api/method/some.method

async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Extract the Frappe path from the URL
    const url = new URL(request.url);
    const proxyPath = url.pathname.replace("/api/proxy/", "");
    const queryString = url.search;
    const targetUrl = `${FRAPPE_URL}/api/${proxyPath}${queryString}`;

    // Get auth from session cookie
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (sessionData.api_key && sessionData.api_secret) {
      // Use per-user token (preferred)
      headers["Authorization"] = `token ${sessionData.api_key}:${sessionData.api_secret}`;
    } else {
      // Fall back to server admin token (e.g. generate_keys was unavailable on login)
      const adminKey = process.env.FRAPPE_API_KEY;
      const adminSecret = process.env.FRAPPE_API_SECRET;
      if (adminKey && adminSecret) {
        headers["Authorization"] = `token ${adminKey}:${adminSecret}`;
      }
    }

    let body = undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.json();
      } catch {
        // No body
      }
    }

    const response = await axios({
      method,
      url: targetUrl,
      headers,
      data: body,
      timeout: 30000,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { status: number; data?: unknown };
      message?: string;
    };
    const status = axiosError.response?.status || 500;
    const data = axiosError.response?.data || { error: axiosError.message || "Proxy error" };
    return NextResponse.json(data, { status });
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}
