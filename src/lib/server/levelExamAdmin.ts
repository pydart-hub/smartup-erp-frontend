import type { NextRequest } from "next/server";
import type { LevelCode } from "@/lib/types/levelExam";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number; orderBy?: string },
): string {
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

function calculateLevel(program?: string | null): LevelCode | null {
  const match = (program || "").match(/\b(10|[5-9])(?:st|nd|rd|th)?\b/);
  return (match?.[1] as LevelCode | undefined) ?? null;
}

function calculateBoard(program?: string | null) {
  const text = (program || "").toLowerCase();
  if (text.includes("cbse")) return "cbse";
  if (text.includes("state")) return "state";
  return null;
}

export async function requireSession(_request: NextRequest) {
  return {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      "Content-Type": "application/json",
    },
  };
}

export async function listLevelExamEligibleStudents(request: NextRequest, search?: string, levelCode?: string) {
  const { headers } = await requireSession(request);
  const studentFilters: unknown[][] = [["enabled", "=", 1]];
  if (search?.trim()) {
    studentFilters.push(["student_name", "like", `%${search.trim()}%`]);
  }

  const students = await safeFetch<{
    name: string;
    student_name: string;
    custom_branch?: string;
    custom_branch_abbr?: string;
  }>(
    frappeListUrl(
      "Student",
      studentFilters,
      ["name", "student_name", "custom_branch", "custom_branch_abbr"],
      { limit: 0, orderBy: "student_name asc" },
    ),
    headers,
  );

  const latestEnrollmentByStudent = new Map<string, { program: string; student_batch_name?: string }>();
  const studentIds = students.map((student) => student.name).filter(Boolean);
  const batchSize = 50;

  for (let index = 0; index < studentIds.length; index += batchSize) {
    const chunk = studentIds.slice(index, index + batchSize);
    const enrollments = await safeFetch<{
      student: string;
      program: string;
      student_batch_name?: string;
    }>(
      frappeListUrl(
        "Program Enrollment",
        [
          ["docstatus", "=", 1],
          ["student", "in", chunk],
        ],
        ["student", "program", "student_batch_name"],
        { limit: chunk.length * 3, orderBy: "enrollment_date desc, creation desc" },
      ),
      headers,
    );

    for (const enrollment of enrollments) {
      if (enrollment.student && !latestEnrollmentByStudent.has(enrollment.student)) {
        latestEnrollmentByStudent.set(enrollment.student, {
          program: enrollment.program,
          student_batch_name: enrollment.student_batch_name,
        });
      }
    }
  }

  const enriched = students.map((student) => {
    const latestEnrollment = latestEnrollmentByStudent.get(student.name);
    const program = latestEnrollment?.program || "";
    const derivedLevelCode = calculateLevel(program);

    return {
      student_id: student.name,
      student_name: student.student_name,
      branch: student.custom_branch || "",
      branch_abbr: student.custom_branch_abbr || "",
      program,
      student_group: latestEnrollment?.student_batch_name || "",
      level_code: derivedLevelCode,
      board_code: calculateBoard(program),
    };
  });

  return enriched.filter((student) => {
    if (!student.level_code) return false;
    if (levelCode && student.level_code !== levelCode) return false;
    return true;
  });
}
