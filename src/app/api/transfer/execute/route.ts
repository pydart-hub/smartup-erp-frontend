/**
 * POST /api/transfer/execute
 *
 * Executes the full Student Branch Transfer chain.
 * Called internally after a transfer is accepted.
 *
 * 13-step execution chain:
 *  1. Cancel & delete unpaid Sales Invoices at old branch
 *  2. Cancel & delete old Sales Order
 *  3. Remove student from old Student Group (batch)
 *  4. Cancel & delete old Course Enrollments
 *  5. Cancel & delete old Program Enrollment
 *  6. Update Student.custom_branch + custom_branch_abbr
 *  7. Find new branch batch + Create PE (draft) + Patch CEs + Submit PE
 *  8. Add student to new branch batch (Student Group)
 *  9. Create new Sales Order (adjusted amount)
 * 10. Submit new Sales Order
 * 11. Create new Sales Invoices (instalment schedule)
 * 12. Update transfer record → Completed
 * 13. Log completion
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { generateInstalmentSchedule, buildFeeConfigKey, getOptionTotal } from "@/lib/utils/feeSchedule";
import feeConfigData from "@/../docs/fee_structure_parsed.json";
import type { FeeConfigEntry } from "@/lib/types/fee";

const feeConfig = feeConfigData as Record<string, FeeConfigEntry>;

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

// ─────────────────────────────────────────────────────────────
// Frappe helpers
// ─────────────────────────────────────────────────────────────

async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()).data;
}

async function frappePost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`POST ${path}: ${res.status} — ${errText}`);
  }
  return (await res.json()).data;
}

async function frappePut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PUT ${path}: ${res.status} — ${errText}`);
  }
  return (await res.json()).data;
}

async function frappeDelete(path: string) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DELETE ${path}: ${res.status} — ${errText}`);
  }
  return (await res.json());
}

async function frappeList(
  doctype: string,
  filters: (string | number)[][],
  fields: string[],
  opts?: { order_by?: string; limit?: number },
) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 100),
    ...(opts?.order_by ? { order_by: opts.order_by } : {}),
  });
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers },
  );
  if (!res.ok) throw new Error(`LIST ${doctype}: ${res.status}`);
  return (await res.json()).data;
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const log: string[] = [];
  const step = (msg: string) => {
    log.push(`[${new Date().toISOString()}] ${msg}`);
    console.log(`[transfer/execute] ${msg}`);
  };

  let transferId = "";

  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    transferId = body.transfer_id;
    if (!transferId) {
      return NextResponse.json(
        { error: "transfer_id is required" },
        { status: 400 },
      );
    }

    // Load the transfer record
    const transfer = await frappeGet(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transferId)}`,
    );

    if (transfer.status !== "Approved") {
      return NextResponse.json(
        { error: `Transfer must be Approved to execute (current: ${transfer.status})` },
        { status: 400 },
      );
    }

    step(`Starting transfer ${transferId}: ${transfer.student_name} from ${transfer.from_branch} → ${transfer.to_branch}`);

    // ── Load student + customer info ──
    const studentDoc = await frappeGet(
      `/api/resource/Student/${encodeURIComponent(transfer.student)}`,
    );
    const customerName = studentDoc.customer;

    // ── Get new branch abbreviation ──
    const newCompany = await frappeGet(
      `/api/resource/Company/${encodeURIComponent(transfer.to_branch)}?fields=["abbr"]`,
    );
    const newAbbr = newCompany.abbr || "";

    // ════════════════════════════════════════════════════════════
    // PHASE 1: CLOSE OLD BRANCH
    // ════════════════════════════════════════════════════════════

    // ── Pre-step: Clear old link references on transfer record ──
    // Frappe won't let us delete docs that are linked from other records,
    // so we clear old_sales_order and old_program_enrollment first.
    step("Pre-step: Clearing old link references on ALL transfer records");
    // Clear links on the current transfer
    await frappePut(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transferId)}`,
      {
        old_sales_order: "",
        old_program_enrollment: "",
      },
    );
    // Also clear links on any OTHER transfer records referencing the same SO or PE
    if (transfer.old_sales_order || transfer.old_program_enrollment) {
      const otherTransfers = await frappeList(
        "Student Branch Transfer",
        [["student", "=", transfer.student], ["name", "!=", transferId]],
        ["name", "old_sales_order", "old_program_enrollment"],
      );
      for (const ot of otherTransfers) {
        const updates: Record<string, string> = {};
        if (ot.old_sales_order === transfer.old_sales_order && transfer.old_sales_order) {
          updates.old_sales_order = "";
        }
        if (ot.old_program_enrollment === transfer.old_program_enrollment && transfer.old_program_enrollment) {
          updates.old_program_enrollment = "";
        }
        if (Object.keys(updates).length > 0) {
          try {
            await frappePut(
              `/api/resource/Student Branch Transfer/${encodeURIComponent(ot.name)}`,
              updates,
            );
            step(`  Cleared links on related transfer ${ot.name}`);
          } catch (err) {
            step(`  WARNING: Could not clear links on ${ot.name}: ${err}`);
          }
        }
      }
    }
    step("  Cleared old_sales_order and old_program_enrollment links");

    // ── Step 0: Cancel & delete old Student Attendance records ──
    step("Step 0: Cancelling & deleting old Student Attendance records at old branch");
    const oldAttendance = await frappeList(
      "Student Attendance",
      [
        ["student", "=", transfer.student],
        ["custom_branch", "=", transfer.from_branch],
      ],
      ["name", "docstatus"],
      { limit: 500 },
    );
    let deletedAttendanceCount = 0;
    for (const att of oldAttendance) {
      try {
        if (att.docstatus === 1) {
          await frappePut(
            `/api/resource/Student Attendance/${encodeURIComponent(att.name)}`,
            { docstatus: 2 },
          );
        }
        await frappeDelete(
          `/api/resource/Student Attendance/${encodeURIComponent(att.name)}`,
        );
        deletedAttendanceCount++;
      } catch (err) {
        step(`  WARNING: Could not delete attendance ${att.name}: ${err}`);
      }
    }
    step(`  Deleted ${deletedAttendanceCount} attendance records`);

    // ── Step 1: Cancel & delete unpaid Sales Invoices ──
    step("Step 1: Cancelling & deleting unpaid Sales Invoices at old branch");
    const oldInvoices = await frappeList(
      "Sales Invoice",
      [
        ["customer", "=", customerName],
        ["company", "=", transfer.from_branch],
        ["docstatus", "=", 1],
      ],
      ["name", "grand_total", "outstanding_amount", "status"],
    );

    let cancelledSIs = 0;
    for (const si of oldInvoices) {
      try {
        // Cancel (submitted → cancelled)
        await frappePut(
          `/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`,
          { docstatus: 2 },
        );
        step(`  Cancelled SI ${si.name} (outstanding: ${si.outstanding_amount})`);
        // Delete the cancelled invoice
        await frappeDelete(
          `/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`,
        );
        step(`  Deleted SI ${si.name}`);
        cancelledSIs++;
      } catch (err) {
        step(`  WARNING: Could not cancel/delete SI ${si.name}: ${err}`);
      }
    }
    // Also delete any already-cancelled SIs from previous attempts
    const cancelledOldSIs = await frappeList(
      "Sales Invoice",
      [
        ["customer", "=", customerName],
        ["company", "=", transfer.from_branch],
        ["docstatus", "=", 2],
      ],
      ["name"],
    );
    for (const si of cancelledOldSIs) {
      try {
        await frappeDelete(
          `/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`,
        );
        step(`  Deleted previously-cancelled SI ${si.name}`);
      } catch (err) {
        step(`  WARNING: Could not delete cancelled SI ${si.name}: ${err}`);
      }
    }
    step(`  Cancelled & deleted ${cancelledSIs} unpaid invoices`);

    // ── Step 2: Cancel & delete old Sales Order ──
    step("Step 2: Cancelling & deleting old Sales Order");
    const oldSOName = transfer.old_sales_order;
    let newSORef = "";
    if (oldSOName) {
      try {
        const soDoc = await frappeGet(
          `/api/resource/Sales Order/${encodeURIComponent(oldSOName)}`,
        );
        if (soDoc.docstatus === 1) {
          await frappePut(
            `/api/resource/Sales Order/${encodeURIComponent(oldSOName)}`,
            { docstatus: 2 },
          );
          step(`  Cancelled SO ${oldSOName}`);
        }
        // Delete the cancelled SO
        await frappeDelete(
          `/api/resource/Sales Order/${encodeURIComponent(oldSOName)}`,
        );
        step(`  Deleted SO ${oldSOName}`);
      } catch (err) {
        step(`  WARNING: Could not cancel/delete SO ${oldSOName}: ${err}`);
      }
    } else {
      step("  No old Sales Order to cancel");
    }

    // ── Step 3: Remove from old Student Group ──
    step("Step 3: Removing student from old batch");
    const oldGroups = await frappeList(
      "Student Group",
      [
        ["group_based_on", "=", "Batch"],
        ["custom_branch", "=", transfer.from_branch],
      ],
      ["name"],
    );
    for (const g of oldGroups) {
      // Fetch full doc to get child table (students)
      const groupDoc = await frappeGet(
        `/api/resource/Student Group/${encodeURIComponent(g.name)}`,
      );
      const members = groupDoc.students || [];
      const hasMember = members.some(
        (m: { student: string }) => m.student === transfer.student,
      );
      if (hasMember) {
        const filtered = members.filter(
          (m: { student: string }) => m.student !== transfer.student,
        );
        await frappePut(
          `/api/resource/Student Group/${encodeURIComponent(g.name)}`,
          { students: filtered },
        );
        step(`  Removed from Student Group ${g.name}`);
      }
    }

    // ── Step 4: Cancel & delete old Course Enrollments ──
    step("Step 4: Cancelling & deleting old Course Enrollments");
    if (transfer.old_program_enrollment) {
      const oldCEs = await frappeList(
        "Course Enrollment",
        [["program_enrollment", "=", transfer.old_program_enrollment]],
        ["name", "docstatus"],
      );
      for (const ce of oldCEs) {
        try {
          if (ce.docstatus === 1) {
            await frappePut(
              `/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`,
              { docstatus: 2 },
            );
            step(`  Cancelled CE ${ce.name}`);
          }
          // Delete regardless (cancel already done or was already cancelled)
          await frappeDelete(
            `/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`,
          );
          step(`  Deleted CE ${ce.name}`);
        } catch (err) {
          step(`  WARNING: Could not cancel/delete CE ${ce.name}: ${err}`);
        }
      }
    } else {
      step("  No old Program Enrollment — skipping CE cancellation");
    }

    // ── Step 5: Cancel & delete old Program Enrollment ──
    step("Step 5: Cancelling & deleting old Program Enrollment");
    if (transfer.old_program_enrollment) {
      try {
        const peDoc = await frappeGet(
          `/api/resource/Program Enrollment/${encodeURIComponent(transfer.old_program_enrollment)}`,
        );
        if (peDoc.docstatus === 1) {
          await frappePut(
            `/api/resource/Program Enrollment/${encodeURIComponent(transfer.old_program_enrollment)}`,
            { docstatus: 2 },
          );
          step(`  Cancelled PE ${transfer.old_program_enrollment}`);
        }
        // Delete the cancelled PE
        await frappeDelete(
          `/api/resource/Program Enrollment/${encodeURIComponent(transfer.old_program_enrollment)}`,
        );
        step(`  Deleted PE ${transfer.old_program_enrollment}`);
      } catch (err) {
        step(`  WARNING: Could not cancel/delete PE: ${err}`);
      }
    }

    // ════════════════════════════════════════════════════════════
    // PHASE 2: SET UP NEW BRANCH
    // ════════════════════════════════════════════════════════════

    // ── Step 6: Update Student record ──
    step("Step 6: Updating student branch");
    await frappePut(
      `/api/resource/Student/${encodeURIComponent(transfer.student)}`,
      {
        custom_branch: transfer.to_branch,
        custom_branch_abbr: newAbbr,
      },
    );
    step(`  Student.custom_branch → ${transfer.to_branch} (${newAbbr})`);

    // ── Step 7a: Find new branch batch (needed before PE creation) ──
    step("Step 7: Finding new branch batch");
    const newGroupsList = await frappeList(
      "Student Group",
      [
        ["group_based_on", "=", "Batch"],
        ["custom_branch", "=", transfer.to_branch],
        ["program", "=", transfer.program],
      ],
      ["name", "student_group_name", "batch", "max_strength"],
    );

    let assignedBatch = "";
    let assignedBatchCode = "";
    let batchFound = false;
    for (const g of newGroupsList) {
      // Fetch full doc to get child table (students)
      const groupDoc = await frappeGet(
        `/api/resource/Student Group/${encodeURIComponent(g.name)}`,
      );
      const members = groupDoc.students || [];
      const capacity = g.max_strength || 60;
      if (members.length < capacity) {
        assignedBatch = g.name;
        assignedBatchCode = g.batch || "";
        batchFound = true;
        step(`  Found batch ${g.student_group_name} (${g.name}, batch code: ${assignedBatchCode})`);
        break;
      }
    }
    if (!batchFound) {
      step("  WARNING: No available batch at new branch");
    }

    // ── Step 7b: Create new Program Enrollment (draft) ──
    step("Step 7b: Creating new Program Enrollment");
    let newPEName = "";
    try {
      const pePayload: Record<string, unknown> = {
        student: transfer.student,
        student_name: transfer.student_name,
        program: transfer.program,
        academic_year: transfer.academic_year,
        enrollment_date: new Date().toISOString().split("T")[0],
        custom_fee_structure: transfer.new_fee_structure || "",
        custom_plan: transfer.new_payment_plan || "",
        custom_no_of_instalments: transfer.new_no_of_instalments || "",
      };
      if (assignedBatchCode) {
        pePayload.student_batch_name = assignedBatchCode;
      }
      const newPE = await frappePost("/api/resource/Program Enrollment", pePayload);
      newPEName = newPE.name;
      step(`  Created PE draft ${newPEName}`);

      // Patch auto-created Course Enrollments with custom_batch_name
      if (assignedBatch) {
        step("  Patching Course Enrollments with batch name");
        const autoCEs = await frappeList(
          "Course Enrollment",
          [["program_enrollment", "=", newPEName]],
          ["name"],
        );
        for (const ce of autoCEs) {
          try {
            await frappePut(
              `/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`,
              { custom_batch_name: assignedBatch },
            );
          } catch (ceErr) {
            step(`  WARNING: Could not set custom_batch_name on ${ce.name}: ${ceErr}`);
          }
        }
        step(`  Patched ${autoCEs.length} Course Enrollments`);
      }

      // Submit the PE
      const peCheck = await frappeGet(
        `/api/resource/Program Enrollment/${encodeURIComponent(newPEName)}?fields=["docstatus"]`,
      );
      if (peCheck.docstatus === 0) {
        await frappePut(
          `/api/resource/Program Enrollment/${encodeURIComponent(newPEName)}`,
          { docstatus: 1 },
        );
      }
      step(`  Submitted PE ${newPEName}`);
    } catch (err) {
      step(`  ERROR creating PE: ${err}`);
      throw new Error(`Failed to create new Program Enrollment: ${err}`);
    }

    // ── Step 8: Add student to new branch batch ──
    step("Step 8: Adding student to batch members");
    if (batchFound) {
      // Fetch full doc to get current members (child table)
      const targetGroupDoc = await frappeGet(
        `/api/resource/Student Group/${encodeURIComponent(assignedBatch)}`,
      );
      const members = targetGroupDoc.students || [];
      if (!members.some((m: { student: string }) => m.student === transfer.student)) {
        const updatedMembers = [
          ...members,
          { student: transfer.student, student_name: transfer.student_name, active: 1 },
        ];
        await frappePut(
          `/api/resource/Student Group/${encodeURIComponent(assignedBatch)}`,
          { students: updatedMembers },
        );
      }
      step(`  Added to batch ${assignedBatch}`);
    } else {
      step("  WARNING: No available batch at new branch — student not assigned to any group");
    }

    // ── Step 9 & 10: Create and submit new Sales Order ──
    step("Step 9: Creating new Sales Order");
    const numInstalments = parseInt(transfer.new_no_of_instalments || "4", 10);
    const adjustedAmount = transfer.adjusted_amount || 0;

    if (adjustedAmount > 0 && customerName) {
      // Look up the class-specific Tuition Fee item
      // Convention: item_code = "{program} Tuition Fee", e.g. "5th Tuition Fee"
      let tuitionItem = "";
      const programName = transfer.program || "";

      // 1. Try exact match: "{programName} Tuition Fee"
      if (programName) {
        const exactCode = `${programName} Tuition Fee`;
        const exactItems = await frappeList(
          "Item",
          [
            ["item_code", "=", exactCode],
            ["is_sales_item", "=", 1],
            ["disabled", "=", 0],
          ],
          ["name", "item_code"],
          { limit: 1 },
        );
        if (exactItems.length > 0) {
          tuitionItem = exactItems[0].item_code;
        } else {
          // 2. Try wildcard: "{programName}%Tuition Fee"
          const likeItems = await frappeList(
            "Item",
            [
              ["item_code", "like", `${programName}%Tuition Fee`],
              ["is_sales_item", "=", 1],
              ["disabled", "=", 0],
            ],
            ["name", "item_code"],
            { limit: 1 },
          );
          if (likeItems.length > 0) {
            tuitionItem = likeItems[0].item_code;
          } else {
            // 3. Fallback: try program abbreviation
            try {
              const progDoc = await frappeGet(
                `/api/resource/Program/${encodeURIComponent(programName)}?fields=["name","program_abbreviation"]`,
              );
              const rawAbbr: string = progDoc?.program_abbreviation || "";
              if (rawAbbr) {
                const abbr = rawAbbr.replace(/\b1-1\b/g, "1 to 1").replace(/\b1-M\b/g, "1 to M");
                const abbrItems = await frappeList(
                  "Item",
                  [
                    ["item_code", "like", `${abbr}%Tuition Fee`],
                    ["is_sales_item", "=", 1],
                    ["disabled", "=", 0],
                  ],
                  ["name", "item_code"],
                  { limit: 10 },
                );
                if (abbrItems.length > 0) {
                  const exact = abbrItems.find((i: { item_code: string }) => i.item_code === `${abbr} Tuition Fee`);
                  tuitionItem = exact ? exact.item_code : abbrItems[0].item_code;
                }
              }
            } catch {
              step("  WARNING: Could not look up program abbreviation for item resolution");
            }
          }
        }
      }

      if (!tuitionItem) {
        throw new Error(
          `No tuition fee item found for program "${programName}". ` +
          `Expected an Item like "${programName} Tuition Fee" in the backend.`,
        );
      }
      step(`  Resolved tuition item: ${tuitionItem}`);

      // Get the receivable account for the new company
      const debitorsRes = await frappeList(
        "Account",
        [
          ["company", "=", transfer.to_branch],
          ["account_type", "=", "Receivable"],
          ["is_group", "=", 0],
        ],
        ["name"],
        { limit: 1 },
      );
      const debitTo = debitorsRes[0]?.name || "";

      // Use raw division for SO rate — same as admission flow.
      // Frappe rounds qty × rate server-side to the exact total.
      const soRate = adjustedAmount / numInstalments;

      const soPayload = {
        customer: customerName,
        company: transfer.to_branch,
        transaction_date: new Date().toISOString().split("T")[0],
        delivery_date: new Date().toISOString().split("T")[0],
        student: transfer.student,
        custom_academic_year: transfer.academic_year,
        custom_plan: transfer.new_payment_plan || "",
        custom_no_of_instalments: String(numInstalments),
        ...(debitTo ? { debit_to: debitTo } : {}),
        items: [
          {
            item_code: tuitionItem,
            qty: numInstalments,
            rate: soRate,
          },
        ],
      };

      const newSO = await frappePost("/api/resource/Sales Order", soPayload);
      newSORef = newSO.name;
      step(`  Created SO ${newSORef} (${adjustedAmount} in ${numInstalments} instalments)`);

      // Submit the SO
      step("Step 10: Submitting new Sales Order");
      await frappePut(
        `/api/resource/Sales Order/${encodeURIComponent(newSORef)}`,
        { docstatus: 1 },
      );
      step(`  Submitted SO ${newSORef}`);

      // ── Step 11: Create Sales Invoices ──
      step("Step 11: Creating Sales Invoices");

      // Use fee config for proper per-instalment amounts (proportionally scaled)
      const schedule = generateInstalmentScheduleForTransfer(
        adjustedAmount,
        numInstalments,
        transfer.academic_year,
        transfer.to_branch,
        transfer.program,
        transfer.new_payment_plan,
      );
      step(`  Schedule: ${schedule.map(s => s.label + '=' + s.amount).join(', ')}`);

      // Fetch SO item details for proper linking
      const soDoc = await frappeGet(
        `/api/resource/Sales Order/${encodeURIComponent(newSORef)}`,
      );
      const soItem = soDoc.items?.[0];

      const createdSIs: string[] = [];
      for (let i = 0; i < schedule.length; i++) {
        const inst = schedule[i];
        try {
          const siPayload = {
            doctype: "Sales Invoice",
            customer: customerName,
            company: transfer.to_branch,
            posting_date: inst.dueDate,
            due_date: inst.dueDate,
            student: transfer.student,
            custom_academic_year: transfer.academic_year,
            items: [
              {
                item_code: soItem?.item_code || tuitionItem,
                item_name: soItem?.item_name || tuitionItem,
                description: `${inst.label} — Transfer from ${transfer.from_branch}`,
                qty: 1,
                rate: inst.amount,
                amount: inst.amount,
                sales_order: newSORef,
                so_detail: soItem?.name || "",
              },
            ],
          };

          const si = await frappePost("/api/resource/Sales Invoice", siPayload);
          // Submit the SI
          await frappePut(
            `/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`,
            { docstatus: 1 },
          );
          createdSIs.push(si.name);
          step(`  Created & submitted SI ${si.name} (${inst.label}: ${inst.amount})`);
        } catch (err) {
          step(`  WARNING: Failed to create SI for ${inst.label}: ${err}`);
        }
      }
      step(`  Created ${createdSIs.length}/${schedule.length} invoices`);
    } else {
      step("  No adjusted amount — skipping SO/SI creation");
    }

    // ════════════════════════════════════════════════════════════
    // PHASE 3: FINALIZE
    // ════════════════════════════════════════════════════════════

    // ── Step 12: Update transfer record ──
    step("Step 12: Updating transfer record to Completed");
    await frappePut(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transferId)}`,
      {
        status: "Completed",
        new_sales_order: newSORef,
        new_program_enrollment: newPEName,
        completion_date: new Date().toISOString().split("T")[0],
        transfer_log: log.join("\n"),
      },
    );

    // ── Step 13: Create notification ──
    step("Step 13: Transfer completed successfully");

    try {
      await frappePost("/api/resource/Notification Log", {
        subject: `Branch Transfer Completed: ${transfer.student_name}`,
        email_content: `Student ${transfer.student_name} has been transferred from ${transfer.from_branch} to ${transfer.to_branch}.`,
        for_user: transfer.requested_by,
        type: "Alert",
      });
    } catch {
      step("  WARNING: Could not create notification");
    }

    return NextResponse.json({
      success: true,
      transfer_id: transferId,
      new_sales_order: newSORef,
      new_program_enrollment: newPEName,
      assigned_batch: assignedBatch,
      log,
    });
  } catch (err) {
    console.error("[transfer/execute] FATAL:", err);

    // Mark transfer as failed if we have the ID
    if (transferId) {
      try {
        await frappePut(
          `/api/resource/Student Branch Transfer/${encodeURIComponent(transferId)}`,
          {
            status: "Failed",
            transfer_log: [...log, `FATAL: ${err}`].join("\n"),
          },
        );
      } catch {
        // Can't even update the record
      }
    }

    return NextResponse.json(
      {
        error: `Transfer execution failed: ${err instanceof Error ? err.message : String(err)}`,
        log,
      },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Schedule helper for transfers
// Uses the XLSX fee config for proper per-instalment amounts
// (proportionally scaled by credit). Falls back to equal splits
// if the fee config entry is not found.
// ─────────────────────────────────────────────────────────────

function generateInstalmentScheduleForTransfer(
  adjustedAmount: number,
  instalments: number,
  academicYear: string,
  toBranch: string,
  program: string,
  plan: string,
): { label: string; amount: number; dueDate: string }[] {
  const totalInt = Math.round(adjustedAmount);

  // Try to look up XLSX fee config for proper per-instalment amounts
  const configKey = buildFeeConfigKey(toBranch, program, plan);
  const config = configKey ? feeConfig[configKey] : null;
  const planTotal = config ? getOptionTotal(config, instalments) : 0;

  if (config && planTotal > 0) {
    // ── Fee-config-based proportional scaling ──
    const originalSchedule = generateInstalmentSchedule(config, instalments, academicYear);
    if (originalSchedule.length > 0) {
      const ratio = totalInt / planTotal;
      const scaled = originalSchedule.map(entry => Math.round(entry.amount * ratio));
      // Last instalment absorbs rounding remainder
      const sumSoFar = scaled.reduce((s, a) => s + a, 0);
      scaled[scaled.length - 1] += totalInt - sumSoFar;

      return originalSchedule.map((entry, i) => ({
        label: entry.label,
        amount: scaled[i],
        dueDate: entry.dueDate,
      }));
    }
  }

  // ── Fallback: equal integer splits with standard due dates ──
  if (instalments === 1) {
    return [{
      label: "Full Payment",
      amount: totalInt,
      dueDate: new Date().toISOString().split("T")[0],
    }];
  }

  const perInstalment = Math.floor(totalInt / instalments);
  const lastAmount = totalInt - perInstalment * (instalments - 1);

  const stubConfig: FeeConfigEntry = {
    branch: "", plan: "", class: "",
    early_bird: 0, annual_fee: totalInt, otp: totalInt,
    quarterly_total: totalInt,
    q1: perInstalment, q2: perInstalment, q3: perInstalment, q4: lastAmount,
    inst6_total: totalInt, inst6_per: perInstalment, inst6_last: lastAmount,
    inst8_total: totalInt, inst8_per: perInstalment, inst8_last: lastAmount,
  };

  const schedule = generateInstalmentSchedule(stubConfig, instalments, academicYear);
  return schedule.map((entry, i) => ({
    label: entry.label,
    amount: i < instalments - 1 ? perInstalment : lastAmount,
    dueDate: entry.dueDate,
  }));
}
