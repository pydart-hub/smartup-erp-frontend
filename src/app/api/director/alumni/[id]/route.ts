import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const ALUMNI_DOCTYPE = process.env.FRAPPE_ALUMNI_DOCTYPE || "SmartUp Alumni";

function parseSession(request: NextRequest): { roles: string[] } | null {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return { roles: sessionData.roles ?? [] };
  } catch {
    return null;
  }
}

function hasDirectorAccess(roles: string[]): boolean {
  return roles.includes("Administrator") || roles.includes("Director");
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe GET ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function frappeWrite(path: string, method: "PUT", body: unknown) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method,
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasDirectorAccess(session.roles)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const payload = await frappeGet(`resource/${encodeURIComponent(ALUMNI_DOCTYPE)}/${encodeURIComponent(id)}`);
    return NextResponse.json({ data: payload?.data ?? null });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to load alumni detail" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasDirectorAccess(session.roles)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const payload = {
      full_name: toSafeString(body.full_name),
      phone: toSafeString(body.phone),
      address: toSafeString(body.address),
      email: toSafeString(body.email),
      passout_year: toSafeString(body.passout_year),
      current_position: toSafeString(body.current_position),
      last_studied_institute: toSafeString(body.last_studied_institute),
      qualification_level: toSafeString(body.qualification_level),
      special_skills_remark: toSafeString(body.special_skills_remark),
    };

    if (
      !payload.full_name ||
      !payload.phone ||
      !payload.address ||
      !payload.email ||
      !payload.passout_year ||
      !payload.current_position ||
      !payload.last_studied_institute ||
      !payload.qualification_level
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await frappeWrite(
      `resource/${encodeURIComponent(ALUMNI_DOCTYPE)}/${encodeURIComponent(id)}`,
      "PUT",
      payload,
    );

    return NextResponse.json({ data: updated?.data ?? null });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to update alumni" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasDirectorAccess(session.roles)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(ALUMNI_DOCTYPE)}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe DELETE ${res.status}: ${text.slice(0, 300)}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to delete alumni" }, { status: 500 });
  }
}
