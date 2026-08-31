/**
 * POST /api/admission/create-invoices
 *
 * Creates Sales Invoices from a submitted Sales Order based on the
 * instalment schedule. Each invoice gets the correct per-instalment
 * amount and due date.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { executeCreateInvoices, type ScheduleEntry } from "@/lib/services/invoiceService";

export async function POST(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { salesOrderName, schedule } = body as {
      salesOrderName: string;
      schedule: ScheduleEntry[];
    };

    if (!salesOrderName || !schedule?.length) {
      return NextResponse.json(
        { error: "salesOrderName and schedule are required" },
        { status: 400 },
      );
    }

    const result = await executeCreateInvoices(salesOrderName, schedule);

    if (!result.success && result.invoices.length === 0) {
      return NextResponse.json(
        {
          error: result.error || "Invoice creation failed for every billable instalment",
          ...(result.drafts && { drafts: result.drafts }),
          ...(result.failed && { failed: result.failed }),
          ...(result.absorbed && { absorbed: result.absorbed }),
          whatsappSent: result.whatsappSent,
          ...(result.whatsappError && { whatsappError: result.whatsappError }),
          ...(result.whatsappWarning && { whatsappWarning: result.whatsappWarning }),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[create-invoices] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
