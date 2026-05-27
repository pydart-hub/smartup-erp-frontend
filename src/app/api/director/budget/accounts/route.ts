import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
};

const PREDEFINED_CATEGORIES = [
  "Head Office Expense", "EMI", "Maintenance", "Tab", "Projector",
  "Sticker", "Board", "A/C", "Projector Screen", "Sunpack Board",
  "Notice Banner", "Marketing",
] as const;

// ── Auth helper ───────────────────────────────────────────────────────────────
function getSessionRoles(req: NextRequest): string[] | null {
  const cookie = req.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    return JSON.parse(Buffer.from(cookie.value, "base64").toString()).roles ?? [];
  } catch { return null; }
}
function isDirectorOrAdmin(roles: string[]) {
  return roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
}

// ── GET /api/director/budget/accounts ────────────────────────────────────────
// Returns all account → category mappings from Frappe
export async function GET(req: NextRequest) {
  const roles = getSessionRoles(req);
  if (!roles) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isDirectorOrAdmin(roles)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const url = `${FRAPPE_URL}/api/resource/SmartUp Budget Account Map?` + new URLSearchParams({
    fields: JSON.stringify(["name", "account", "category"]),
    limit_page_length: "500",
    order_by: "category asc, account asc",
  });

  const res = await fetch(url, { headers: ADMIN_HEADERS, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "Frappe fetch failed" }, { status: 500 });

  const data = await res.json();
  const mappings = (data.data ?? []) as { name: string; account: string; category: string }[];

  // Also return all Smart Up accounts for the "add" dropdown
  const acctUrl = `${FRAPPE_URL}/api/resource/Account?` + new URLSearchParams({
    filters: JSON.stringify([["company", "=", "Smart Up"], ["is_group", "=", 0]]),
    fields: JSON.stringify(["name"]),
    limit_page_length: "500",
    order_by: "name asc",
  });
  const acctRes = await fetch(acctUrl, { headers: ADMIN_HEADERS, cache: "no-store" });
  const acctData = await acctRes.json();
  const allAccounts: string[] = ((acctData.data ?? []) as { name: string }[]).map(a => a.name);

  return NextResponse.json({
    mappings,
    categories: PREDEFINED_CATEGORIES,
    all_accounts: allAccounts,
  });
}

// ── POST /api/director/budget/accounts ───────────────────────────────────────
// Body: { account, category }  — creates a new mapping
export async function POST(req: NextRequest) {
  const roles = getSessionRoles(req);
  if (!roles) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isDirectorOrAdmin(roles)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { account, category } = await req.json().catch(() => ({}));
  if (!account || !category) return NextResponse.json({ error: "account and category required" }, { status: 400 });

  // Check for duplicate
  const check = await fetch(`${FRAPPE_URL}/api/resource/SmartUp Budget Account Map?` + new URLSearchParams({
    filters: JSON.stringify([["account", "=", account]]),
    fields: JSON.stringify(["name"]),
    limit_page_length: "1",
  }), { headers: ADMIN_HEADERS }).then(r => r.json());

  if ((check.data ?? []).length > 0) {
    return NextResponse.json({ error: "Account already mapped" }, { status: 409 });
  }

  const res = await fetch(`${FRAPPE_URL}/api/resource/SmartUp Budget Account Map`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ doctype: "SmartUp Budget Account Map", account, category }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.name) {
    return NextResponse.json({ error: data.exception ?? "Create failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true, name: data.data.name, account, category });
}

// ── DELETE /api/director/budget/accounts ─────────────────────────────────────
// Body: { name }  — removes a mapping by doc name
export async function DELETE(req: NextRequest) {
  const roles = getSessionRoles(req);
  if (!roles) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isDirectorOrAdmin(roles)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { name } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const res = await fetch(`${FRAPPE_URL}/api/resource/SmartUp Budget Account Map/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: ADMIN_HEADERS,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.exception ?? "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
