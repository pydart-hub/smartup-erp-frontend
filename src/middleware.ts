import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  "Director": "/dashboard/director",
  "Management": "/dashboard/director",
  "Branch Manager": "/dashboard/branch-manager",
  "HR Manager": "/dashboard/hr-manager",
  "Instructor": "/dashboard/instructor",
  "Sales User": "/dashboard/sales-user",
  "Batch Coordinator": "/dashboard/batch-coordinator",
  "Teacher": "/dashboard/teacher",
  "Administrator": "/dashboard/admin",
  "Parent": "/dashboard/parent",
};

const PUBLIC_PATHS = ["/auth/login", "/auth/forgot-password", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
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

    // Determine the user's primary role and correct dashboard route
    let primaryRoute = "/dashboard/branch-manager"; // fallback
    for (const [role, route] of Object.entries(ROLE_DASHBOARD_MAP)) {
      if (roles.includes(role)) {
        primaryRoute = route;
        break;
      }
    }

    // If visiting root or /dashboard, redirect to correct dashboard
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.redirect(new URL(primaryRoute, request.url));
    }

    // ── Role-based route protection ──
    // Instructors can only access /dashboard/instructor/*
    if (roles.includes("Instructor") && !roles.includes("Branch Manager") && !roles.includes("Administrator")) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/instructor")) {
        return NextResponse.redirect(new URL("/dashboard/instructor", request.url));
      }
    }

    // Parents can only access /dashboard/parent/*
    if (roles.includes("Parent") && !roles.includes("Branch Manager") && !roles.includes("Administrator")) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/parent")) {
        return NextResponse.redirect(new URL("/dashboard/parent", request.url));
      }
    }

    // Sales Users can only access /dashboard/sales-user/*
    if (roles.includes("Sales User") && !roles.includes("Branch Manager") && !roles.includes("Administrator") && !roles.includes("Director")) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/sales-user")) {
        return NextResponse.redirect(new URL("/dashboard/sales-user", request.url));
      }
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
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
