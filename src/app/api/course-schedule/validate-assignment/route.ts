import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type InstructorLogRow = {
  program?: string;
  course?: string;
  custom_branch?: string;
};

function getAdminAuthHeader(): string {
  return `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
}

function normalize(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseSessionCookie(cookieValue: string): {
  roles: string[];
} | null {
  try {
    const sessionData = JSON.parse(Buffer.from(cookieValue, "base64").toString());
    return {
      roles: (sessionData.roles || []) as string[],
    };
  } catch {
    return null;
  }
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: getAdminAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${path} ${res.status}: ${text.slice(0, 240)}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = parseSessionCookie(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const allowedRoles = new Set([
      "Administrator",
      "Director",
      "Management",
      "General Manager",
      "Branch Manager",
      "Instructor",
      "Academics User",
    ]);
    const canValidateSchedule = (session.roles || []).some((role) => allowedRoles.has(role));
    if (!canValidateSchedule) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = (await req.json()) as {
      student_group?: string;
      instructor?: string;
      course?: string;
      custom_branch?: string;
    };

    const studentGroup = String(body.student_group || "").trim();
    const instructor = String(body.instructor || "").trim();
    const course = String(body.course || "").trim();
    const requestedBranch = String(body.custom_branch || "").trim();

    // Non-teaching schedules (events/O2O placeholders) skip assignment validation.
    if (!studentGroup || !instructor || !course) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const [groupDocRes, instructorDocRes] = await Promise.all([
      frappeGet(`resource/Student%20Group/${encodeURIComponent(studentGroup)}`, {
        fields: JSON.stringify(["name", "program", "custom_branch"]),
      }),
      frappeGet(`resource/Instructor/${encodeURIComponent(instructor)}`, {
        fields: JSON.stringify(["name", "employee", "instructor_log"]),
      }),
    ]);

    const groupDoc = groupDocRes?.data as { program?: string; custom_branch?: string } | undefined;
    const instructorDoc = instructorDocRes?.data as {
      employee?: string;
      instructor_log?: InstructorLogRow[];
    } | undefined;

    if (!groupDoc?.program) {
      return NextResponse.json(
        { error: "Selected batch has no program. Cannot validate instructor assignment." },
        { status: 422 },
      );
    }

    const effectiveBranch = requestedBranch || String(groupDoc.custom_branch || "").trim();
    if (!effectiveBranch) {
      return NextResponse.json(
        { error: "Branch is required on schedule or selected batch for assignment validation." },
        { status: 422 },
      );
    }

    const batchBranch = String(groupDoc.custom_branch || "").trim();
    if (batchBranch && requestedBranch && normalize(batchBranch) !== normalize(requestedBranch)) {
      return NextResponse.json(
        {
          error: `Batch belongs to ${batchBranch}, but schedule branch is ${requestedBranch}.`,
        },
        { status: 422 },
      );
    }

    const logs = (instructorDoc?.instructor_log || []) as InstructorLogRow[];
    if (logs.length > 0) {
      const hasAssignment = logs.some(
        (log) =>
          normalize(log.custom_branch) === normalize(effectiveBranch) &&
          normalize(log.program) === normalize(groupDoc.program) &&
          normalize(log.course) === normalize(course),
      );

      if (!hasAssignment) {
        return NextResponse.json(
          {
            error: `Instructor is not assigned for ${effectiveBranch} / ${groupDoc.program} / ${course}.`,
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ ok: true, mode: "instructor_log" });
    }

    // Legacy fallback for instructors with empty instructor_log.
    const employee = String(instructorDoc?.employee || "").trim();
    if (!employee) {
      return NextResponse.json(
        { error: "Instructor has no linked employee and no instructor_log assignments." },
        { status: 422 },
      );
    }

    const employeeDocRes = await frappeGet(`resource/Employee/${encodeURIComponent(employee)}`, {
      fields: JSON.stringify(["company"]),
    });
    const employeeCompany = String(employeeDocRes?.data?.company || "").trim();

    if (employeeCompany && normalize(employeeCompany) === normalize(effectiveBranch)) {
      return NextResponse.json({ ok: true, mode: "legacy-employee-company" });
    }

    return NextResponse.json(
      {
        error: `Instructor has no matching assignment for ${effectiveBranch}.`,
      },
      { status: 422 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[course-schedule/validate-assignment] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
