import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { generateToken } from "@/lib/utils/invoiceToken";
import { sendTemplate } from "@/lib/utils/whatsapp";
import { buildInvoiceGenerated, type InvoiceGeneratedParams } from "@/lib/utils/whatsappTemplates";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://smartuplearning.net";

/**
 * POST /api/admission/send-invoice-notification
 *
 * Sends a WhatsApp notification to the guardian when invoices are created.
 * Generates a magic-link token for direct payment access.
 *
 * Body: {
 *   salesOrderName: string,
 *   studentName: string,
 *   guardianName: string,
 *   guardianMobile: string,
 *   programName: string,
 *   branchName: string,
 *   academicYear: string,
 *   totalAmount: number,
 *   instalments: Array<{ label: string, amount: number, dueDate: string }>
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = requireRole(request, STAFF_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const {
      salesOrderName,
      studentName,
      guardianName,
      guardianMobile,
      programName,
      branchName,
      academicYear,
      totalAmount,
      instalments,
    } = body;

    if (!salesOrderName || !guardianMobile) {
      return NextResponse.json(
        { error: "salesOrderName and guardianMobile are required" },
        { status: 400 },
      );
    }

    // If guardian mobile not provided, try to look it up from SO → Student → Guardian
    let mobile = guardianMobile;
    let guardian = guardianName || "";
    if (!mobile) {
      const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
      const soRes = await fetch(
        `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}?fields=["student"]`,
        { headers: { Authorization: adminAuth } },
      );
      if (soRes.ok) {
        const soData = (await soRes.json()).data;
        if (soData?.student) {
          const stuRes = await fetch(
            `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(soData.student)}?fields=["guardians"]`,
            { headers: { Authorization: adminAuth } },
          );
          if (stuRes.ok) {
            const stuData = (await stuRes.json()).data;
            if (stuData?.guardians?.length) {
              const g = stuData.guardians[0];
              mobile = g.mobile_number || "";
              guardian = guardian || g.guardian_name || "";
            }
          }
        }
      }
    }

    if (!mobile) {
      return NextResponse.json(
        { error: "Guardian mobile number not available" },
        { status: 400 },
      );
    }

    // Generate magic-link token (90-day expiry)
    const token = generateToken(salesOrderName);
    const payUrl = `${APP_BASE_URL}/pay/${token}`;

    // Build instalment summary text
    const instalmentText = (instalments || []).length === 1
      ? `Full payment — ₹${instalments[0].amount.toLocaleString("en-IN")}`
      : (instalments || [])
          .map(
            (inst: { label: string; amount: number; dueDate: string }, i: number) => {
              const mon = new Date(inst.dueDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
              return `${i + 1}. ₹${inst.amount.toLocaleString("en-IN")} (${mon})`;
            },
          )
          .join(", ");

    const templateParams: InvoiceGeneratedParams = {
      guardianName: guardian || "Parent",
      studentName: studentName || "your child",
      programName: programName || "",
      branchName: branchName || "",
      academicYear: academicYear || "",
      totalAmount: totalAmount || 0,
      instalmentSummary: instalmentText || "Please check the link below for details.",
    };

    const templateOpts = buildInvoiceGenerated(mobile, templateParams, payUrl);

    const result = await sendTemplate(templateOpts);

    return NextResponse.json({
      success: true,
      whatsapp_message_id: result.messages?.[0]?.id || null,
      pay_url: payUrl,
    });
  } catch (error: unknown) {
    console.error("[send-invoice-notification] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to send notification" },
      { status: 500 },
    );
  }
}
