import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type AttendanceEntry = {
  student: string;
  student_name: string;
  status: "Present" | "Absent" | "Late";
};

type AttendancePayload = {
  student_group: string;
  date: string;
  course_schedule: string;
  custom_branch?: string;
  students: AttendanceEntry[];
};

function adminHeaders() {
  return {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function parseSessionCookie(cookieValue: string): {
  instructor_name?: string;
} | null {
  try {
    return JSON.parse(Buffer.from(cookieValue, "base64").toString());
  } catch {
    return null;
  }
}

async function frappeFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    ...init,
    headers: {
      ...adminHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Frappe ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }

  return json as { data?: unknown; message?: unknown };
}

async function getSchedule(scheduleName: string) {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "student_group", "instructor", "custom_branch", "custom_event_type"]),
  });
  const json = await frappeFetch(`resource/Course%20Schedule/${encodeURIComponent(scheduleName)}?${query.toString()}`);
  return json.data as {
    name?: string;
    student_group?: string;
    instructor?: string;
    custom_branch?: string;
    custom_event_type?: string;
  };
}

async function getExistingAttendance(date: string, studentGroup: string, courseSchedule: string) {
  const query = new URLSearchParams({
    filters: JSON.stringify([
      ["date", "=", date],
      ["student_group", "=", studentGroup],
      ["course_schedule", "=", courseSchedule],
    ]),
    fields: JSON.stringify(["name", "student", "status", "course_schedule", "custom_branch"]),
    limit_page_length: "500",
  });
  const json = await frappeFetch(`resource/Student%20Attendance?${query.toString()}`);
  return (json.data ?? []) as Array<{
    name: string;
    student: string;
    status: string;
    course_schedule?: string;
    custom_branch?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("smartup_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = parseSessionCookie(sessionCookie.value);
    const instructorName = String(session?.instructor_name || "").trim();
    if (!instructorName) {
      return NextResponse.json({ error: "Instructor access required" }, { status: 403 });
    }

    const body = (await req.json()) as AttendancePayload;
    const scheduleName = String(body.course_schedule || "").trim();
    const studentGroup = String(body.student_group || "").trim();
    const date = String(body.date || "").trim();
    const students = Array.isArray(body.students) ? body.students : [];

    if (!scheduleName || !studentGroup || !date || students.length === 0) {
      return NextResponse.json({ error: "Missing attendance payload fields" }, { status: 400 });
    }

    const schedule = await getSchedule(scheduleName);
    if (!schedule?.name || !schedule.student_group) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    if (schedule.custom_event_type) {
      return NextResponse.json({ error: "Cannot mark attendance for event schedules" }, { status: 422 });
    }
    if (String(schedule.instructor || "").trim() !== instructorName) {
      return NextResponse.json({ error: "Access denied for this schedule" }, { status: 403 });
    }
    if (schedule.student_group !== studentGroup) {
      return NextResponse.json({ error: "Schedule batch mismatch" }, { status: 422 });
    }

    const existingRows = await getExistingAttendance(date, studentGroup, scheduleName);
    const existingMap = new Map(existingRows.map((row) => [row.student, row]));

    for (const entry of students) {
      const existing = existingMap.get(entry.student);
      if (existing && existing.status === entry.status) continue;

      if (existing) {
        await frappeFetch("method/frappe.client.cancel", {
          method: "POST",
          body: JSON.stringify({
            doctype: "Student Attendance",
            name: existing.name,
          }),
        });
      }

      await frappeFetch("resource/Student%20Attendance", {
        method: "POST",
        body: JSON.stringify({
          student: entry.student,
          student_name: entry.student_name,
          date,
          status: entry.status,
          student_group: studentGroup,
          course_schedule: scheduleName,
          custom_branch: body.custom_branch || schedule.custom_branch || undefined,
          docstatus: 1,
        }),
      });
    }

    return NextResponse.json({ message: `Attendance saved for ${students.length} students` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[instructor/attendance-save]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
