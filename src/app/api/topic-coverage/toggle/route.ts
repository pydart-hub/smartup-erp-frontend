import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const FORCE_SCRIPT_NAME = "Set Course Schedule Topic Covered Force";
const FORCE_METHOD_NAME = "set_course_schedule_topic_covered_force";
const SCRIPT_FINGERPRINT = "frappe.db.set_value(\"Course Schedule\"";

const FORCE_SCRIPT_BODY = `
name = frappe.form_dict.name
value = frappe.form_dict.value

if value != 0 and value != 1:
    frappe.throw("value must be 0 or 1")

frappe.db.set_value("Course Schedule", name, "custom_topic_covered", value, update_modified=False)
frappe.response["message"] = {"name": name, "custom_topic_covered": value}
`.trim();

type SessionData = {
  email?: string;
  roles?: string[];
  api_key?: string;
  api_secret?: string;
  allowed_companies?: string[];
  default_company?: string;
  instructor_name?: string;
};

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };
}

async function parseFrappeError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(text) as {
      error?: string;
      exception?: string;
      exc_type?: string;
      _server_messages?: string;
    };
    return (
      parsed.error ||
      parsed.exception ||
      parsed.exc_type ||
      parsed._server_messages ||
      text.slice(0, 600)
    );
  } catch {
    return text.slice(0, 600);
  }
}

async function ensureForceScript(): Promise<void> {
  const getRes = await fetch(
    `${FRAPPE_URL}/api/resource/Server%20Script/${encodeURIComponent(FORCE_SCRIPT_NAME)}`,
    {
      method: "GET",
      headers: adminHeaders(),
      cache: "no-store",
    },
  );

  if (getRes.ok) {
    const existing = (await getRes.json()) as { data?: { script?: string } };
    const currentScript = existing?.data?.script ?? "";
    if (!currentScript.includes(SCRIPT_FINGERPRINT)) {
      const putRes = await fetch(
        `${FRAPPE_URL}/api/resource/Server%20Script/${encodeURIComponent(FORCE_SCRIPT_NAME)}`,
        {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({ script: FORCE_SCRIPT_BODY }),
          cache: "no-store",
        },
      );
      if (!putRes.ok) {
        throw new Error(`Failed to update force script: ${await parseFrappeError(putRes)}`);
      }
    }
    return;
  }

  const createRes = await fetch(`${FRAPPE_URL}/api/resource/Server%20Script`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      name: FORCE_SCRIPT_NAME,
      script_type: "API",
      api_method: FORCE_METHOD_NAME,
      allow_guest: 0,
      disabled: 0,
      script: FORCE_SCRIPT_BODY,
    }),
    cache: "no-store",
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create force script: ${await parseFrappeError(createRes)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!FRAPPE_URL || !API_KEY || !API_SECRET) {
      return NextResponse.json({ error: "Server auth is not configured." }, { status: 500 });
    }

    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString(),
    ) as SessionData;

    const roles = sessionData.roles || [];
    const isAdmin = roles.includes("Administrator") || roles.includes("Director");
    const isBranchManager = roles.includes("Branch Manager");
    const isHRManager = roles.includes("HR Manager");
    const isInstructor = !!sessionData.instructor_name;

    if (!isAdmin && !isBranchManager && !isHRManager && !isInstructor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const scheduleName = String(body?.scheduleName ?? "").trim();
    const covered = body?.covered;

    if (!scheduleName || (covered !== 0 && covered !== 1)) {
      return NextResponse.json(
        { error: "scheduleName and covered (0|1) are required" },
        { status: 400 },
      );
    }

    const scheduleQuery = new URLSearchParams({
      fields: JSON.stringify(["name", "instructor", "custom_branch", "custom_event_type"]),
    });

    const scheduleRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule/${encodeURIComponent(scheduleName)}?${scheduleQuery}`,
      {
        method: "GET",
        headers: adminHeaders(),
        cache: "no-store",
      },
    );

    if (!scheduleRes.ok) {
      return NextResponse.json(
        { error: `Unable to validate schedule: ${await parseFrappeError(scheduleRes)}` },
        { status: scheduleRes.status },
      );
    }

    const scheduleJson = (await scheduleRes.json()) as {
      data?: {
        instructor?: string;
        custom_branch?: string;
        custom_event_type?: string;
      };
    };
    const schedule = scheduleJson.data;
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const allowedCompanies = (sessionData.allowed_companies || []).filter(Boolean);
    const defaultCompany = sessionData.default_company || "";
    const effectiveCompanies =
      allowedCompanies.length > 0
        ? allowedCompanies
        : defaultCompany && (isBranchManager || isHRManager)
          ? [defaultCompany]
          : [];

    const scheduleBranch = schedule.custom_branch || "";
    const inAllowedBranch =
      isAdmin ||
      !scheduleBranch ||
      effectiveCompanies.length === 0 ||
      effectiveCompanies.includes(scheduleBranch);

    if (!inAllowedBranch) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const isPureInstructor = isInstructor && !isBranchManager && !isAdmin;
    if (isPureInstructor) {
      const scheduleIsEvent = !!schedule.custom_event_type;
      const instructorOwnsSchedule =
        !!sessionData.instructor_name && schedule.instructor === sessionData.instructor_name;

      const allowedByOwnership = scheduleIsEvent ? inAllowedBranch : instructorOwnsSchedule;
      if (!allowedByOwnership) {
        return NextResponse.json({ error: "Access denied for this schedule" }, { status: 403 });
      }
    }

    await ensureForceScript();

    const toggleRes = await fetch(`${FRAPPE_URL}/api/method/${FORCE_METHOD_NAME}`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ name: scheduleName, value: covered }),
      cache: "no-store",
    });

    if (!toggleRes.ok) {
      return NextResponse.json(
        { error: await parseFrappeError(toggleRes) },
        { status: toggleRes.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message || "Failed to update topic coverage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
