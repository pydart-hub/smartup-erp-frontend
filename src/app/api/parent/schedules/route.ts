import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function monthBounds(month?: string) {
  const source = month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : new Date().toISOString().slice(0, 7) + "-01";
  const start = new Date(`${source}T00:00:00`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    monthKey: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number; orderBy?: string },
) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 100),
  });
  if (opts?.orderBy) params.set("order_by", opts.orderBy);
  return `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

async function safeFetch<T = unknown>(url: string, headers: Record<string, string>): Promise<T[]> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? [];
  } catch {
    return [];
  }
}

async function safeGetList<T = unknown>(payload: unknown, headers: Record<string, string>): Promise<T[]> {
  try {
    const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.message ?? [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let email = "";
    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
      email = String(sessionData.email ?? "");
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "No email in session" }, { status: 400 });
    }

    const { monthKey, start, end } = monthBounds(request.nextUrl.searchParams.get("month") || undefined);
    const headers = {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      "Content-Type": "application/json",
    };

    const guardians = await safeFetch<{
      name: string;
      guardian_name: string;
      email_address: string;
      mobile_number: string;
    }>(
      frappeListUrl(
        "Guardian",
        [["email_address", "=", email]],
        ["name", "guardian_name", "email_address", "mobile_number"],
        { limit: 20 },
      ),
      headers,
    );

    if (guardians.length === 0) {
      return NextResponse.json({ month: monthKey, children: [] });
    }

    const guardian = guardians[0];
    const guardianIds = guardians.map((g) => g.name);
    const studentFields = [
      "name",
      "student_name",
      "custom_branch",
      "custom_student_type",
    ];

    let children = await safeFetch<{
      name: string;
      student_name: string;
      custom_branch?: string;
      custom_student_type?: string;
    }>(
      frappeListUrl("Student", [["Student Guardian", "guardian", "in", guardianIds]], studentFields, { limit: 20 }),
      headers,
    );

    if (children.length === 0) {
      children = await safeFetch(
        frappeListUrl("Student", [["Student Guardians", "guardian", "in", guardianIds]], studentFields, { limit: 20 }),
        headers,
      );
    }

    if (children.length === 0) {
      children = await safeFetch(
        frappeListUrl("Student", [["custom_parent_name", "=", guardian.guardian_name]], studentFields, { limit: 20 }),
        headers,
      );
    }

    const result = await Promise.all(
      children.map(async (child) => {
        const enrollments = await safeFetch<{
          program?: string;
          academic_year?: string;
          student_batch_name?: string;
        }>(
          frappeListUrl(
            "Program Enrollment",
            [["student", "=", child.name], ["docstatus", "in", [0, 1]]],
            ["program", "academic_year", "student_batch_name"],
            { limit: 1, orderBy: "enrollment_date desc" },
          ),
          headers,
        );
        const latestEnrollment = enrollments[0] ?? {};

        const regularGroups = latestEnrollment.student_batch_name
          ? await safeFetch<{
              name: string;
              student_group_name?: string;
              program?: string;
              custom_branch?: string;
            }>(
              frappeListUrl(
                "Student Group",
                [
                  ["batch", "=", latestEnrollment.student_batch_name],
                  ["disabled", "!=", 1],
                  ...(child.custom_branch ? [["custom_branch", "=", child.custom_branch]] : []),
                ],
                ["name", "student_group_name", "program", "custom_branch"],
                { limit: 20, orderBy: "modified desc" },
              ),
              headers,
            )
          : [];

        const o2oGroups = await safeFetch<{
          name: string;
          student_group_name?: string;
          program?: string;
          custom_branch?: string;
        }>(
          frappeListUrl(
            "Student Group",
            [
              ["name", "like", `%(${child.name})%`],
              ["disabled", "!=", 1],
              ...(child.custom_branch ? [["custom_branch", "=", child.custom_branch]] : []),
            ],
            ["name", "student_group_name", "program", "custom_branch"],
            { limit: 10, orderBy: "modified desc" },
          ),
          headers,
        );

        const groups = [
          ...regularGroups.map((group) => ({ ...group, custom_is_one_to_one: 0 as const })),
          ...o2oGroups.map((group) => ({ ...group, custom_is_one_to_one: 1 as const })),
        ].filter(
          (group, index, arr) => arr.findIndex((row) => row.name === group.name) === index,
        );

        const groupNames = [...new Set(groups.map((g) => g.name).filter(Boolean))];
        if (groupNames.length === 0) {
          return {
            student: child.name,
            student_name: child.student_name,
            custom_branch: child.custom_branch,
            custom_student_type: child.custom_student_type,
            enrollment: latestEnrollment,
            groups: [],
            schedules: [],
          };
        }

        const schedules = await safeFetch<{
          name: string;
          schedule_date: string;
          from_time: string;
          to_time: string;
          course?: string;
          student_group?: string;
          custom_event_title?: string | null;
          custom_event_type?: string | null;
          custom_branch?: string | null;
        }>(
          frappeListUrl(
            "Course Schedule",
            [["student_group", "in", groupNames], ["schedule_date", ">=", start], ["schedule_date", "<=", end]],
            [
              "name",
              "schedule_date",
              "from_time",
              "to_time",
              "course",
              "student_group",
              "custom_event_title",
              "custom_event_type",
              "custom_branch",
            ],
            { limit: 500, orderBy: "schedule_date asc, from_time asc" },
          ),
          headers,
        );

        const groupMap = new Map(groups.map((group) => [group.name, group]));
        const normalizedSchedules = schedules
          .sort((a, b) => `${a.schedule_date} ${a.from_time}`.localeCompare(`${b.schedule_date} ${b.from_time}`))
          .map((schedule) => {
            const group = groupMap.get(schedule.student_group || "");
            return {
              ...schedule,
              group_display_name: group?.student_group_name || schedule.student_group || "",
              program: group?.program || latestEnrollment.program || "",
              is_one_to_one: group?.custom_is_one_to_one === 1,
            };
          });

        return {
          student: child.name,
          student_name: child.student_name,
          custom_branch: child.custom_branch,
          custom_student_type: child.custom_student_type,
          enrollment: latestEnrollment,
          groups: groups.map((group) => ({
            name: group.name,
            student_group_name: group.student_group_name,
            program: group.program,
            custom_branch: group.custom_branch,
            is_one_to_one: group.custom_is_one_to_one === 1,
          })),
          schedules: normalizedSchedules,
        };
      }),
    );

    return NextResponse.json({ month: monthKey, children: result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
