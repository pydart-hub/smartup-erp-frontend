/**
 * POST /api/admission/create-invoices
 *
 * Creates Sales Invoices from a submitted Sales Order based on the
 * instalment schedule. Each invoice gets the correct per-instalment
 * amount and due date.
 *
 * Body:
 *   salesOrderName   — submitted SO name (e.g. "SAL-ORD-2026-00050")
 *   schedule         — array of { amount, dueDate, label }
 *
 * Returns: { invoices: string[] } — array of created invoice names
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { generateToken } from "@/lib/utils/invoiceToken";
import { sendTemplate } from "@/lib/utils/whatsapp";
import { buildInvoiceGenerated } from "@/lib/utils/whatsappTemplates";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://smartuplearning.net";

/** Retry-aware fetch — retries on socket/network errors (Frappe sometimes drops connections) */
async function fetchRetry(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      const isRetryable =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_SOCKET" ||
        (err as { cause?: { code?: string } })?.cause?.code === "UND_ERR_SOCKET";
      if (!isRetryable || attempt >= retries) throw err;
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

interface ScheduleEntry {
  amount: number;
  dueDate: string;
  label: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require staff role (BM / Admin / Director)
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

    const headers = {
      "Content-Type": "application/json",
      Authorization: `token ${API_KEY}:${API_SECRET}`,
    };

    // 1. Fetch the SO to get customer, company, items, etc.
    const soRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`,
      { headers },
    );
    if (!soRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch SO: ${soRes.statusText}` },
        { status: 502 },
      );
    }
    const soData = (await soRes.json()).data;

    // Guard: SO must be submitted
    if (soData.docstatus !== 1) {
      return NextResponse.json(
        { error: `Sales Order ${salesOrderName} is not submitted (docstatus=${soData.docstatus}). Submit it before creating invoices.` },
        { status: 400 },
      );
    }

    const soItem = soData.items?.[0]; // Tuition fee is always first item

    if (!soItem) {
      return NextResponse.json(
        { error: "Sales Order has no items" },
        { status: 400 },
      );
    }

    // 2. Create one Sales Invoice per instalment
    const createdInvoices: string[] = [];
    const draftInvoices: string[] = []; // Created but submission failed
    const failedInstalments: { index: number; label: string; error: string }[] = [];

    const today = new Date().toISOString().split("T")[0];

    // Brief pause to let Frappe fully index the newly-submitted SO before
    // we start creating invoices against it. Without this, the first
    // invoice creation can fail with a billing-limit or document-not-found
    // error on high-load days (race condition with SO post-submit hooks).
    await new Promise((r) => setTimeout(r, 1000));

    for (let i = 0; i < schedule.length; i++) {
      const inst = schedule[i];
      // If the due date is already past, use today to avoid Frappe's
      // "Due Date cannot be before Posting Date" validation error.
      const effectiveDate = inst.dueDate < today ? today : inst.dueDate;

      const invoicePayload = {
        doctype: "Sales Invoice",
        customer: soData.customer,
        company: soData.company,
        posting_date: effectiveDate,
        due_date: effectiveDate,
        // Custom fields from SO
        student: soData.student,
        custom_academic_year: soData.custom_academic_year,
        // Items — qty=1 per instalment, rate=instalment amount.
        // SO should have qty=numInstalments so each invoice billing qty=1
        // stays within the overbilling threshold.
        items: [
          {
            item_code: soItem.item_code,
            item_name: soItem.item_name,
            description: `${inst.label} — ${soItem.item_name}`,
            qty: 1,
            rate: inst.amount,
            amount: inst.amount,
            sales_order: salesOrderName,
            so_detail: soItem.name, // SO item row name for billing linkage
          },
        ],
      };

      // Insert as draft
      const createRes = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Invoice`, {
        method: "POST",
        headers,
        body: JSON.stringify(invoicePayload),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        console.error(`[create-invoices] Failed to create invoice ${i + 1}:`, errBody);
        failedInstalments.push({ index: i, label: inst.label, error: errBody });
        continue; // Don't abort remaining invoices
      }

      const created = (await createRes.json()).data;
      const invName = created.name;

      // Submit the invoice
      const submitRes = await fetchRetry(
        `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ docstatus: 1 }),
        },
      );

      if (!submitRes.ok) {
        const submitErr = await submitRes.text().catch(() => "");
        console.error(`[create-invoices] Failed to submit invoice ${invName}:`, submitErr);
        // Track as draft — created but not submitted
        draftInvoices.push(invName);
        failedInstalments.push({ index: i, label: inst.label, error: `Created as draft but submission failed: ${submitErr}` });
      } else {
        createdInvoices.push(invName);
      }
    }

    // ── Retry any failed instalments once (handles transient Frappe errors) ──
    if (failedInstalments.length > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      const stillFailed: typeof failedInstalments = [];
      for (const failed of failedInstalments) {
        const inst = schedule[failed.index];
        const effectiveDate = inst.dueDate < today ? today : inst.dueDate;
        const retryPayload = {
          doctype: "Sales Invoice",
          customer: soData.customer,
          company: soData.company,
          posting_date: effectiveDate,
          due_date: effectiveDate,
          student: soData.student,
          custom_academic_year: soData.custom_academic_year,
          items: [
            {
              item_code: soItem.item_code,
              item_name: soItem.item_name,
              description: `${inst.label} — ${soItem.item_name}`,
              qty: 1,
              rate: inst.amount,
              amount: inst.amount,
              sales_order: salesOrderName,
              so_detail: soItem.name,
            },
          ],
        };
        const retryCreate = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Invoice`, {
          method: "POST",
          headers,
          body: JSON.stringify(retryPayload),
        });
        if (!retryCreate.ok) {
          const errBody = await retryCreate.text();
          console.error(`[create-invoices] Retry failed for instalment ${failed.index + 1}:`, errBody);
          stillFailed.push({ ...failed, error: errBody });
          continue;
        }
        const retryCreated = (await retryCreate.json()).data;
        const retryInvName = retryCreated.name;
        const retrySubmit = await fetchRetry(
          `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(retryInvName)}`,
          { method: "PUT", headers, body: JSON.stringify({ docstatus: 1 }) },
        );
        if (!retrySubmit.ok) {
          const submitErr = await retrySubmit.text().catch(() => "");
          draftInvoices.push(retryInvName);
          stillFailed.push({ ...failed, error: `Created as draft but submission failed: ${submitErr}` });
        } else {
          createdInvoices.push(retryInvName);
          console.log(`[create-invoices] Retry succeeded for instalment ${failed.index + 1}: ${retryInvName}`);
        }
      }
      // Replace original failedInstalments with those that still failed after retry
      failedInstalments.length = 0;
      failedInstalments.push(...stillFailed);
    }

    // ── Send WhatsApp notification to guardian ──────────────────────────
    let whatsappSent = false;
    let whatsappError: string | undefined;
    let whatsappWarning: string | undefined;

    if (createdInvoices.length > 0) {
      try {
        // Look up Student → Guardian mobile
        let guardianMobile = "";
        let guardianName = "";
        let studentName = soData.customer_name || "";

        if (soData.student) {
          const stuRes = await fetchRetry(
            `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(soData.student)}`,
            { headers },
          );
          if (stuRes.ok) {
            const stuData = (await stuRes.json()).data;
            studentName = stuData.student_name || studentName;
            const guardianRow = stuData.guardians?.[0];
            if (guardianRow?.guardian) {
              // mobile_number is NOT on the child table row — it lives on the Guardian document
              const guardianDocRes = await fetchRetry(
                `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianRow.guardian)}`,
                { headers },
              );
              if (guardianDocRes.ok) {
                const guardianDoc = (await guardianDocRes.json()).data;
                guardianMobile = guardianDoc.mobile_number || "";
                guardianName = guardianDoc.guardian_name || guardianRow.guardian_name || "";
              }
            }
          }
        }

        if (guardianMobile) {
          const branchName = (soData.company || "").replace(/^Smart Up\s*/i, "");
          const academicYear = soData.custom_academic_year || "";
          const firstItem = soData.items?.[0];
          const programName = firstItem?.item_name
            ? firstItem.item_name.replace(/^Tuition Fee\s*[-–—]\s*/i, "").trim() || firstItem.item_name
            : "";
          const totalAmount = schedule.reduce((s: number, inst: ScheduleEntry) => s + inst.amount, 0);

          const instalmentSummary = schedule.length === 1
            ? `Full payment — ₹${schedule[0].amount.toLocaleString("en-IN")}`
            : schedule
              .map((inst: ScheduleEntry, i: number) => {
                const mon = new Date(inst.dueDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                return `${i + 1}. ₹${inst.amount.toLocaleString("en-IN")} (${mon})`;
              })
              .join(", ");

          const token = generateToken(salesOrderName);
          const payUrl = `${APP_BASE_URL}/pay/${token}`;

          const templateOpts = buildInvoiceGenerated(guardianMobile, {
            guardianName: guardianName || "Parent",
            studentName,
            programName: programName || "Your Program",
            branchName: branchName || "SmartUp",
            academicYear: academicYear || "2026-2027",
            totalAmount,
            instalmentSummary,
          }, payUrl);

          await sendTemplate(templateOpts);
          whatsappSent = true;
          console.log(`[create-invoices] WhatsApp sent to ${guardianMobile} for SO ${salesOrderName}`);
        } else {
          whatsappWarning = "No guardian mobile number found — WhatsApp not sent";
          console.warn(`[create-invoices] ${whatsappWarning} for SO ${salesOrderName}`);
        }
      } catch (notifErr) {
        whatsappError = notifErr instanceof Error ? notifErr.message : String(notifErr);
        console.error("[create-invoices] WhatsApp notification failed:", notifErr);
      }
    }

    return NextResponse.json({
      invoices: createdInvoices,
      ...(draftInvoices.length > 0 && { drafts: draftInvoices }),
      ...(failedInstalments.length > 0 && { failed: failedInstalments }),
      whatsappSent,
      ...(whatsappError && { whatsappError }),
      ...(whatsappWarning && { whatsappWarning }),
    });
  } catch (err) {
    console.error("[create-invoices] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
