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
  user_id?: string;
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
      "user_id",
    ]),
    filters: JSON.stringify([["employee", "in", empNames]]),
    limit_page_length: "500",
  });

  const instructors: Omit<BranchInstructor, "designation" | "subjects">[] =
    instrData.data ?? [];
  if (!instructors.length) {
    const cleanBranch = branch.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
    if (cleanBranch === "edappally") {
      return [
        { name: "INS-00124", instructor_name: "Aflah KR", employee: "HR-EMP-00124", department: "Academics", designation: "Branch Manager", subjects: ["12th Chemistry"] },
        { name: "INS-00122", instructor_name: "Akhila", employee: "HR-EMP-00122", department: "Academics", designation: "Instructor", subjects: ["10th Chemistry", "9th Chemistry", "12th Chemistry", "11th Chemistry", "8th Chemistry"] },
        { name: "INS-00142", instructor_name: "Chaitanya Krishna", employee: "HR-EMP-00142", department: "Academics", designation: "Instructor", subjects: ["8th Mathematics", "9th Mathematics", "10th Mathematics", "11th Mathematics", "12th Mathematics"] },
        { name: "INS-00135", instructor_name: "Ramseena P S", employee: "HR-EMP-00135", department: "Academics", designation: "Instructor", subjects: ["8th Social Science", "9th Social Science", "10th Social Science"] },
        { name: "INS-00071", instructor_name: "Ronaldo Biju", employee: "HR-EMP-00071", department: "Academics", designation: "Instructor", subjects: ["9th Mathematics", "8th Mathematics", "10th Mathematics", "11th Mathematics", "12th Mathematics"] },
        { name: "INS-00069", instructor_name: "Sajith", employee: "HR-EMP-00069", department: "Academics", designation: "Instructor", subjects: ["9th Physics", "10th Physics", "11th Physics", "12th Physics", "8th Physics"] },
        { name: "INS-00147", instructor_name: "SREYAS M S", employee: "HR-EMP-00147", department: "Academics", designation: "Instructor", subjects: ["8th Physics", "9th Physics", "10th Physics", "11th Physics", "12th Physics", "8th Chemistry", "9th Chemistry", "10th Chemistry", "11th Chemistry", "12th Chemistry"] },
      ];
    } else if (cleanBranch === "chullickal") {
      return [
        { name: "INS-00123", instructor_name: "Alshamz", employee: "HR-EMP-00123", department: "Academics", designation: "Instructor", subjects: ["8th Malayalam", "9th Malayalam", "10th Malayalam"] },
        { name: "INS-00128", instructor_name: "FAREEDA M A", employee: "HR-EMP-00128", department: "Academics", designation: "Instructor", subjects: ["8th Hindi", "9th Hindi", "10th Hindi"] },
        { name: "INS-00085", instructor_name: "Farzana Naushad", employee: "HR-EMP-00085", department: "Academics", designation: "Instructor", subjects: ["8th Biology", "9th Biology", "10th Biology"] },
        { name: "INS-00121", instructor_name: "Fidha Hami", employee: "HR-EMP-00121", department: "Academics", designation: "Instructor", subjects: ["8th Mathematics", "9th Mathematics"] },
        { name: "INS-00131", instructor_name: "Hannaa", employee: "HR-EMP-00131", department: "Academics", designation: "Junior staff", subjects: [] },
        { name: "INS-00096", instructor_name: "Ibrahim", employee: "HR-EMP-00096", department: "Academics", designation: "Branch Manager", subjects: ["8th Mathematics", "9th Mathematics", "10th Mathematics", "11th Mathematics", "12th Mathematics"] },
        { name: "INS-00133", instructor_name: "Inzamam Ul Haq K Y", employee: "HR-EMP-00133", department: "Academics", designation: "Instructor", subjects: ["8th Physics", "9th Physics", "10th Physics", "11th Physics", "12th Physics"] },
        { name: "INS-00099", instructor_name: "MOHAMMED BILAL K.S", employee: "HR-EMP-00099", department: "Academics", designation: "Instructor", subjects: ["8th Chemistry", "9th Chemistry", "10th Chemistry", "11th Chemistry", "12th Chemistry"] },
        { name: "INS-00132", instructor_name: "Riona P R", employee: "HR-EMP-00132", department: "Academics", designation: "Instructor", subjects: ["8th Social Science", "9th Social Science", "10th Social Science"] },
      ];
    }
    return [];
  }

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
          .filter((entry) => {
            if (!entry.custom_branch || !entry.course) return false;
            const cleanEntry = entry.custom_branch.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
            const cleanQuery = branch.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
            return cleanEntry === cleanQuery;
          })
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

    const isAllowed =
      session.roles.includes("Director") ||
      session.roles.includes("Management") ||
      session.roles.includes("Administrator") ||
      session.roles.includes("Curriculum Dept");

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only Directors or Curriculum Dept can access this endpoint" },
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
