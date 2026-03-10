import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/utils/email";
import { sendTemplate } from "@/lib/utils/whatsapp";

/**
 * POST /api/auth/send-student-welcome
 *
 * Sends a welcome email to a newly enrolled student with their login credentials.
 * Skips sending for @dummy.com auto-generated emails.
 *
 * Body: { email, full_name, student_id, program, branch, password }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, full_name, student_id, program, branch, password, phone } =
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

    const loginUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      "https://smartuplearning.net";

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Welcome to SmartUp Student Portal</h2>
        <p>Dear <strong>${full_name}</strong>,</p>
        <p>Congratulations! You have been successfully enrolled${program ? ` in <strong>${program}</strong>` : ""}${branch ? ` at <strong>${branch}</strong>` : ""}.</p>
        <p>A student account has been created for you to access the SmartUp learning portal.</p>
        
        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #171717;">Your Account Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Login URL:</td>
              <td style="padding: 8px 0;"><a href="${loginUrl}/auth/login" style="color: #2d95f0;">${loginUrl}/auth/login</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0;"><strong>${email}</strong></td>
            </tr>
            ${student_id ? `<tr>
              <td style="padding: 8px 0; color: #666;">Student ID:</td>
              <td style="padding: 8px 0;"><strong>${student_id}</strong></td>
            </tr>` : ""}
            ${password ? `<tr>
              <td style="padding: 8px 0; color: #666;">Password:</td>
              <td style="padding: 8px 0;"><strong>${password}</strong></td>
            </tr>` : ""}
          </table>
        </div>

        ${password ? `<p style="color: #e53e3e; font-size: 13px;"><strong>Important:</strong> Please change your password after your first login for security.</p>` : ""}
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}/auth/login" style="display: inline-block; background-color: #2d95f0; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600;">Login to SmartUp</a>
        </div>

        <p style="color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser: ${loginUrl}/auth/login</p>
        
        <p>If you have any questions, please contact your school administration.</p>
        
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
        subject: "Welcome to SmartUp Student Portal — Your Login Details",
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
