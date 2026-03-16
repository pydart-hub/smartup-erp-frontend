/**
 * GET /api/fees/discontinued-summary
 *
 * Returns a list of discontinued students and their written-off amounts.
 * Queries credit notes (Sales Invoices with is_return=1) grouped by student.
 *
 * Query params:
 *   company  — optional branch filter
 *
 * Returns: {
 *   students: [{ student_id, student_name, branch, discontinuation_date,
 *                reason, total_written_off, credit_notes: [...] }],
 *   total_written_off: number
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
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

interface DiscontinuedStudentSummary {
  student_id: string;
  student_name: string;
  branch: string;
  discontinuation_date: string;
  reason: string;
  remarks: string;
  total_written_off: number;
  credit_notes: {
    name: string;
    return_against: string;
    amount: number;
    posting_date: string;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    // 1. Get discontinued students (enabled=0, has discontinuation_date)
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
        "custom_discontinuation_remarks",
      ],
      500,
      "custom_discontinuation_date desc",
    );

    if (students.length === 0) {
      return NextResponse.json({
        students: [],
        total_written_off: 0,
      });
    }

    // 2. For each student's customer, find credit notes
    const result: DiscontinuedStudentSummary[] = [];
    let grandTotal = 0;

    for (const stu of students) {
      const customerName = stu.customer as string | undefined;
      if (!customerName) {
        result.push({
          student_id: stu.name as string,
          student_name: stu.student_name as string,
          branch: (stu.custom_branch as string) || "",
          discontinuation_date: (stu.custom_discontinuation_date as string) || "",
          reason: (stu.custom_discontinuation_reason as string) || "",
          remarks: (stu.custom_discontinuation_remarks as string) || "",
          total_written_off: 0,
          credit_notes: [],
        });
        continue;
      }

      const creditNotes = await frappeGetList(
        "Sales Invoice",
        [
          ["customer", "=", customerName],
          ["is_return", "=", 1],
          ["docstatus", "=", 1],
        ],
        ["name", "return_against", "grand_total", "posting_date"],
        50,
        "posting_date desc",
      );

      // grand_total on credit notes is negative → take absolute
      const totalWrittenOff = creditNotes.reduce(
        (sum, cn) => sum + Math.abs(cn.grand_total as number),
        0,
      );
      grandTotal += totalWrittenOff;

      result.push({
        student_id: stu.name as string,
        student_name: stu.student_name as string,
        branch: (stu.custom_branch as string) || "",
        discontinuation_date: (stu.custom_discontinuation_date as string) || "",
        reason: (stu.custom_discontinuation_reason as string) || "",
        remarks: (stu.custom_discontinuation_remarks as string) || "",
        total_written_off: totalWrittenOff,
        credit_notes: creditNotes.map((cn) => ({
          name: cn.name as string,
          return_against: (cn.return_against as string) || "",
          amount: Math.abs(cn.grand_total as number),
          posting_date: cn.posting_date as string,
        })),
      });
    }

    return NextResponse.json({
      students: result,
      total_written_off: grandTotal,
    });
  } catch (err) {
    console.error("[discontinued-summary] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
