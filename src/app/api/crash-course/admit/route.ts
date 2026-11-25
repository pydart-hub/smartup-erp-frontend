import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import {
  frappeAdminGet,
  frappeAdminPost,
  frappeAdminPut,
} from "@/lib/server/frappeAdmin";
import { crashCourseAdmissionSchema } from "@/lib/validators/crashCourseAdmission";
import {
  calculateCrashCourseFee,
  MAX_BATCH_CAPACITY,
} from "@/lib/utils/crashCoursePricing";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseClass,
  type CrashCourseAdmissionResult,
} from "@/lib/types/crashCourse";
import { executeCreateInvoices } from "@/lib/services/invoiceService";

const PROGRAM_MAP: Record<CrashCourseClass, string> = {
  "9th": "9th State",
  "10th": "10th State",
  "Plus One": "11th Science State",
  "Plus Two": "12th Science State",
};

const CLASS_ABBR_MAP: Record<CrashCourseClass, string> = {
  "9th": "9",
  "10th": "10",
  "Plus One": "P1",
  "Plus Two": "P2",
};

const BRANCH_STUDENT_BATCH_MAP: Record<string, string> = {
  "Smart Up Palluruthy": "Palluruthy 26-27",
  "Smart Up Thopumpadi": "Thopumpadi 26-27",
  "Smart Up Fortkochi": "Fortkochi 26-27",
  "Palluruthy": "Palluruthy 26-27",
  "Thoppumpady": "Thopumpadi 26-27",
  "Fort Kochi": "Fortkochi 26-27",
};

function getBranchConfig(branchNameOrCompany: string) {
  return CRASH_COURSE_BRANCHES.find(
    (b) =>
      b.company.toLowerCase() === branchNameOrCompany.toLowerCase() ||
      b.label.toLowerCase() === branchNameOrCompany.toLowerCase()
  );
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const rawBody = await request.json();
    const validation = crashCourseAdmissionSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const form = validation.data;
    const branchCfg = getBranchConfig(form.branch);
    const branchCompany = branchCfg?.company || form.branch;
    const branchAbbr = branchCfg?.abbr || "BR";

    // 1. Calculate pricing breakdown
    const breakdown = calculateCrashCourseFee({
      classLevel: form.class_level,
      selectedLanguages: form.selected_languages,
    });

    const today = new Date().toISOString().split("T")[0];

    // 2. Stage 1 — Guardian Lookup or Creation
    let guardianDocName = "";
    try {
      const gLookup = await frappeAdminGet("resource/Guardian", {
        filters: JSON.stringify([
          ["mobile_number", "=", form.guardian_mobile],
        ]),
        limit_page_length: "1",
      });
      if (gLookup.data && gLookup.data.length > 0) {
        guardianDocName = gLookup.data[0].name;
      }
    } catch {
      // Continue to create
    }

    if (!guardianDocName) {
      const gCreate = await frappeAdminPost("resource/Guardian", {
        guardian_name: form.guardian_name,
        email_address: form.guardian_email,
        mobile_number: form.guardian_mobile,
      });
      guardianDocName = gCreate.data.name;
    }

    // 3. Stage 1.5 — Optional Parent User Creation
    if (form.guardian_password) {
      try {
        await frappeAdminPost("resource/User", {
          email: form.guardian_email,
          first_name: form.guardian_name,
          new_password: form.guardian_password,
          roles: [{ role: "Parent" }],
          send_welcome_email: 0,
        });
      } catch {
        // User may already exist — ignore collision
      }
    }

    // 4. Stage 2 — SRR ID & Student Creation
    let srrId = "001";
    try {
      const lastStu = await frappeAdminGet("resource/Student", {
        fields: JSON.stringify(["custom_srr_id"]),
        filters: JSON.stringify([["custom_branch", "=", branchCompany]]),
        order_by: "creation desc",
        limit_page_length: "1",
      });
      if (lastStu.data && lastStu.data.length > 0) {
        const lastVal = parseInt(lastStu.data[0].custom_srr_id, 10);
        if (!isNaN(lastVal)) {
          srrId = String(lastVal + 1).padStart(3, "0");
        }
      }
    } catch {
      srrId = "001";
    }

    const cleanFirst = form.first_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = (form.last_name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const autoEmail = `${cleanFirst}${cleanLast}.${branchAbbr.toLowerCase()}.${srrId}@dummy.com`;
    const effectiveEmail = form.student_email_id || autoEmail;

    const studentPayload = {
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      student_email_id: effectiveEmail,
      student_mobile_number: form.student_mobile_number || undefined,
      joining_date: today,
      custom_branch: branchCompany,
      custom_srr_id: srrId,
      custom_aadhaar: form.aadhaar_number || undefined,
      custom_school_name: form.custom_school_name || undefined,
      custom_place: form.custom_place || undefined,
      enabled: 1,
      guardians: [
        {
          doctype: "Student Guardians",
          guardian: guardianDocName,
          guardian_name: form.guardian_name,
          relation: form.guardian_relation,
        },
      ],
    };

    const studentRes = await frappeAdminPost("resource/Student", studentPayload);
    const student = studentRes.data;

    // Read back student to get customer link (with retries for asynchronous Frappe hook)
    let customerName = student.customer;
    for (let attempt = 0; attempt < 3 && !customerName; attempt++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const readBack = await frappeAdminGet(
          `resource/Student/${encodeURIComponent(student.name)}`
        );
        customerName = readBack.data?.customer;
      } catch {
        // continue retry
      }
    }

    const studentFullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

    // If still no customer linked, find or create one explicitly
    if (!customerName) {
      try {
        const custRes = await frappeAdminGet("resource/Customer", {
          filters: JSON.stringify([
            ["customer_name", "=", studentFullName],
          ]),
          limit_page_length: "1",
        });
        if (custRes.data && custRes.data.length > 0) {
          customerName = custRes.data[0].name;
        } else {
          const createCust = await frappeAdminPost("resource/Customer", {
            customer_name: studentFullName,
            customer_type: "Individual",
            customer_group: "Student",
            mobile_no: form.student_mobile_number || form.guardian_mobile,
            email_id: effectiveEmail,
          });
          customerName = createCust.data?.name;
        }

        // Link customer back to Student
        if (customerName) {
          await frappeAdminPut(
            `resource/Student/${encodeURIComponent(student.name)}`,
            { customer: customerName }
          );
        }
      } catch (custErr) {
        console.warn("[crash-course/admit] Customer resolution warning:", custErr);
      }
    }

    // 5. Ensure "Crash Course" Student Category exists
    try {
      await frappeAdminPost("resource/Student Category", {
        name: "Crash Course",
        category: "Crash Course",
      });
    } catch {
      // Ignore if category already exists
    }

    // 6. Stage 3 — Program Enrollment
    const programName = PROGRAM_MAP[form.class_level] || "10th State";
    const classAbbr = CLASS_ABBR_MAP[form.class_level] || "10";
    const defaultBatchName = `CC-2026-${classAbbr}-${branchAbbr}-B1`;
    let targetBatchName = form.batch_name || defaultBatchName;

    // student_batch_name on Program Enrollment links to Student Batch Name (e.g. "Palluruthy 26-27")
    const validStudentBatchName =
      BRANCH_STUDENT_BATCH_MAP[branchCompany] ||
      BRANCH_STUDENT_BATCH_MAP[form.branch];

    const pePayload: Record<string, unknown> = {
      student: student.name,
      program: programName,
      academic_year: form.academic_year || "2026-2027",
      enrollment_date: today,
      student_category: "Crash Course",
      ...(validStudentBatchName ? { student_batch_name: validStudentBatchName } : {}),
    };

    const peRes = await frappeAdminPost("resource/Program Enrollment", pePayload);
    const pe = peRes.data;

    // Submit Program Enrollment
    try {
      await frappeAdminPut(
        `resource/Program Enrollment/${encodeURIComponent(pe.name)}`,
        { docstatus: 1 }
      );
    } catch {
      // Continue even if already submitted
    }

    // 7. Stage 4 — Student Group (Batch) Assignment with 50-student capacity guard
    let assignedBatch = targetBatchName;
    try {
      // Check existing batch details
      let batchDoc: any = null;
      try {
        const checkRes = await frappeAdminGet(
          `resource/Student Group/${encodeURIComponent(targetBatchName)}`
        );
        batchDoc = checkRes.data;
      } catch {
        // Batch doesn't exist yet, auto-create Batch 1
        const createGroupRes = await frappeAdminPost("resource/Student Group", {
          student_group_name: targetBatchName,
          group_based_on: "Batch",
          program: programName,
          academic_year: form.academic_year || "2026-2027",
          custom_branch: branchCompany,
          max_strength: MAX_BATCH_CAPACITY,
          students: [],
        });
        batchDoc = createGroupRes.data;
      }

      // Check if batch is full (>= 50)
      const currentStudents = batchDoc?.students || [];
      if (currentStudents.length >= MAX_BATCH_CAPACITY) {
        // Batch 1 is full, move to Batch 2
        assignedBatch = `CC-2026-${classAbbr}-${branchAbbr}-B2`;
        try {
          const b2Check = await frappeAdminGet(
            `resource/Student Group/${encodeURIComponent(assignedBatch)}`
          );
          batchDoc = b2Check.data;
        } catch {
          const createB2 = await frappeAdminPost("resource/Student Group", {
            student_group_name: assignedBatch,
            group_based_on: "Batch",
            program: programName,
            academic_year: form.academic_year || "2026-2027",
            custom_branch: branchCompany,
            max_strength: MAX_BATCH_CAPACITY,
            students: [],
          });
          batchDoc = createB2.data;
        }
      }

      const docNameToUpdate = batchDoc?.name || assignedBatch;

      // Add student to the batch
      const existingMembers = batchDoc?.students || [];
      if (!existingMembers.some((m: any) => m.student === student.name)) {
        const updatedStudents = [
          ...existingMembers,
          {
            student: student.name,
            student_name: [form.first_name, form.last_name].filter(Boolean).join(" "),
            active: 1,
          },
        ];

        await frappeAdminPut(
          `resource/Student Group/${encodeURIComponent(docNameToUpdate)}`,
          { students: updatedStudents }
        );
      }
    } catch (batchErr) {
      console.warn("[crash-course/admit] Batch assignment warning:", batchErr);
    }

    // 8. Stage 5 & 6 — Sales Order & Invoicing
    let salesOrderName = "";
    let createdInvoiceName = "";
    let whatsappSent = false;

    if (customerName) {
      // Resolve tuition item code
      let itemCode = `${programName} Tuition Fee`;
      try {
        const itemRes = await frappeAdminGet("resource/Item", {
          filters: JSON.stringify([
            ["item_code", "=", `${programName} Tuition Fee`],
            ["is_sales_item", "=", 1],
          ]),
          limit_page_length: "1",
        });
        if (itemRes.data && itemRes.data.length > 0) {
          itemCode = itemRes.data[0].item_code;
        } else {
          // Wildcard search
          const likeRes = await frappeAdminGet("resource/Item", {
            filters: JSON.stringify([
              ["item_code", "like", `%${form.class_level.split(" ")[0]}%Tuition Fee%`],
              ["is_sales_item", "=", 1],
            ]),
            limit_page_length: "1",
          });
          if (likeRes.data && likeRes.data.length > 0) {
            itemCode = likeRes.data[0].item_code;
          }
        }
      } catch {
        itemCode = "10th State Tuition Fee";
      }

      const description = `SmartUp Crash Course 2026-27 (${form.class_level}) - Course Fee: ₹${breakdown.courseFee} + Exam & Materials: ₹${breakdown.examMaterialsFee}${
        breakdown.languageFee > 0
          ? ` + Sunday Languages (${breakdown.selectedLanguages.join(", ")}): ₹${breakdown.languageFee}`
          : ""
      }`;

      // Create Sales Order (Note: custom_plan is omitted because Frappe validates it to empty/Basic/Inter/Adv)
      const soPayload = {
        customer: customerName,
        company: branchCompany,
        transaction_date: today,
        delivery_date: today,
        order_type: "Sales",
        custom_academic_year: form.academic_year || "2026-2027",
        student: student.name,
        custom_no_of_instalments: "1",
        items: [
          {
            item_code: itemCode,
            qty: 1,
            rate: breakdown.grandTotal,
            description,
          },
        ],
      };

      try {
        const soRes = await frappeAdminPost("resource/Sales Order", soPayload);
        salesOrderName = soRes.data.name;

        // Submit Sales Order
        await frappeAdminPut(
          `resource/Sales Order/${encodeURIComponent(salesOrderName)}`,
          { docstatus: 1 }
        );

        // Generate Invoice using invoiceService
        const invResult = await executeCreateInvoices(salesOrderName, [
          {
            amount: breakdown.grandTotal,
            dueDate: today,
            label: `SmartUp Crash Course 2026-27 (${form.class_level}) Fee`,
          },
        ]);

        if (invResult.success && invResult.invoices.length > 0) {
          createdInvoiceName = invResult.invoices[0];
          whatsappSent = Boolean(invResult.whatsappSent);
        } else if (invResult.error) {
          console.error("[crash-course/admit] Invoice generation error:", invResult.error);
        }
      } catch (billingErr: any) {
        console.error("[crash-course/admit] Billing error:", billingErr?.message || billingErr);
      }
    } else {
      console.error("[crash-course/admit] Cannot generate SO/SI: No customer linked for student", student.name);
    }

    // 9. Stage 7 — Optional Initial Payment Entry
    let paymentEntryName = "";
    if (
      createdInvoiceName &&
      form.paid_amount &&
      form.paid_amount > 0 &&
      customerName
    ) {
      try {
        const pePayload = {
          payment_type: "Receive",
          party_type: "Customer",
          party: customerName,
          paid_amount: form.paid_amount,
          received_amount: form.paid_amount,
          mode_of_payment: form.payment_mode || "Cash",
          posting_date: today,
          company: branchCompany,
          reference_no: form.payment_reference || `CC-${srrId}`,
          reference_date: today,
          remarks: `SmartUp Crash Course initial payment for ${form.first_name} (${student.name})`,
          references: [
            {
              reference_doctype: "Sales Invoice",
              reference_name: createdInvoiceName,
              allocated_amount: form.paid_amount,
            },
          ],
        };

        const peResult = await frappeAdminPost(
          "resource/Payment Entry",
          pePayload
        );
        paymentEntryName = peResult.data?.name || "";

        // Submit Payment Entry
        if (paymentEntryName) {
          await frappeAdminPut(
            `resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`,
            { docstatus: 1 }
          );
        }
      } catch (payErr) {
        console.warn("[crash-course/admit] Payment entry warning:", payErr);
      }
    }

    const responseData: CrashCourseAdmissionResult = {
      success: true,
      student_id: student.name,
      student_name: [form.first_name, form.last_name].filter(Boolean).join(" "),
      srr_id: srrId,
      program_enrollment: pe.name,
      student_group: assignedBatch,
      sales_order: salesOrderName || undefined,
      invoice: createdInvoiceName || undefined,
      payment_entry: paymentEntryName || undefined,
      breakdown,
      whatsapp_sent: whatsappSent,
    };

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("[crash-course/admit] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during Crash Course admission",
      },
      { status: 500 }
    );
  }
}
