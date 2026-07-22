import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type SessionData = { roles?: string[] };

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let sessionData: SessionData;
  try {
    sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const roles = sessionData.roles ?? [];
  if (
    !roles.includes("Administrator") &&
    !roles.includes("Director") &&
    !roles.includes("Accounts Manager")
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam || new Date().toISOString().slice(0, 10);

    const params = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "party",
        "party_name",
        "company",
        "posting_date",
        "paid_amount",
        "mode_of_payment",
        "reference_no",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
        ["posting_date", "=", targetDate],
      ]),
      order_by: "creation desc",
      limit_page_length: "500",
    });

    const res = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry?${params.toString()}`, {
      headers: { Authorization: adminAuth, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe payment entry ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[today-collected] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
