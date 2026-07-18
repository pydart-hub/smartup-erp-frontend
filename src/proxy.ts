import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  Director: "/dashboard/director",
  Management: "/dashboard/director",
  "General Manager": "/dashboard/general-manager",
  "Branch Manager": "/dashboard/branch-manager",
  Mentor: "/dashboard/mentor",
  "HR Manager": "/dashboard/hr-manager",
  "Class Incharge": "/dashboard/class-incharge",
  Instructor: "/dashboard/instructor",
  "Sales User": "/dashboard/sales-user",
  "Batch Coordinator": "/dashboard/batch-coordinator",
  Teacher: "/dashboard/teacher",
  Administrator: "/dashboard/admin",
  Parent: "/dashboard/parent",
};

const PUBLIC_PATHS = ["/auth/login", "/auth/forgot-password", "/api/", "/pay/", "/demo", "/exam-site", "/plus-two-predictor"];
const APP_ROLES = Object.keys(ROLE_DASHBOARD_MAP);

function hasAlternateDashboardRole(roles: string[], currentRole: string) {
  return APP_ROLES.some((role) => role !== currentRole && roles.includes(role));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  console.log(`[MIDDLEWARE DEBUG] host: "${host}", pathname: "${pathname}"`);

  // Bypass authentication for all static assets (files containing a dot) and Next.js internals
  if (pathname.includes(".") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // Handle predictor subdomain rewrites
  if (host.toLowerCase().startsWith("predictor.")) {
    const isInternal =
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.includes("."); // e.g. favicon.ico, images

    console.log(`[MIDDLEWARE DEBUG] Subdomain detected. isInternal: ${isInternal}, pathname: "${pathname}"`);

    if (!isInternal && !pathname.startsWith("/plus-two-predictor")) {
      url.pathname = `/plus-two-predictor${pathname === "/" ? "" : pathname}`;
      console.log(`[MIDDLEWARE DEBUG] Rewriting predictor subdomain request to: "${url.pathname}"`);
      return NextResponse.rewrite(url);
    }
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    console.log(`[MIDDLEWARE DEBUG] Public path matched: "${pathname}". Proceeding next.`);
    return NextResponse.next();
  }

  console.log(`[MIDDLEWARE DEBUG] Non-public path: "${pathname}". Checking session cookie.`);
  const sessionCookie = request.cookies.get("smartup_session");

  if (!sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    const roles: string[] = sessionData.roles || [];

    let primaryRoute = "/dashboard/branch-manager";
    for (const [role, route] of Object.entries(ROLE_DASHBOARD_MAP)) {
      if (roles.includes(role)) {
        primaryRoute = route;
        break;
      }
    }

    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.redirect(new URL(primaryRoute, request.url));
    }

    if (
      roles.includes("Instructor") &&
      !roles.includes("Branch Manager") &&
      !roles.includes("Administrator") &&
      !roles.includes("Class Incharge") &&
      !hasAlternateDashboardRole(roles, "Instructor")
    ) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/instructor")) {
        return NextResponse.redirect(new URL("/dashboard/instructor", request.url));
      }
    }

    if (
      roles.includes("Parent") &&
      !roles.includes("Branch Manager") &&
      !roles.includes("Administrator") &&
      !hasAlternateDashboardRole(roles, "Parent")
    ) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/parent")) {
        return NextResponse.redirect(new URL("/dashboard/parent", request.url));
      }
    }

    if (
      roles.includes("Sales User") &&
      !roles.includes("Branch Manager") &&
      !roles.includes("Administrator") &&
      !roles.includes("Director") &&
      !roles.includes("General Manager") &&
      !hasAlternateDashboardRole(roles, "Sales User")
    ) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/sales-user")) {
        return NextResponse.redirect(new URL("/dashboard/sales-user", request.url));
      }
    }

    if (
      roles.includes("Mentor") &&
      !roles.includes("Branch Manager") &&
      !roles.includes("Administrator") &&
      !roles.includes("Director") &&
      !roles.includes("General Manager") &&
      !hasAlternateDashboardRole(roles, "Mentor")
    ) {
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/mentor")) {
        return NextResponse.redirect(new URL("/dashboard/mentor", request.url));
      }
    }
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.set("smartup_session", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
