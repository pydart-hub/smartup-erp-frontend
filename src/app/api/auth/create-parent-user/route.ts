import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { sendEmail } from "@/lib/utils/email";
import { sendTemplate } from "@/lib/utils/whatsapp";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/auth/create-parent-user
 *
 * Creates a Frappe User with the "Parent" role for guardian login.
 * Uses admin credentials since normal users can't create User docs.
 *
 * Body: { email, full_name, password }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: require staff role (BM / Admin / Director)
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { email, full_name, password, phone, student_name, program, branch } = body;

    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: "email, full_name, and password are required" },
        { status: 400 }
      );
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 0. Ensure the "Parent" role exists in Frappe
    //    Frappe validates that roles referenced in Has Role child table exist.
    const roleCheckRes = await fetch(
      `${FRAPPE_URL}/api/resource/Role/Parent`,
      {
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );
    if (!roleCheckRes.ok) {
      // Role doesn't exist — create it
      const createRoleRes = await fetch(`${FRAPPE_URL}/api/resource/Role`, {
        method: "POST",
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctype: "Role",
          role_name: "Parent",
          desk_access: 0,
          is_custom: 1,
        }),
        cache: "no-store",
      });
      if (!createRoleRes.ok) {
        const roleErr = await createRoleRes.text();
        console.error("[create-parent-user] Failed to create Parent role:", roleErr);
        return NextResponse.json(
          { error: "Failed to create Parent role in Frappe", details: roleErr },
          { status: createRoleRes.status }
        );
      }
      console.log("[create-parent-user] Created 'Parent' role in Frappe");
    }

    // 1. Check if user already exists
    const existsRes = await fetch(
      `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (existsRes.ok) {
      // User already exists — add "Parent" role if missing
      const existingUser = await existsRes.json();
      const existingRoles: string[] = (existingUser.data?.roles || []).map(
        (r: { role: string }) => r.role
      );

      if (!existingRoles.includes("Parent")) {
        // Append the Parent role
        await fetch(
          `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            headers: {
              Authorization: adminAuth,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roles: [
                ...existingUser.data.roles,
                { doctype: "Has Role", role: "Parent" },
              ],
            }),
            cache: "no-store",
          }
        );
      }

      // Still send enrollment notification even for existing users
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL
        || process.env.VERCEL_URL
        || "https://smartuplearning.net";

      if (phone) {
        sendTemplate({
          to: phone,
          templateName: "smartup_user_setup",
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: full_name },
                { type: "text", text: "Parent" },
                { type: "text", text: loginUrl },
                { type: "text", text: email },
              ],
            },
          ],
        }).catch((err) => console.warn("[create-parent-user] WhatsApp failed (existing user):", err));
      }

      return NextResponse.json({
        message: "User already exists — Parent role ensured",
        user: email,
        existed: true,
      });
    }

    // 2. Create new Frappe User with "Parent" role
    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || full_name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const userPayload: Record<string, unknown> = {
      doctype: "User",
      email,
      first_name: firstName,
      last_name: lastName,
      new_password: password,
      send_welcome_email: 0,
      enabled: 1,
      user_type: "Website User",
      roles: [{ doctype: "Has Role", role: "Parent" }],
    };

    const createRes = await fetch(`${FRAPPE_URL}/api/resource/User`, {
      method: "POST",
      headers: {
        Authorization: adminAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userPayload),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const errData = await createRes.text();
      console.error("[create-parent-user] Frappe error:", errData);
      return NextResponse.json(
        { error: "Failed to create parent user", details: errData },
        { status: createRes.status }
      );
    }

    const userData = await createRes.json();

    // Explicitly set password via set_value — new_password in creation payload
    // does not reliably work on Frappe Cloud for Website Users
    try {
      const setPwdRes = await fetch(
        `${FRAPPE_URL}/api/method/frappe.client.set_value`,
        {
          method: "POST",
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctype: "User",
            name: email,
            fieldname: "new_password",
            value: password,
          }),
          cache: "no-store",
        }
      );
      if (!setPwdRes.ok) {
        console.warn("[create-parent-user] set_value for password failed:", setPwdRes.status);
      } else {
        console.log(`[create-parent-user] Password set successfully for ${email}`);
      }
    } catch (pwdErr) {
      console.warn("[create-parent-user] Password set_value failed:", pwdErr);
    }

    // ── Send login credentials email to parent ──────────────────
    try {
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL
        || process.env.VERCEL_URL
        || "https://smartuplearning.net";

      const emailBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #171717;">Welcome to SmartUp Parent Portal</h2>
          <p>Dear <strong>${full_name}</strong>,</p>
          <p>Your child${student_name ? ` <strong>${student_name}</strong>` : ""} has been successfully enrolled${program ? ` in <strong>${program}</strong>` : ""}${branch ? ` at <strong>SmartUp ${branch}</strong>` : ""}. A parent portal account has been created for you to track your child's academic progress, fees, and attendance.</p>

          ${(student_name || program || branch) ? `
          <div style="background-color: #eef6ff; border-left: 4px solid #2d95f0; border-radius: 4px; padding: 14px 18px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #1a56a0; font-weight: 600;">Enrollment Summary</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
              ${student_name ? `<tr><td style="padding: 4px 0; color: #555; width: 120px; font-size: 13px;">Student:</td><td style="padding: 4px 0; font-size: 13px;"><strong>${student_name}</strong></td></tr>` : ""}
              ${program ? `<tr><td style="padding: 4px 0; color: #555; font-size: 13px;">Program:</td><td style="padding: 4px 0; font-size: 13px;"><strong>${program}</strong></td></tr>` : ""}
              ${branch ? `<tr><td style="padding: 4px 0; color: #555; font-size: 13px;">Branch:</td><td style="padding: 4px 0; font-size: 13px;"><strong>SmartUp ${branch}</strong></td></tr>` : ""}
            </table>
          </div>` : ""}

          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #171717;">Your Login Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 120px;">Login URL:</td>
                <td style="padding: 8px 0;"><a href="${loginUrl}/auth/login" style="color: #2d95f0;">${loginUrl}/auth/login</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Email:</td>
                <td style="padding: 8px 0;"><strong>${email}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Password:</td>
                <td style="padding: 8px 0;"><strong>${password}</strong></td>
              </tr>
            </table>
          </div>

          <p style="color: #e53e3e; font-size: 13px;"><strong>Important:</strong> Please change your password after your first login for security.</p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}/auth/login" style="display: inline-block; background-color: #2d95f0; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600;">Login to Parent Portal</a>
          </div>

          <p style="color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser: ${loginUrl}/auth/login</p>

          <p>If you have any questions, please contact the school administration.</p>

          <p style="margin-top: 30px;">
            Thank you,<br>
            <strong>SmartUp Team</strong>
          </p>
        </div>
      `;

      // Send directly via SMTP (nodemailer) — independent of WhatsApp
      try {
        await sendEmail({
          to: email,
          subject: "Welcome to SmartUp Parent Portal",
          html: emailBody,
        });
        console.log(`[create-parent-user] Login credentials email sent to ${email}`);
      } catch (emailError) {
        // Non-blocking — user creation already succeeded
        console.warn("[create-parent-user] Email sending failed (non-blocking):", emailError);
      }

      // WhatsApp portal notification (independent of email, non-blocking)
      if (phone) {
        sendTemplate({
          to: phone,
          templateName: "smartup_user_setup",
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: full_name },
                { type: "text", text: "Parent" },
                { type: "text", text: loginUrl },
                { type: "text", text: email },
              ],
            },
          ],
        }).catch((err) => console.warn("[create-parent-user] WhatsApp failed:", err));
      }
    } catch (outerErr) {
      // Non-blocking — user creation already succeeded, notification setup failed
      console.warn("[create-parent-user] Notification setup failed (non-blocking):", outerErr);
    }

    return NextResponse.json({
      message: "Parent user created successfully",
      user: userData.data?.name || email,
      existed: false,
    });
  } catch (error: unknown) {
    console.error("[create-parent-user] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
