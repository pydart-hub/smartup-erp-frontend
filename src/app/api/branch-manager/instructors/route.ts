import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type SessionData = {
  roles?: string[];
  allowed_companies?: string[];
  default_company?: string;
};

type InstructorLogEntry = {
  program?: string;
  course?: string;
  custom_branch?: string;
  academic_year?: string;
};

type InstructorDoc = {
  name: string;
  instructor_name: string;
  employee: string;
  department?: string;
  image?: string;
  instructor_log?: InstructorLogEntry[];
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

    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    const allowedCompanies = session.allowed_companies || [];
    if (
      !isAdminLike &&
      allowedCompanies.length > 0 &&
      !allowedCompanies.some((c) => normalize(c) === normalize(branch))
    ) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const targetBranch = normalize(branch);

    const [allInstructorsRes, activeEmployeesRes] = await Promise.all([
      frappeGet("resource/Instructor", {
        fields: JSON.stringify(["name", "instructor_name", "employee", "department", "image"]),
        limit_page_length: "500",
      }),
      frappeGet("resource/Employee", {
        filters: JSON.stringify([
          ["company", "=", branch],
          ["status", "=", "Active"],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "500",
      }),
    ]);

    const instructors = (allInstructorsRes?.data ?? []) as InstructorDoc[];
    const branchEmployeeSet = new Set<string>((activeEmployeesRes?.data ?? []).map((e: { name: string }) => e.name));

    const docs = await Promise.all(
      instructors.map(async (instr) => {
        try {
          const full = await frappeGet(`resource/Instructor/${encodeURIComponent(instr.name)}`, {
            fields: JSON.stringify(["name", "instructor_name", "employee", "department", "image", "instructor_log"]),
          });
          return full?.data as InstructorDoc;
        } catch {
          return { ...instr, instructor_log: [] } as InstructorDoc;
        }
      })
    );

    const filtered = docs.filter((instr) => {
      const logs = instr.instructor_log ?? [];
      if (logs.length > 0) {
        return logs.some((log) => normalize(log.custom_branch) === targetBranch);
      }
      return branchEmployeeSet.has(instr.employee);
    });

    return NextResponse.json({ data: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[branch-manager/instructors] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
