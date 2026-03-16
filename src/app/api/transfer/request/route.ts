/**
 * POST /api/transfer/request
 *
 * Create a Student Branch Transfer request.
 * Called by the sender Branch Manager.
 *
 * Body: { student, to_branch, reason? }
 * Returns: { transfer }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`Frappe GET ${path}: ${res.status}`);
  return (await res.json()).data;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const session = authResult;

    const body = await request.json();
    const { student, to_branch, reason } = body as {
      student: string;
      to_branch: string;
      reason?: string;
    };

    if (!student || !to_branch) {
      return NextResponse.json(
        { error: "student and to_branch are required" },
        { status: 400 },
      );
    }

    // 1. Fetch student record
    const studentDoc = await frappeGet(
      `/api/resource/Student/${encodeURIComponent(student)}`,
    );
    const from_branch = studentDoc.custom_branch;
    if (!from_branch) {
      return NextResponse.json(
        { error: "Student has no branch assigned" },
        { status: 400 },
      );
    }

    // Validate sender BM owns this branch
    const allowed = session.allowed_companies || [];
    if (
      !allowed.includes(from_branch) &&
      !session.roles?.includes("Director") &&
      !session.roles?.includes("Administrator") &&
      !session.roles?.includes("System Manager")
    ) {
      return NextResponse.json(
        { error: "You can only transfer students from your own branch" },
        { status: 403 },
      );
    }

    if (from_branch === to_branch) {
      return NextResponse.json(
        { error: "Source and target branch cannot be the same" },
        { status: 400 },
      );
    }

    // 2. Check no pending transfer exists
    const existingRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student Branch Transfer?filters=${encodeURIComponent(
        JSON.stringify([
          ["student", "=", student],
          ["status", "=", "Pending"],
        ]),
      )}&fields=["name"]&limit_page_length=1`,
      { headers },
    );
    const existingData = await existingRes.json();
    if (existingData.data?.length > 0) {
      return NextResponse.json(
        { error: "This student already has a pending transfer request" },
        { status: 409 },
      );
    }

    // 3. Fetch latest Program Enrollment
    const peRes = await fetch(
      `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${encodeURIComponent(
        JSON.stringify([
          ["student", "=", student],
          ["docstatus", "=", 1],
        ]),
      )}&fields=["name","program","academic_year","custom_fee_structure","custom_plan","custom_no_of_instalments"]&order_by=enrollment_date desc&limit_page_length=1`,
      { headers },
    );
    const peData = await peRes.json();
    const enrollment = peData.data?.[0];

    const program = enrollment?.program || "";
    const academicYear = enrollment?.academic_year || "";
    const oldFeeStructure = enrollment?.custom_fee_structure || "";

    // 4. Fetch old fee structure total
    let oldTotalAmount = 0;
    if (oldFeeStructure) {
      try {
        const fsDoc = await frappeGet(
          `/api/resource/Fee Structure/${encodeURIComponent(oldFeeStructure)}`,
        );
        oldTotalAmount = fsDoc.total_amount || 0;
      } catch {
        // Fee structure may be missing - continue
      }
    }

    // 5. Calculate amount already paid
    // Sum submitted Payment Entries (Receive) for this customer at old branch
    let amountAlreadyPaid = 0;
    if (studentDoc.customer) {
      const payRes = await fetch(
        `${FRAPPE_URL}/api/resource/Payment Entry?filters=${encodeURIComponent(
          JSON.stringify([
            ["party", "=", studentDoc.customer],
            ["party_type", "=", "Customer"],
            ["company", "=", from_branch],
            ["docstatus", "=", 1],
            ["payment_type", "=", "Receive"],
          ]),
        )}&fields=["paid_amount"]&limit_page_length=100`,
        { headers },
      );
      const payData = await payRes.json();
      for (const pe of payData.data || []) {
        amountAlreadyPaid += pe.paid_amount || 0;
      }
    }

    // 6. Fetch old Sales Order reference
    let oldSalesOrder = "";
    if (studentDoc.customer) {
      const soRes = await fetch(
        `${FRAPPE_URL}/api/resource/Sales Order?filters=${encodeURIComponent(
          JSON.stringify([
            ["customer", "=", studentDoc.customer],
            ["company", "=", from_branch],
            ["docstatus", "=", 1],
          ]),
        )}&fields=["name","grand_total"]&order_by=creation desc&limit_page_length=1`,
        { headers },
      );
      const soData = await soRes.json();
      if (soData.data?.[0]) {
        oldSalesOrder = soData.data[0].name;
        // Use SO grand_total as old total if no fee structure
        if (!oldTotalAmount) oldTotalAmount = soData.data[0].grand_total || 0;
      }
    }

    // 7. Create the transfer record
    const transferPayload = {
      student,
      student_name: studentDoc.student_name,
      program,
      academic_year: academicYear,
      from_branch,
      to_branch,
      status: "Pending",
      old_fee_structure: oldFeeStructure,
      old_total_amount: oldTotalAmount,
      amount_already_paid: amountAlreadyPaid,
      old_sales_order: oldSalesOrder,
      old_program_enrollment: enrollment?.name || "",
      requested_by: session.email,
      request_date: new Date().toISOString().split("T")[0],
      reason: reason || "",
    };

    const createRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student Branch Transfer`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(transferPayload),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[transfer/request] Failed to create:", errText);
      return NextResponse.json(
        { error: "Failed to create transfer request" },
        { status: 502 },
      );
    }

    const transfer = (await createRes.json()).data;

    return NextResponse.json({ transfer });
  } catch (err) {
    console.error("[transfer/request] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
