import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export const dynamic = "force-dynamic";

function parseSessionCookie(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = parseSessionCookie(sessionCookie.value);
  if (!session?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const rawUsers = request.nextUrl.searchParams.getAll("user");
  const users = [...new Set(rawUsers.map((value) => value.trim()).filter(Boolean))];

  if (users.length === 0) {
    return NextResponse.json({ data: {} });
  }

  if (!FRAPPE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    return NextResponse.json({ error: "Server auth is not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "full_name"]),
    filters: JSON.stringify([["name", "in", users]]),
    limit_page_length: String(Math.max(users.length, 20)),
  });

  const response = await fetch(`${FRAPPE_URL}/api/resource/User?${params.toString()}`, {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to resolve user names" }, { status: response.status });
  }

  const json = (await response.json()) as {
    data?: Array<{ name?: string; full_name?: string }>;
  };

  const data = Object.fromEntries(
    (json.data ?? [])
      .filter((row): row is { name: string; full_name?: string } => Boolean(row.name))
      .map((row) => [row.name, row.full_name || row.name])
  );

  return NextResponse.json({ data });
}
