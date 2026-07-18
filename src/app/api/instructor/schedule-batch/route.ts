import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getAdminAuthHeader(): string {
  return `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
}

function parseSessionCookie(cookieValue: string): {
  instructor_name?: string;
  roles?: string[];
} | null {
  try {
    return JSON.parse(Buffer.from(cookieValue, "base64").toString());
  } catch {
    return null;
  }
}

async function frappeGet(path: string, params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : "";
  const res = await fetch(`${FRAPPE_URL}/api/${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: getAdminAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Frappe GET ${path} -> ${res.status}: ${text.slice(0, 240)}`);
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
    const instructorName = String(session?.instructor_name || "").trim();
    if (!instructorName) {
      return NextResponse.json({ error: "Instructor access required" }, { status: 403 });
    }

    const scheduleName = String(req.nextUrl.searchParams.get("schedule") || "").trim();
    if (!scheduleName) {
      return NextResponse.json({ error: "schedule is required" }, { status: 400 });
    }

    const scheduleRes = await frappeGet(
      `resource/Course%20Schedule/${encodeURIComponent(scheduleName)}`,
      {
        fields: JSON.stringify([
          "name",
          "student_group",
          "instructor",
          "custom_branch",
          "custom_event_type",
        ]),
      },
    );

    const schedule = scheduleRes?.data as {
      name?: string;
      student_group?: string;
      instructor?: string;
      custom_event_type?: string;
    } | undefined;

    if (!schedule?.student_group) {
      return NextResponse.json({ error: "Schedule batch not found" }, { status: 404 });
    }


    if (String(schedule.instructor || "").trim() !== instructorName) {
      return NextResponse.json({ error: "Access denied for this schedule" }, { status: 403 });
    }

    const batchRes = await frappeGet(`resource/Student%20Group/${encodeURIComponent(schedule.student_group)}`);
    return NextResponse.json({ data: batchRes?.data ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[instructor/schedule-batch]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
