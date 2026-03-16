import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/utils/email";
import { sendTemplate } from "@/lib/utils/whatsapp";

/**
 * POST /api/auth/send-student-welcome
 *
 * Sends an enrollment confirmation email to a newly enrolled student.
 * Skips sending for @dummy.com auto-generated emails.
 *
 * Body: { email, full_name, student_id, program, branch, phone }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, full_name, student_id, program, branch, phone } =
      await req.json();

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "email and full_name are required" },
        { status: 400 }
      );
    }

    // Don't send welcome emails to auto-generated dummy addresses
    if (email.endsWith("@dummy.com")) {
      console.log(
        `[send-student-welcome] Skipping email for dummy address: ${email}`
      );
      return NextResponse.json({
        message: "Skipped — dummy email address",
        skipped: true,
      });
    }

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Welcome to SmartUp!</h2>
        <p>Dear <strong>${full_name}</strong>,</p>
        <p>Congratulations! You have been successfully enrolled${program ? ` in <strong>${program}</strong>` : ""}${branch ? ` at <strong>SmartUp ${branch}</strong>` : ""}.</p>
        <p>We are excited to have you on board. Below are your enrollment details for your reference.</p>

        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #171717;">Your Enrollment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${student_id ? `<tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">Student ID:</td>
              <td style="padding: 8px 0;"><strong>${student_id}</strong></td>
            </tr>` : ""}
            ${program ? `<tr>
              <td style="padding: 8px 0; color: #666;">Program:</td>
              <td style="padding: 8px 0;"><strong>${program}</strong></td>
            </tr>` : ""}
            ${branch ? `<tr>
              <td style="padding: 8px 0; color: #666;">Branch:</td>
              <td style="padding: 8px 0;"><strong>SmartUp ${branch}</strong></td>
            </tr>` : ""}
          </table>
        </div>

        <p>If you have any questions or need assistance, please feel free to reach out to your branch administration.</p>

        <p style="margin-top: 30px;">
          Thank you,<br>
          <strong>SmartUp Team</strong>
        </p>
      </div>
    `;

    // Send directly via SMTP (nodemailer) — non-blocking, WhatsApp fires regardless
    let emailSent = false;
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to SmartUp — Enrollment Confirmed",
        html: emailBody,
      });
      emailSent = true;
      console.log(`[send-student-welcome] Welcome email sent to ${email}`);
    } catch (emailErr) {
      console.warn("[send-student-welcome] Email failed (non-blocking):", (emailErr as Error).message);
    }

    // WhatsApp enrollment confirmation (non-blocking, approved smartup_student_onboard template)
    if (phone) {
      sendTemplate({
        to: phone,
        templateName: "smartup_student_onboard",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: full_name },
              { type: "text", text: program || "—" },
              { type: "text", text: branch || "—" },
              { type: "text", text: student_id || "—" },
            ],
          },
        ],
      }).catch((err) => console.warn("[send-student-welcome] WhatsApp failed:", err));
    }

    return NextResponse.json({
      message: "Student welcome notification sent",
      sent: true,
      email: emailSent,
      whatsapp: !!phone,
    });
  } catch (error: unknown) {
    console.error("[send-student-welcome] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
