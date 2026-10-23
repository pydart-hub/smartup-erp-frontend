import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      roles?: string[];
    };
  } catch {
    return null;
  }
}

function isAuthorized(roles: string[]): boolean {
  return (
    roles.includes("Director") ||
    roles.includes("Management") ||
    roles.includes("General Manager") ||
    roles.includes("Administrator")
  );
}

export async function GET(request: NextRequest) {
  const session = parseSession(request);
  if (!session?.roles || !isAuthorized(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch");
  const monthKey = searchParams.get("month");
  const type = searchParams.get("type") || "admissions"; // "admissions" | "collection"

  if (!branch || !monthKey) {
    return NextResponse.json({ error: "branch and month are required" }, { status: 400 });
  }

  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM" }, { status: 400 });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    if (type === "admissions") {
      const filters = JSON.stringify([
        ["custom_branch", "=", branch],
        ["joining_date", ">=", fromDate],
        ["joining_date", "<=", toDate],
      ]);
      const fields = JSON.stringify([
        "name",
        "student_name",
        "joining_date",
        "student_mobile_number",
        "custom_parent_name",
        "student_email_id",
        "enabled",
      ]);
      const params = new URLSearchParams({
        filters,
        fields,
        limit_page_length: "500",
        order_by: "joining_date desc",
      });

      const res = await fetch(`${FRAPPE_URL}/api/resource/Student?${params}`, {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Frappe Student fetch failed: ${res.status}`);
      }

      const json = await res.json();
      const records = json?.data ?? [];

      return NextResponse.json({
        type: "admissions",
        branch,
        month_key: monthKey,
        count: records.length,
        data: records,
      });
    }

    if (type === "collection") {
      const filters = JSON.stringify([
        ["company", "=", branch],
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
        ["posting_date", ">=", fromDate],
        ["posting_date", "<=", toDate],
      ]);
      const fields = JSON.stringify([
        "name",
        "posting_date",
        "paid_amount",
        "mode_of_payment",
        "party_name",
        "reference_no",
        "remarks",
      ]);
      const params = new URLSearchParams({
        filters,
        fields,
        limit_page_length: "1000",
        order_by: "posting_date desc",
      });

      const res = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry?${params}`, {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Frappe Payment Entry fetch failed: ${res.status}`);
      }

      const json = await res.json();
      const records = json?.data ?? [];
      const totalAmount = records.reduce((s: number, r: { paid_amount?: number }) => s + (Number(r.paid_amount) || 0), 0);

      return NextResponse.json({
        type: "collection",
        branch,
        month_key: monthKey,
        count: records.length,
        total_amount: totalAmount,
        data: records,
      });
    }

    return NextResponse.json({ error: "Invalid type. Must be admissions or collection" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[monthly-targets drilldown] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
