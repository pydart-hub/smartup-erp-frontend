import { NextRequest } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

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
  return `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`;
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

export async function getParentSessionEmail(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }

  let email = "";
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    email = sessionData.email;
  } catch {
    throw new Error("Invalid session");
  }

  if (!email) {
    throw new Error("No email in session");
  }

  return email;
}

export async function getParentLinkedStudents(request: NextRequest) {
  const email = await getParentSessionEmail(request);
  const headers = {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
  };

  const guardians = await safeFetch<{
    name: string;
    guardian_name: string;
    email_address: string;
    mobile_number?: string;
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
    return [];
  }

  const guardianIds = guardians.map((item) => item.name);
  const studentFields = [
    "name",
    "student_name",
    "custom_branch",
    "custom_branch_abbr",
    "enabled",
  ];

  let children = await safeFetch<{
    name: string;
    student_name: string;
    custom_branch?: string;
    custom_branch_abbr?: string;
    enabled?: number;
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
      frappeListUrl("Student", [["custom_parent_name", "=", guardians[0].guardian_name]], studentFields, { limit: 20 }),
      headers,
    );
  }

  const enrollments = await Promise.all(
    children.map(async (child) => {
      const latestEnrollment = await safeFetch<{
        student: string;
        student_name: string;
        program: string;
        student_batch_name?: string;
      }>(
        frappeListUrl(
          "Program Enrollment",
          [
            ["student", "=", child.name],
            ["docstatus", "in", [0, 1]],
          ],
          ["student", "student_name", "program", "student_batch_name"],
          { limit: 1, orderBy: "enrollment_date desc" },
        ),
        headers,
      );
      return {
        studentId: child.name,
        studentName: child.student_name,
        branch: child.custom_branch || "",
        branchAbbr: child.custom_branch_abbr || "",
        enabled: child.enabled === 1,
        program: latestEnrollment[0]?.program || "",
        studentGroup: latestEnrollment[0]?.student_batch_name || "",
        boardCode: (latestEnrollment[0]?.program || "").toLowerCase().includes("cbse")
          ? "cbse"
          : (latestEnrollment[0]?.program || "").toLowerCase().includes("state")
            ? "state"
            : null,
      };
    }),
  );

  return enrollments;
}
