import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ALLOWED_ROLES = ["Administrator", "Director", "Management", "General Manager", "Branch Manager"];

function parseSession(cookie: string): { roles?: string[] } | null {
  try {
    return JSON.parse(Buffer.from(cookie, "base64").toString());
  } catch {
    return null;
  }
}

/**
 * POST /api/director/student-fees
 * Body: { customerIds: string[], branch?: string, dateFrom?: string, dateTo?: string }
 * Returns: Record<customer, { total: number; pending: number }>
 * Uses admin token so Directors/Managers without direct Sales Invoice permissions
 * still get exact fee data.
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = parseSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const roles = session.roles ?? [];
  if (!ALLOWED_ROLES.some((r) => roles.includes(r))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let customerIds: string[];
  let branch: string | undefined;
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  try {
    const body = await request.json();
    customerIds = body.customerIds;
    branch = body.branch || undefined;
    dateFrom = body.dateFrom || undefined;
    dateTo = body.dateTo || undefined;
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({});
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  try {
    const map: Record<string, { total: number; pending: number }> = {};
    const chunkSize = 50;

    for (let i = 0; i < customerIds.length; i += chunkSize) {
      const chunk = customerIds.slice(i, i + chunkSize);
      const filters: (string | number | string[])[][] = [
        ["docstatus", "=", 1],
        ["is_return", "=", 0],
        ["customer", "in", chunk],
      ];
      if (branch) {
        filters.push(["company", "=", branch]);
      }
      if (dateFrom) filters.push(["posting_date", ">=", dateFrom]);
      if (dateTo) filters.push(["posting_date", "<=", dateTo]);

      const params = new URLSearchParams({
        fields: JSON.stringify([
          "customer",
          "sum(grand_total) as total_fee",
          "sum(outstanding_amount) as pending_fee",
        ]),
        filters: JSON.stringify(filters),
        group_by: "customer",
        limit_page_length: String(chunk.length),
      });

      const res = await fetch(
        `${FRAPPE_URL}/api/resource/Sales%20Invoice?${params.toString()}`,
        {
          headers: { Authorization: adminAuth, Accept: "application/json" },
          cache: "no-store",
        }
      );

      if (!res.ok) continue;

      const json = await res.json();
      for (const row of json?.data ?? []) {
        if (!map[row.customer]) {
          map[row.customer] = { total: 0, pending: 0 };
        }
        map[row.customer].total += row.total_fee ?? 0;
        map[row.customer].pending += row.pending_fee ?? 0;
      }
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error("student-fees error:", err);
    return NextResponse.json({ error: "Failed to fetch student fees" }, { status: 500 });
  }
}
