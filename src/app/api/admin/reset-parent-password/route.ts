import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * Ensures the custom_portal_password field exists on Guardian doctype.
 * Idempotent — safe to call multiple times.
 */
async function ensureCustomField(adminAuth: string) {
  const fieldName = "custom_portal_password";
  const checkRes = await fetch(
    `${FRAPPE_URL}/api/resource/Custom Field/${encodeURIComponent(`Guardian-${fieldName}`)}`,
    { headers: { Authorization: adminAuth }, cache: "no-store" },
  );
  if (checkRes.ok) return; // already exists

  await fetch(`${FRAPPE_URL}/api/resource/Custom Field`, {
    method: "POST",
    headers: { Authorization: adminAuth, "Content-Type": "application/json" },
    body: JSON.stringify({
      doctype: "Custom Field",
      dt: "Guardian",
      fieldname: fieldName,
      label: "Portal Password",
      fieldtype: "Data",
      insert_after: "email_address",
      hidden: 1,
    }),
    cache: "no-store",
  });
}

/**
 * Saves the portal password to the Guardian doc found by email.
 */
async function savePasswordToGuardian(
  adminAuth: string,
  email: string,
  password: string,
) {
  // Find Guardian by email_address
  const guardianRes = await fetch(
    `${FRAPPE_URL}/api/resource/Guardian?filters=${encodeURIComponent(
      JSON.stringify([["email_address", "=", email]]),
    )}&fields=["name"]&limit_page_length=1`,
    { headers: { Authorization: adminAuth }, cache: "no-store" },
  );
  if (!guardianRes.ok) return;

  const guardianData = await guardianRes.json();
  const guardianName = guardianData.data?.[0]?.name;
  if (!guardianName) return;

  // Save password to custom field
  await fetch(`${FRAPPE_URL}/api/method/frappe.client.set_value`, {
    method: "POST",
    headers: { Authorization: adminAuth, "Content-Type": "application/json" },
    body: JSON.stringify({
      doctype: "Guardian",
      name: guardianName,
      fieldname: "custom_portal_password",
      value: password,
    }),
    cache: "no-store",
  });
}

/**
 * POST /api/admin/reset-parent-password
 *
 * Resets a parent user's password to a known value so a branch manager
 * can share the credentials with the parent.
 *
 * Body: { email: string }
 * Returns: { password: string }
 */
export async function POST(request: NextRequest) {
  const authResult = requireRole(request, STAFF_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  // Verify the user exists and has the Parent role
  const userRes = await fetch(
    `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
    {
      headers: { Authorization: adminAuth, "Content-Type": "application/json" },
      cache: "no-store",
    },
  );

  if (!userRes.ok) {
    return NextResponse.json(
      { error: "Parent user not found in system" },
      { status: 404 },
    );
  }

  const userData = await userRes.json();
  const roles: string[] = (userData.data?.roles || []).map(
    (r: { role: string }) => r.role,
  );
  if (!roles.includes("Parent")) {
    return NextResponse.json(
      { error: "User does not have the Parent role" },
      { status: 400 },
    );
  }

  const newPassword = "SmartUp@123";

  // Set the password on User
  const setPwdRes = await fetch(
    `${FRAPPE_URL}/api/method/frappe.client.set_value`,
    {
      method: "POST",
      headers: { Authorization: adminAuth, "Content-Type": "application/json" },
      body: JSON.stringify({
        doctype: "User",
        name: email,
        fieldname: "new_password",
        value: newPassword,
      }),
      cache: "no-store",
    },
  );

  if (!setPwdRes.ok) {
    const errText = await setPwdRes.text();
    console.error("[reset-parent-password] Failed:", errText);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }

  // Also save to Guardian doc for visibility
  try {
    await ensureCustomField(adminAuth);
    await savePasswordToGuardian(adminAuth, email, newPassword);
  } catch (err) {
    console.warn("[reset-parent-password] Failed to save to Guardian:", err);
  }

  return NextResponse.json({ password: newPassword });
}
