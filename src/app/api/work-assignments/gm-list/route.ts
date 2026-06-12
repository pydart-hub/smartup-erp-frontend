import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type FrappeDoc = Record<string, unknown>;

function parseSessionCookie(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString());
  } catch {
    return null;
  }
}

async function frappeGet(path: string) {
  const response = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Frappe request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function resolveUserDisplayNames(userIds: string[]) {
  const uniqueUsers = [...new Set(userIds.map((value) => value.trim()).filter(Boolean))];
  if (uniqueUsers.length === 0) return {};

  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "full_name"]),
    filters: JSON.stringify([["name", "in", uniqueUsers]]),
    limit_page_length: String(Math.max(uniqueUsers.length, 20)),
  });

  const json = (await frappeGet(`resource/User?${params.toString()}`)) as {
    data?: Array<{ name?: string; full_name?: string }>;
  };

  return Object.fromEntries(
    (json.data ?? [])
      .filter((row): row is { name: string; full_name?: string } => Boolean(row.name))
      .map((row) => [row.name, row.full_name || row.name]),
  );
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = parseSessionCookie(sessionCookie.value);
  if (!session?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (!FRAPPE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    return NextResponse.json({ error: "Server auth is not configured" }, { status: 500 });
  }

  try {
    const branch = request.nextUrl.searchParams.get("branch");
    const filters: unknown[][] = [["docstatus", "!=", 2]];
    if (branch) filters.push(["for_branch", "=", branch]);

    const fields = JSON.stringify([
      "name",
      "title",
      "description",
      "topic",
      "for_branch",
      "academic_year",
      "deadline",
      "docstatus",
      "owner",
      "creation",
      "total_assigned",
      "submitted_count",
      "approved_count",
    ]);

    const listParams = new URLSearchParams({
      fields,
      filters: JSON.stringify(filters),
      limit_page_length: "200",
      order_by: "creation desc",
    });

    const listJson = (await frappeGet(`resource/Work%20Assignment?${listParams.toString()}`)) as {
      data?: FrappeDoc[];
    };
    const items = listJson.data ?? [];

    if (items.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const docs = await Promise.all(
      items.map(async (item) => {
        const name = String(item.name || "");
        if (!name) return null;
        try {
          const json = (await frappeGet(`resource/Work%20Assignment/${encodeURIComponent(name)}`)) as {
            data?: FrappeDoc;
          };
          return json.data ?? null;
        } catch {
          return null;
        }
      }),
    );

    const validDocs = docs.filter((doc): doc is FrappeDoc => Boolean(doc));
    const ownerNames = await resolveUserDisplayNames(validDocs.map((doc) => String(doc.owner || "")));

    const data = validDocs.map((doc) => {
      const childRows = ((doc.assignments as Record<string, unknown>[]) || []).map((row) => ({
        idx: Number(row.idx || 0),
        instructor: String(row.instructor || row.branch_manager_user || ""),
        instructor_name: String(row.assignee_name || row.instructor_name || row.instructor || row.branch_manager_user || ""),
        submission_status: String(row.submission_status || "Pending"),
        approval_status: String(row.approval_status || "Pending"),
        google_drive_link: row.google_drive_link ? String(row.google_drive_link) : null,
        submitted_on: row.submitted_on ? String(row.submitted_on) : null,
        approval_remarks: row.approval_remarks ? String(row.approval_remarks) : null,
        rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
      }));

      const submitted = childRows.filter((row) => row.submission_status === "Submitted").length;
      const approved = childRows.filter((row) => row.approval_status === "Approved").length;
      const rejected = childRows.filter((row) => row.approval_status === "Rejected").length;
      const pendingReview = childRows.filter(
        (row) => row.submission_status === "Submitted" && row.approval_status === "Pending",
      ).length;
      const docStatus = Number(doc.docstatus || 0);
      const status =
        docStatus === 1 ? "Active" :
        docStatus === 2 ? "Cancelled" :
        "Draft";

      const createdBy = String(doc.owner || "");

      return {
        ...doc,
        status,
        workflow_state: status,
        enabled: docStatus === 1,
        created_by: createdBy,
        created_by_name: ownerNames[createdBy] || createdBy,
        created_on: String(doc.creation || ""),
        instructions_file: null,
        reference_link: null,
        total_assigned: childRows.length,
        submitted_count: submitted,
        approved_count: approved,
        assignments: doc.assignments || [],
        status_details: {
          total: childRows.length,
          submitted,
          approved,
          rejected,
          pending: childRows.length - submitted,
          pending_review: pendingReview,
        },
        submissions: childRows,
      };
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch work assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
