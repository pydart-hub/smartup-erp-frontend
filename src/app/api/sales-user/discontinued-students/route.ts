import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { getSalesUserBranches } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}` ,
};

async function frappeGetList(
  doctype: string,
  filters: (string | number | string[])[][],
  fields: string[],
  limit = 500,
  orderBy?: string,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  if (orderBy) params.set("order_by", orderBy);
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

function pickLatestByStudent<T extends { student?: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (row.student && !map.has(row.student)) {
      map.set(row.student, row);
    }
  }
  return map;
}


async function getParentMobileMap(studentIds: string[]): Promise<Record<string, string>> {
  if (studentIds.length === 0) return {};

  const studentGuardianRows = await frappeGetList(
    "Student",
    [["name", "in", studentIds]],
    ["name", "guardians.guardian"],
    Math.max(studentIds.length, 50),
  );

  const studentToGuardian = new Map<string, string>();
  const guardianIds: string[] = [];
  for (const row of studentGuardianRows) {
    const studentId = String(row.name ?? "");
    const guardianId = String(row.guardian ?? "");
    if (!studentId || !guardianId || studentToGuardian.has(studentId)) continue;
    studentToGuardian.set(studentId, guardianId);
    if (!guardianIds.includes(guardianId)) guardianIds.push(guardianId);
  }

  if (guardianIds.length === 0) return {};

  const guardians = await frappeGetList(
    "Guardian",
    [["name", "in", guardianIds]],
    ["name", "mobile_number"],
    Math.max(guardianIds.length, 50),
  );

  const guardianToMobile = new Map<string, string>();
  for (const row of guardians) {
    const guardianId = String(row.name ?? "");
    const mobile = String(row.mobile_number ?? "");
    if (guardianId && mobile) {
      guardianToMobile.set(guardianId, mobile);
    }
  }

  const result: Record<string, string> = {};
  for (const [studentId, guardianId] of studentToGuardian.entries()) {
    const mobile = guardianToMobile.get(guardianId);
    if (mobile) {
      result[studentId] = mobile;
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!(session.roles ?? []).includes("Sales User")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mapped = getSalesUserBranches(session.email);
    const allowedCompanies = mapped.length > 0 ? mapped : (session.allowed_companies ?? []);

    const branch = request.nextUrl.searchParams.get("branch") || "";
    if (branch && !allowedCompanies.includes(branch)) {
      return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
    }

    const studentFilters: (string | number | string[])[][] = [["enabled", "=", 0]];
    if (branch) studentFilters.push(["custom_branch", "=", branch]);
    else if (allowedCompanies.length > 0) studentFilters.push(["custom_branch", "in", allowedCompanies]);

    const students = await frappeGetList(
      "Student",
      studentFilters,
      [
        "name", "student_name", "custom_branch",
        "student_mobile_number", "custom_discontinuation_date",
        "custom_discontinuation_reason", "custom_parent_name",
      ],
      500,
      "modified desc",
    );

    if (!students.length) return NextResponse.json({ data: [] });

    const studentIds = students.map((row) => row.name as string);
    const today = new Date().toISOString().slice(0, 10);
    const parentMobileMap = await getParentMobileMap(studentIds);

    const enrollments = await frappeGetList(
      "Program Enrollment",
      [["student", "in", studentIds]],
      ["student", "program", "student_batch_name"],
      500,
      "modified desc",
    );
    const enrollmentMap = pickLatestByStudent(enrollments);

    const invoices = await frappeGetList(
      "Sales Invoice",
      [["student", "in", studentIds], ["docstatus", "=", 1], ["is_return", "=", 0]],
      ["student", "outstanding_amount", "due_date"],
      1000,
    );

    const outstandingMap = new Map<string, {
      outstanding_amount: number;
      overdue_outstanding_amount: number;
      future_outstanding_amount: number;
    }>();
    for (const invoice of invoices) {
      const studentId = String(invoice.student ?? "");
      if (!studentId) continue;
      const outstanding = Math.max(0, Number(invoice.outstanding_amount ?? 0));
      const dueDate = String(invoice.due_date ?? "");
      const current = outstandingMap.get(studentId) ?? {
        outstanding_amount: 0,
        overdue_outstanding_amount: 0,
        future_outstanding_amount: 0,
      };
      current.outstanding_amount += outstanding;
      if (outstanding > 0 && dueDate && dueDate <= today) current.overdue_outstanding_amount += outstanding;
      if (outstanding > 0 && dueDate && dueDate > today) current.future_outstanding_amount += outstanding;
      outstandingMap.set(studentId, current);
    }

    const followups = await frappeGetList(
      "Discontinued Follow Up",
      [["student", "in", studentIds]],
      [
        "name", "student", "student_name", "branch",
        "discontinuation_date", "discontinuation_reason",
        "call_date", "called_by", "call_status",
        "feedback_category", "feedback_notes",
        "interested_to_rejoin", "rejoin_probability",
        "reason_not_rejoining",
        "followup_outcome", "latest_mobile_used",
        "invoice_outstanding_at_call", "creation",
      ],
      1000,
      "call_date desc",
    );
    const latestFollowupMap = pickLatestByStudent(followups);

    const data = students.map((student) => {
      const studentId = String(student.name ?? "");
      const enrollment = enrollmentMap.get(studentId);
      const outstanding = outstandingMap.get(studentId);
      return {
        student_id: studentId,
        student_name: String(student.student_name ?? studentId),
        branch: String(student.custom_branch ?? ""),
        program: String(enrollment?.program ?? ""),
        batch: String(enrollment?.student_batch_name ?? ""),
        mobile: String(student.student_mobile_number ?? ""),
        parent_mobile: parentMobileMap[studentId] ?? "",
        discontinuation_date: String(student.custom_discontinuation_date ?? ""),
        discontinuation_reason: String(student.custom_discontinuation_reason ?? ""),
        outstanding_amount: outstanding?.outstanding_amount ?? 0,
        overdue_outstanding_amount: outstanding?.overdue_outstanding_amount ?? 0,
        future_outstanding_amount: outstanding?.future_outstanding_amount ?? 0,
        latest_followup: latestFollowupMap.get(studentId),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[sales-user/discontinued-students] Error:", error);
    return NextResponse.json({ error: "Failed to load discontinued students" }, { status: 500 });
  }
}


