import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type SessionData = {
  roles?: string[];
  allowed_companies?: string[];
  default_company?: string;
};

type InstructorRow = {
  name: string;
  employee?: string;
};

function normalize(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseSessionCookie(cookieValue: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(cookieValue, "base64").toString());
  } catch {
    return null;
  }
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = parseSessionCookie(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const roles = session.roles || [];
    const isAdminLike =
      roles.includes("Administrator") || roles.includes("Director") || roles.includes("Management");
    const isBranchManager = roles.includes("Branch Manager");

    if (!isAdminLike && !isBranchManager) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const requestedBranch = req.nextUrl.searchParams.get("branch") || "";
    const branch = requestedBranch.trim() || String(session.default_company || "").trim();
    const date = (req.nextUrl.searchParams.get("date") || "").trim();
    const requestedEmployees = (req.nextUrl.searchParams.get("employees") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const allowedCompanies = session.allowed_companies || [];
    if (
      !isAdminLike &&
      allowedCompanies.length > 0 &&
      !allowedCompanies.some((c) => normalize(c) === normalize(branch))
    ) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const schedulesRes = await frappeGet("resource/Course%20Schedule", {
      filters: JSON.stringify([
        ["custom_branch", "=", branch],
        ["schedule_date", "=", date],
      ]),
      fields: JSON.stringify(["instructor"]),
      limit_page_length: "500",
    });

    const instructorIds = Array.from(
      new Set<string>(
        (schedulesRes?.data ?? [])
          .map((row: { instructor?: string }) => String(row.instructor || "").trim())
          .filter(Boolean)
      )
    );

    if (instructorIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const instructorsRes = await frappeGet("resource/Instructor", {
      filters: JSON.stringify([["name", "in", instructorIds]]),
      fields: JSON.stringify(["name", "employee"]),
      limit_page_length: "500",
    });

    const visitingEmployees = Array.from(
      new Set<string>(
        ((instructorsRes?.data ?? []) as InstructorRow[])
          .map((row) => String(row.employee || "").trim())
          .filter(Boolean)
      )
    );

    if (visitingEmployees.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const targetEmployees = requestedEmployees.length
      ? visitingEmployees.filter((emp) => requestedEmployees.includes(emp))
      : visitingEmployees;

    if (targetEmployees.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const attendanceRes = await frappeGet("resource/Attendance", {
      filters: JSON.stringify([
        ["docstatus", "!=", 2],
        ["attendance_date", "=", date],
        ["employee", "in", targetEmployees],
      ]),
      fields: JSON.stringify([
        "name",
        "employee",
        "employee_name",
        "attendance_date",
        "status",
        "company",
        "docstatus",
      ]),
      order_by: "modified desc",
      limit_page_length: "500",
    });

    return NextResponse.json({ data: attendanceRes?.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[branch-manager/visiting-attendance] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
