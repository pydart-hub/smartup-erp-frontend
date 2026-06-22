import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { getSalesUserBranches } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: ADMIN_AUTH,
};

const ALLOWED_ROLES = [
  "Sales User",
  "Administrator",
  "Director",
  "Management",
  "General Manager",
  "System Manager",
];

function hasAllowedRole(roles: string[]): boolean {
  return roles.some((role) => ALLOWED_ROLES.includes(role));
}

function getScopedCompanies(session: { roles?: string[]; allowed_companies?: string[]; email: string }) {
  const roles = session.roles ?? [];
  if (!roles.includes("Sales User")) return session.allowed_companies ?? [];
  const mapped = getSalesUserBranches(session.email);
  return mapped.length > 0 ? mapped : (session.allowed_companies ?? []);
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: { Authorization: ADMIN_AUTH, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe GET ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function frappePost(path: string, body: unknown) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe POST ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!hasAllowedRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const student = sp.get("student");
    const branch = sp.get("branch");
    if (!student && !branch) {
      return NextResponse.json({ error: "student or branch param required" }, { status: 400 });
    }

    const filters: (string | string[])[][] = [];
    if (student) filters.push(["student", "=", student]);
    if (branch) filters.push(["branch", "=", branch]);

    const allowedCompanies = getScopedCompanies(session);
    if ((session.roles ?? []).includes("Sales User")) {
      if (branch && !allowedCompanies.includes(branch)) {
        return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
      }
      if (!branch && allowedCompanies.length > 0) {
        filters.push(["branch", "in", allowedCompanies]);
      }
    }

    const res = await frappeGet("resource/Discontinued Follow Up", {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        "name", "student", "student_name", "branch",
        "discontinuation_date", "discontinuation_reason",
        "call_date", "called_by", "call_status",
        "feedback_category", "feedback_notes",
        "interested_to_rejoin", "rejoin_probability",
        "reason_not_rejoining",
        "followup_outcome", "latest_mobile_used",
        "invoice_outstanding_at_call", "creation",
      ]),
      order_by: "call_date desc",
      limit_page_length: branch && !student ? "500" : "25",
    });

    return NextResponse.json({ data: res.data ?? [] });
  } catch (err) {
    console.error("[discontinued/follow-up GET]", err);
    return NextResponse.json({ error: "Failed to fetch discontinued follow-up logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!hasAllowedRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      student,
      student_name,
      branch,
      discontinuation_date,
      discontinuation_reason,
      call_status,
      feedback_category,
      feedback_notes,
      interested_to_rejoin,
      rejoin_probability,
      reason_not_rejoining,
      followup_outcome,
      latest_mobile_used,
      invoice_outstanding_at_call,
    } = body;

    if (!student || !branch || !call_status) {
      return NextResponse.json({ error: "student, branch and call_status are required" }, { status: 400 });
    }

    const allowedCompanies = getScopedCompanies(session);
    if ((session.roles ?? []).includes("Sales User") && allowedCompanies.length > 0 && !allowedCompanies.includes(branch)) {
      return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
    }

    const now = new Date();
    const callDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

    const doc: Record<string, unknown> = {
      doctype: "Discontinued Follow Up",
      naming_series: "DFU-.YYYY.-",
      student,
      student_name: student_name || "",
      branch,
      call_date: callDate,
      called_by: session.email,
      call_status,
      interested_to_rejoin: interested_to_rejoin ? 1 : 0,
    };

    if (discontinuation_date) doc.discontinuation_date = discontinuation_date;
    if (discontinuation_reason) doc.discontinuation_reason = discontinuation_reason;
    if (feedback_category) doc.feedback_category = feedback_category;
    if (feedback_notes) doc.feedback_notes = String(feedback_notes).slice(0, 1000);
    if (rejoin_probability) doc.rejoin_probability = rejoin_probability;
    if (reason_not_rejoining) doc.reason_not_rejoining = String(reason_not_rejoining).slice(0, 500);
    if (followup_outcome) doc.followup_outcome = followup_outcome;
    if (latest_mobile_used) doc.latest_mobile_used = latest_mobile_used;
    if (invoice_outstanding_at_call != null) doc.invoice_outstanding_at_call = Number(invoice_outstanding_at_call) || 0;

    const result = await frappePost("resource/Discontinued Follow Up", doc);
    return NextResponse.json({ success: true, name: result?.data?.name });
  } catch (err) {
    console.error("[discontinued/follow-up POST]", err);
    return NextResponse.json({ error: "Failed to save discontinued follow-up" }, { status: 500 });
  }
}
