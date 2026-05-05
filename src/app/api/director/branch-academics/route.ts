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

type BranchBatch = {
  name: string;
  student_group_name: string;
  group_based_on: string;
  batch: string;
  program: string;
  academic_year: string;
  custom_branch: string;
  max_strength: number;
  disabled: number;
};

type BatchStudent = {
  student: string;
  student_name: string;
  group_roll_number: number;
  active: number;
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

function isBranchAllowed(session: SessionData, branch: string): boolean {
  const roles = session.roles ?? [];
  const allowed = session.allowed_companies ?? [];
  const isAdmin = roles.includes("Administrator");
  return isAdmin || allowed.length === 0 || allowed.includes(branch);
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

async function fetchBranchBatches(branch: string): Promise<BranchBatch[]> {
  const fields = [
    "name",
    "student_group_name",
    "group_based_on",
    "batch",
    "program",
    "academic_year",
    "custom_branch",
    "max_strength",
    "disabled",
  ];

  const directJson = await frappeGet("resource/Student Group", {
    fields: JSON.stringify(fields),
    filters: JSON.stringify([["custom_branch", "=", branch]]),
    limit_page_length: "500",
    order_by: "name asc",
  });

  const directRows: BranchBatch[] = directJson?.data ?? [];
  if (directRows.length > 0) return directRows;

  // Some environments are inconsistent with custom filters. Fallback to native batch grouping and filter here.
  const fallbackJson = await frappeGet("resource/Student Group", {
    fields: JSON.stringify(fields),
    filters: JSON.stringify([["group_based_on", "=", "Batch"]]),
    limit_page_length: "0",
    order_by: "name asc",
  });

  const allRows: BranchBatch[] = fallbackJson?.data ?? [];
  return allRows.filter(
    (row) => (row.custom_branch ?? "").toLowerCase() === branch.toLowerCase()
  );
}

async function fetchBatchStudents(batch: string, branch: string): Promise<BatchStudent[]> {
  const docJson = await frappeGet(`resource/Student Group/${encodeURIComponent(batch)}`, {});
  const doc = docJson?.data;

  if (!doc) return [];
  if ((doc.custom_branch ?? "").toLowerCase() !== branch.toLowerCase()) {
    throw new Error("Batch does not belong to requested branch");
  }

  return (doc.students ?? []) as BatchStudent[];
}

async function fetchPlanCounts(batchNames: string[], branch: string): Promise<{
  advanced: number;
  intermediate: number;
  basic: number;
  freeAccess: number;
}> {
  const result = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0 };
  if (!batchNames.length) return result;

  const studentIds = new Set<string>();
  for (const batch of batchNames) {
    const students = await fetchBatchStudents(batch, branch);
    for (const s of students) {
      if (s.student) studentIds.add(s.student);
    }
  }

  const ids = [...studentIds];
  if (!ids.length) return result;

  const latestByStudent = new Map<string, { plan?: string; student_category?: string }>();
  const chunkSize = 60;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);

    const enrJson = await frappeGet("resource/Program Enrollment", {
      fields: JSON.stringify([
        "student",
        "custom_plan",
        "student_category",
        "enrollment_date",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["student", "in", chunk],
      ]),
      order_by: "enrollment_date desc",
      limit_page_length: String(chunk.length * 4),
    });

    const rows: Array<{
      student: string;
      custom_plan?: string;
      student_category?: string;
    }> = enrJson?.data ?? [];

    for (const row of rows) {
      if (!row.student || latestByStudent.has(row.student)) continue;
      latestByStudent.set(row.student, {
        plan: row.custom_plan,
        student_category: row.student_category,
      });
    }
  }

  for (const row of latestByStudent.values()) {
    if (row.student_category === "Free Access") {
      result.freeAccess += 1;
      continue;
    }
    const plan = (row.plan ?? "").toLowerCase();
    if (plan === "advanced") result.advanced += 1;
    else if (plan === "intermediate") result.intermediate += 1;
    else if (plan === "basic") result.basic += 1;
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = parseSessionCookie(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const action = request.nextUrl.searchParams.get("action") || "";
    const branch = request.nextUrl.searchParams.get("branch") || "";

    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    if (!isBranchAllowed(session, branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    if (action === "batches") {
      const data = await fetchBranchBatches(branch);
      return NextResponse.json({ data });
    }

    if (action === "batch-students") {
      const batch = request.nextUrl.searchParams.get("batch") || "";
      if (!batch) {
        return NextResponse.json({ error: "batch is required" }, { status: 400 });
      }
      const students = await fetchBatchStudents(batch, branch);
      return NextResponse.json({ students });
    }

    if (action === "plan-counts") {
      const raw = request.nextUrl.searchParams.get("batchNames") || "[]";
      let batchNames: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          batchNames = parsed.filter((v): v is string => typeof v === "string");
        }
      } catch {
        return NextResponse.json({ error: "batchNames must be valid JSON array" }, { status: 400 });
      }

      const counts = await fetchPlanCounts(batchNames, branch);
      return NextResponse.json(counts);
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/branch-academics] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
