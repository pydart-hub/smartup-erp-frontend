/**
 * GET /api/fees/forfeited-detail
 *
 * Returns discontinued students grouped by their last batch (from Program Enrollment),
 * with outstanding invoice totals per student.
 *
 * Query params:
 *   company  — optional branch filter
 *
 * Returns: {
 *   batches: [{
 *     batch_name: string,
 *     total_outstanding: number,
 *     students: [{
 *       student_id, student_name, branch,
 *       discontinuation_date, reason,
 *       outstanding_amount, invoice_count
 *     }]
 *   }],
 *   total_outstanding: number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGetList(
  doctype: string,
  filters: (string | number | string[]|null)[][],
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
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

export interface ForfeitedStudent {
  student_id: string;
  student_name: string;
  branch: string;
  discontinuation_date: string;
  reason: string;
  outstanding_amount: number;
  invoice_count: number;
}

export interface ForfeitedBatch {
  batch_name: string;
  total_outstanding: number;
  students: ForfeitedStudent[];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    // 1. Get discontinued students
    const studentFilters: (string | number | string[])[][] = [
      ["enabled", "=", 0],
      ["custom_discontinuation_date", "is", "set"],
    ];
    if (company) studentFilters.push(["custom_branch", "=", company]);

    const students = await frappeGetList(
      "Student",
      studentFilters,
      [
        "name", "student_name", "customer", "custom_branch",
        "custom_discontinuation_date", "custom_discontinuation_reason",
      ],
      500,
      "custom_discontinuation_date desc",
    );

    if (students.length === 0) {
      return NextResponse.json({ batches: [], total_outstanding: 0 });
    }

    const studentIds = students.map((s) => s.name as string);

    // 2. Get outstanding invoices for all discontinued students in one query
    const invoices = await frappeGetList(
      "Sales Invoice",
      [
        ["student", "in", studentIds],
        ["outstanding_amount", ">", 0],
        ["docstatus", "=", 1],
        ["is_return", "=", 0],
      ],
      ["name", "student", "outstanding_amount"],
      500,
    );

    // Build per-student totals: studentId → { total, count }
    const invoiceTotals = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const sid = inv.student as string;
      if (!sid) continue;
      const existing = invoiceTotals.get(sid) ?? { total: 0, count: 0 };
      existing.total += inv.outstanding_amount as number;
      existing.count += 1;
      invoiceTotals.set(sid, existing);
    }

    // 3. Get batch info from Program Enrollment for all discontinued students
    const enrollments = await frappeGetList(
      "Program Enrollment",
      [["student", "in", studentIds]],
      ["student", "program", "student_batch_name", "docstatus"],
      500,
      "modified desc",
    );

    // Map studentId → program/class name (prefer most recent)
    const studentBatch = new Map<string, string>();
    for (const en of enrollments) {
      const sid = en.student as string;
      if (!studentBatch.has(sid) && en.program) {
        studentBatch.set(sid, en.program as string);
      }
    }

    // 4. Group students by program/class
    const batchMap = new Map<string, ForfeitedBatch>();
    let grandTotal = 0;

    for (const stu of students) {
      const sid = stu.name as string;
      const batchName = studentBatch.get(sid) ?? "Unassigned Class";
      const totals = invoiceTotals.get(sid) ?? { total: 0, count: 0 };
      grandTotal += totals.total;

      const forfStudent: ForfeitedStudent = {
        student_id: sid,
        student_name: stu.student_name as string,
        branch: (stu.custom_branch as string) || "",
        discontinuation_date: (stu.custom_discontinuation_date as string) || "",
        reason: (stu.custom_discontinuation_reason as string) || "",
        outstanding_amount: totals.total,
        invoice_count: totals.count,
      };

      if (!batchMap.has(batchName)) {
        batchMap.set(batchName, {
          batch_name: batchName,
          total_outstanding: 0,
          students: [],
        });
      }
      const batch = batchMap.get(batchName)!;
      batch.students.push(forfStudent);
      batch.total_outstanding += totals.total;
    }

    const batches = Array.from(batchMap.values()).sort(
      (a, b) => b.total_outstanding - a.total_outstanding,
    );

    return NextResponse.json({ batches, total_outstanding: grandTotal });
  } catch (err) {
    console.error("[forfeited-detail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
