import { NextRequest, NextResponse } from "next/server";
import type { Complaint, CreateComplaintPayload } from "@/lib/types/complaint";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number; orderBy?: string }
): string {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 100),
  });
  if (opts?.orderBy) params.set("order_by", opts.orderBy);
  return `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

async function safeFetch<T = unknown>(
  url: string,
  headers: Record<string, string>
): Promise<T[]> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      console.error(`[parent/complaints] Frappe ${res.status} for ${url}`);
      return [];
    }
    const json = await res.json();
    return json?.data ?? [];
  } catch (err) {
    console.error("[parent/complaints] fetch error:", err);
    return [];
  }
}

function getSession(request: NextRequest): { email: string } | null {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (!sessionData.email) return null;
    return { email: sessionData.email };
  } catch {
    return null;
  }
}

/**
 * GET /api/parent/complaints
 * Returns all complaints filed by this parent (matched by guardian_email).
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    const complaints = await safeFetch<Complaint>(
      frappeListUrl(
        "Complaint",
        [["guardian_email", "=", session.email]],
        [
          "name", "subject", "category", "priority", "status",
          "description", "student", "student_name", "branch", "branch_abbr",
          "guardian", "guardian_name", "guardian_email",
          "resolution_notes", "resolved_by", "resolved_date",
          "creation", "modified",
        ],
        { limit: 100, orderBy: "creation desc" }
      ),
      headers
    );

    return NextResponse.json({ complaints });
  } catch (error: unknown) {
    console.error("[parent/complaints] GET error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parent/complaints
 * Create a new complaint. Body: { subject, category, description, student, priority? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: CreateComplaintPayload = await request.json();

    // Validate required fields
    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!body.student) {
      return NextResponse.json({ error: "Student is required" }, { status: 400 });
    }

    // Length validations
    if (body.subject.trim().length > 140) {
      return NextResponse.json({ error: "Subject must be 140 characters or less" }, { status: 400 });
    }
    if (body.description.trim().length > 5000) {
      return NextResponse.json({ error: "Description must be 5000 characters or less" }, { status: 400 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Find guardian by email
    const guardians = await safeFetch<{ name: string; guardian_name: string }>(
      frappeListUrl(
        "Guardian",
        [["email_address", "=", session.email]],
        ["name", "guardian_name"],
        { limit: 1 }
      ),
      headers
    );
    const guardian = guardians[0];

    // Fetch student to get branch info and verify ownership
    const students = await safeFetch<{
      name: string;
      student_name: string;
      custom_branch: string;
      custom_branch_abbr: string;
    }>(
      frappeListUrl(
        "Student",
        [["name", "=", body.student]],
        ["name", "student_name", "custom_branch", "custom_branch_abbr"],
        { limit: 1 }
      ),
      headers
    );

    if (students.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const student = students[0];

    // Create the complaint
    const complaintData = {
      doctype: "Complaint",
      subject: body.subject.trim(),
      category: body.category,
      description: body.description.trim(),
      student: body.student,
      student_name: student.student_name,
      branch: student.custom_branch,
      branch_abbr: student.custom_branch_abbr || "",
      guardian: guardian?.name || "",
      guardian_name: guardian?.guardian_name || "",
      guardian_email: session.email,
      priority: body.priority || "Medium",
      status: "Open",
    };

    const createRes = await fetch(
      `${FRAPPE_URL}/api/resource/Complaint`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(complaintData),
        cache: "no-store",
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[parent/complaints] Create failed:", createRes.status, errText);
      return NextResponse.json(
        { error: "Failed to submit complaint" },
        { status: 500 }
      );
    }

    const created = await createRes.json();
    return NextResponse.json({ complaint: created.data }, { status: 201 });
  } catch (error: unknown) {
    console.error("[parent/complaints] POST error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
