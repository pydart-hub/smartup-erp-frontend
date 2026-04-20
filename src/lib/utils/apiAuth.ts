/**
 * Shared auth helpers for Next.js API routes.
 * Parses the session cookie and validates roles.
 */

import { NextRequest, NextResponse } from "next/server";

export interface SessionData {
  email: string;
  full_name?: string;
  roles?: string[];
  api_key?: string;
  api_secret?: string;
  allowed_companies?: string[];
  default_company?: string;
  instructor_name?: string;
}

/**
 * Parse the smartup_session cookie. Returns null if missing or invalid.
 */
export function parseSession(request: NextRequest): SessionData | null {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    if (!data?.email) return null;
    return data as SessionData;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns session or a 401 JSON response.
 */
export function requireAuth(
  request: NextRequest,
): SessionData | NextResponse {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return session;
}

/**
 * Require one of the given roles. Returns session or 401/403 response.
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[],
): SessionData | NextResponse {
  const result = requireAuth(request);
  if (result instanceof NextResponse) return result;

  const session = result;
  const userRoles = session.roles || [];
  const hasRole = allowedRoles.some((r) => userRoles.includes(r));

  if (!hasRole) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }
  return session;
}

/** Roles that can perform staff-level operations (record payments, create users, etc.) */
export const STAFF_ROLES = [
  "Administrator",
  "Branch Manager",
  "Director",
  "General Manager",
  "System Manager",
  "Sales User",
];
