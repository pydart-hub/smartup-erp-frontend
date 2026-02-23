import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  "Branch Manager": "/dashboard/branch-manager",
  "Batch Coordinator": "/dashboard/batch-coordinator",
  "Teacher": "/dashboard/teacher",
  "Accountant": "/dashboard/accountant",
  "Administrator": "/dashboard/admin",
};

const PUBLIC_PATHS = ["/auth/login", "/auth/forgot-password", "/api/", "/toggle"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Developer: auth bypass flag (set from /toggle page)
  const devBypass = request.cookies.get("dev_auth_bypass");
  if (devBypass?.value === "1") {
    // Still redirect root → branch-manager, but skip session validation
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard/branch-manager", request.url));
    }
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("smartup_session");

  if (!sessionCookie) {
    // Not authenticated — redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Parse session for role info
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    const roles: string[] = sessionData.roles || [];

    // If visiting root, redirect to correct dashboard
    if (pathname === "/" || pathname === "/dashboard") {
      for (const [role, route] of Object.entries(ROLE_DASHBOARD_MAP)) {
        if (roles.includes(role)) {
          return NextResponse.redirect(new URL(route, request.url));
        }
      }
      // Default fallback
      return NextResponse.redirect(new URL("/dashboard/branch-manager", request.url));
    }
  } catch {
    // Invalid session — clear and redirect to login
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.set("smartup_session", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.svg
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|public).*)",
  ],
};
