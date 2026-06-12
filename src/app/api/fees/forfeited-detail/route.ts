/**
 * GET /api/fees/forfeited-detail
 *
 * Returns discontinued students grouped by their latest class/program along with
 * invoice totals. Invoices are kept alive after discontinuation, so this route
 * reports total invoiced, paid, and pending amounts per student.
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
  filters: (string | number | string[] | null)[][],
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

export interface ForfeitedStudent {
  student_id: string;
  student_name: string;
  branch: string;
  discontinuation_date: string;
  reason: string;
  total_invoiced_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  overdue_outstanding_amount: number;
  future_outstanding_amount: number;
  overdue_invoice_count: number;
  oldest_overdue_date: string;
  days_overdue: number;
  is_bad_debt: boolean;
  invoice_count: number;
  disabilities: string;
}

export interface ForfeitedBatch {
  batch_name: string;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_bad_debt: number;
  total_future_forfeited: number;
  bad_debt_student_count: number;
  students: ForfeitedStudent[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86400000));
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    const studentFilters: (string | number | string[])[][] = [
      ["enabled", "=", 0],
      ["custom_discontinuation_date", "is", "set"],
    ];
    if (company) studentFilters.push(["custom_branch", "=", company]);

    const students = await frappeGetList(
      "Student",
      studentFilters,
      [
        "name",
        "student_name",
        "custom_branch",
        "custom_discontinuation_date",
        "custom_discontinuation_reason",
        "custom_disabilities",
      ],
      500,
      "custom_discontinuation_date desc",
    );

    if (students.length === 0) {
      return NextResponse.json({
        batches: [],
        total_invoiced: 0,
        total_paid: 0,
        total_outstanding: 0,
        total_bad_debt: 0,
        total_future_forfeited: 0,
        student_count: 0,
        bad_debt_student_count: 0,
      });
    }

    const studentIds = students.map((student) => student.name as string);
    const today = todayStr();

    const invoices = await frappeGetList(
      "Sales Invoice",
      [
        ["student", "in", studentIds],
        ["docstatus", "=", 1],
        ["is_return", "=", 0],
      ],
      ["name", "student", "grand_total", "outstanding_amount", "due_date"],
      1000,
    );

    const invoiceTotals = new Map<
      string,
      {
        invoiced: number;
        paid: number;
        outstanding: number;
        overdueOutstanding: number;
        futureOutstanding: number;
        overdueInvoiceCount: number;
        oldestOverdueDate: string;
        count: number;
      }
    >();

    for (const invoice of invoices) {
      const studentId = invoice.student as string;
      if (!studentId) continue;

      const grandTotal = Number(invoice.grand_total ?? 0);
      const outstanding = Math.max(0, Number(invoice.outstanding_amount ?? 0));
      const paid = Math.max(0, grandTotal - outstanding);
      const dueDate = String(invoice.due_date ?? "");
      const isOverdue = outstanding > 0 && !!dueDate && dueDate <= today;
      const isFutureDue = outstanding > 0 && !!dueDate && dueDate > today;

      const current = invoiceTotals.get(studentId) ?? {
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        overdueOutstanding: 0,
        futureOutstanding: 0,
        overdueInvoiceCount: 0,
        oldestOverdueDate: "",
        count: 0,
      };

      current.invoiced += grandTotal;
      current.paid += paid;
      current.outstanding += outstanding;
      current.count += 1;
      if (isOverdue) {
        current.overdueOutstanding += outstanding;
        current.overdueInvoiceCount += 1;
        if (!current.oldestOverdueDate || dueDate < current.oldestOverdueDate) {
          current.oldestOverdueDate = dueDate;
        }
      } else if (isFutureDue) {
        current.futureOutstanding += outstanding;
      }
      invoiceTotals.set(studentId, current);
    }

    const enrollments = await frappeGetList(
      "Program Enrollment",
      [["student", "in", studentIds]],
      ["student", "program", "student_batch_name"],
      500,
      "modified desc",
    );

    const studentBatch = new Map<string, string>();
    for (const enrollment of enrollments) {
      const studentId = enrollment.student as string;
      const program =
        (enrollment.program as string | undefined) ||
        (enrollment.student_batch_name as string | undefined);
      if (!studentId || !program || studentBatch.has(studentId)) continue;
      studentBatch.set(studentId, program);
    }

    const batchMap = new Map<string, ForfeitedBatch>();
    let grandInvoiced = 0;
    let grandPaid = 0;
    let grandOutstanding = 0;
    let grandBadDebt = 0;
    let grandFutureForfeited = 0;
    let badDebtStudentCount = 0;

    for (const student of students) {
      const studentId = student.name as string;
      const batchName = studentBatch.get(studentId) ?? "Unassigned Class";
      const totals = invoiceTotals.get(studentId) ?? {
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        overdueOutstanding: 0,
        futureOutstanding: 0,
        overdueInvoiceCount: 0,
        oldestOverdueDate: "",
        count: 0,
      };

      grandInvoiced += totals.invoiced;
      grandPaid += totals.paid;
      grandOutstanding += totals.outstanding;
      grandBadDebt += totals.overdueOutstanding;
      grandFutureForfeited += totals.futureOutstanding;
      if (totals.overdueOutstanding > 0) badDebtStudentCount += 1;

      const studentRow: ForfeitedStudent = {
        student_id: studentId,
        student_name: (student.student_name as string) || studentId,
        branch: (student.custom_branch as string) || "",
        discontinuation_date: (student.custom_discontinuation_date as string) || "",
        reason: (student.custom_discontinuation_reason as string) || "",
        total_invoiced_amount: totals.invoiced,
        paid_amount: totals.paid,
        outstanding_amount: totals.outstanding,
        overdue_outstanding_amount: totals.overdueOutstanding,
        future_outstanding_amount: totals.futureOutstanding,
        overdue_invoice_count: totals.overdueInvoiceCount,
        oldest_overdue_date: totals.oldestOverdueDate,
        days_overdue: totals.oldestOverdueDate ? daysBetween(totals.oldestOverdueDate, today) : 0,
        is_bad_debt: totals.overdueOutstanding > 0,
        invoice_count: totals.count,
        disabilities: (student.custom_disabilities as string) || "",
      };

      if (!batchMap.has(batchName)) {
        batchMap.set(batchName, {
          batch_name: batchName,
          total_invoiced: 0,
          total_paid: 0,
          total_outstanding: 0,
          total_bad_debt: 0,
          total_future_forfeited: 0,
          bad_debt_student_count: 0,
          students: [],
        });
      }

      const batch = batchMap.get(batchName)!;
      batch.students.push(studentRow);
      batch.total_invoiced += totals.invoiced;
      batch.total_paid += totals.paid;
      batch.total_outstanding += totals.outstanding;
      batch.total_bad_debt += totals.overdueOutstanding;
      batch.total_future_forfeited += totals.futureOutstanding;
      if (totals.overdueOutstanding > 0) batch.bad_debt_student_count += 1;
    }

    const batches = Array.from(batchMap.values())
      .map((batch) => ({
        ...batch,
        students: [...batch.students].sort(
          (a, b) =>
            b.overdue_outstanding_amount - a.overdue_outstanding_amount ||
            b.outstanding_amount - a.outstanding_amount ||
            b.total_invoiced_amount - a.total_invoiced_amount,
        ),
      }))
      .sort((a, b) => b.total_bad_debt - a.total_bad_debt || b.total_outstanding - a.total_outstanding);

    return NextResponse.json({
      batches,
      total_invoiced: grandInvoiced,
      total_paid: grandPaid,
      total_outstanding: grandOutstanding,
      total_bad_debt: grandBadDebt,
      total_future_forfeited: grandFutureForfeited,
      student_count: students.length,
      bad_debt_student_count: badDebtStudentCount,
    });
  } catch (error) {
    console.error("[forfeited-detail] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
