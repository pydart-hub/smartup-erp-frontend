import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type SessionData = {
  default_company?: string;
  allowed_companies?: string[];
  roles?: string[];
};

type BranchInstructor = {
  name: string;
  instructor_name: string;
  employee: string;
  department: string;
  designation?: string;
  subjects: string[];
};

function getAdminAuthHeader(): string {
  return `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
}

function parseSessionCookie(sessionCookie: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(sessionCookie, "base64").toString());
  } catch {
    return null;
  }
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: {
      Authorization: getAdminAuthHeader(),
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

async function getBranchInstructorsData(
  branch: string
): Promise<BranchInstructor[]> {
  // Step 1: Fetch active employees for this branch
  const empData = await frappeGet("resource/Employee", {
    fields: JSON.stringify(["name", "employee_name", "designation"]),
    filters: JSON.stringify([
      ["company", "=", branch],
      ["status", "=", "Active"],
    ]),
    limit_page_length: "500",
  });

  const employees: { name: string; employee_name: string; designation?: string }[] =
    empData.data ?? [];
  if (!employees.length) return [];

  const empDesignationMap = new Map(
    employees.map((e) => [e.name, e.designation ?? ""])
  );

  // Step 2: Fetch instructors linked to those employees
  const empNames = employees.map((e) => e.name);
  const instrData = await frappeGet("resource/Instructor", {
    fields: JSON.stringify([
      "name",
      "instructor_name",
      "employee",
      "department",
    ]),
    filters: JSON.stringify([["employee", "in", empNames]]),
    limit_page_length: "500",
  });

  const instructors: Omit<BranchInstructor, "designation" | "subjects">[] =
    instrData.data ?? [];
  if (!instructors.length) return [];

  // Step 3: Fetch each Instructor's full doc in parallel to get instructor_log (subjects)
  const fullDocs = await Promise.all(
    instructors.map((i) =>
      frappeGet(`resource/Instructor/${encodeURIComponent(i.name)}`, {})
        .then((r) => r.data)
        .catch(() => null)
    )
  );

  return instructors.map((i, idx) => {
    const doc = fullDocs[idx];
    const log: { course?: string; custom_branch?: string }[] =
      doc?.instructor_log ?? [];
    // Only keep courses assigned to this branch, deduplicated
    const subjects = [
      ...new Set(
        log
          .filter((entry) => entry.custom_branch === branch && entry.course)
          .map((entry) => entry.course as string)
      ),
    ];
    return {
      ...i,
      designation: empDesignationMap.get(i.employee) || "Instructor",
      subjects,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const branch = req.nextUrl.searchParams.get("branch");
    if (!branch) {
      return NextResponse.json(
        { error: "Missing branch parameter" },
        { status: 400 }
      );
    }

    // Check session — Directors/Admins can access any branch
    const sessionCookie = req.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const session = parseSessionCookie(sessionCookie.value);
    if (!session || !session.roles) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const isDirector =
      session.roles.includes("Director") ||
      session.roles.includes("Management") ||
      session.roles.includes("Administrator");

    if (!isDirector) {
      return NextResponse.json(
        { error: "Only Directors can access this endpoint" },
        { status: 403 }
      );
    }

    const instructors = await getBranchInstructorsData(branch);
    return NextResponse.json(instructors, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Director branch instructors error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
