import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Verify credentials — Frappe returns 401 if wrong
    await axios.post(
      `${FRAPPE_URL}/api/method/login`,
      { usr: email, pwd: password },
      { headers: { "Content-Type": "application/json" } }
    );

    // 2. Use server admin token to fetch full User document
    //    The User doc includes a `roles` child table — no separate get_list needed
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    const userResponse = await axios.get(
      `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
        },
      }
    );

    const userData = userResponse.data?.data;
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Extract roles from the User doc's roles child table
    const roles = (userData.roles || []).map((r: { role: string }) => r.role);

    // 4. Generate fresh API key/secret for this user via admin token.
    //    generate_keys returns ONLY api_secret in its response.
    //    api_key lives on the User doc — if the user already has one, Frappe keeps it;
    //    otherwise generate_keys creates one. We read it from the User doc after the call.
    let apiKey = "";
    let apiSecret = "";
    try {
      // NOTE: Must use native fetch (not axios) here.
      // axios + Node.js http module injects "Expect: 100-continue" at the socket
      // level which Frappe Cloud rejects with 417 Expectation Failed.
      const keysRes = await fetch(
        `${FRAPPE_URL}/api/method/frappe.core.doctype.user.user.generate_keys?user=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
        }
      );
      if (!keysRes.ok) {
        throw new Error(`generate_keys returned ${keysRes.status}`);
      }
      const keysData = await keysRes.json();
      apiSecret = keysData?.message?.api_secret || "";

      // generate_keys may have created/updated the api_key on the User doc.
      // Re-fetch just the api_key field to get the current value.
      const keyRefetch = await axios.get(
        `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
        {
          params: { fields: JSON.stringify(["api_key"]) },
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
        }
      );
      apiKey = keyRefetch.data?.data?.api_key || userData.api_key || "";
    } catch (keyErr) {
      console.warn("[login] generate_keys failed for", email, keyErr);
      apiKey = userData.api_key || "";
      // apiSecret stays empty — proxy will fall back to admin credentials
    }

    // 5. Fetch User Permission → Company to know which branches this user can access
    let allowedCompanies: string[] = [];
    let defaultCompany = "";
    let allowedBatches: string[] = [];
    let defaultBatch = "";
    try {
      const upResponse = await axios.get(
        `${FRAPPE_URL}/api/resource/User Permission`,
        {
          params: {
            filters: JSON.stringify([
              ["user", "=", email],
              ["allow", "in", ["Company", "Student Batch Name"]],
            ]),
            fields: JSON.stringify(["allow", "for_value", "is_default"]),
            limit_page_length: 50,
          },
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
        }
      );
      const perms: { allow: string; for_value: string; is_default: number }[] =
        upResponse.data?.data ?? [];

      // Separate Company and Student Batch Name permissions
      const companyPerms = perms.filter((p) => p.allow === "Company");
      allowedCompanies = companyPerms.map((p) => p.for_value);
      defaultCompany =
        companyPerms.find((p) => p.is_default === 1)?.for_value ??
        allowedCompanies[0] ??
        "";

      const batchPerms = perms.filter((p) => p.allow === "Student Batch Name");
      allowedBatches = batchPerms.map((p) => p.for_value);
      defaultBatch =
        batchPerms.find((p) => p.is_default === 1)?.for_value ??
        allowedBatches[0] ??
        "";
    } catch (upErr) {
      console.warn("[login] Failed to fetch User Permissions:", upErr);
    }

    // 6. Detect if user is an Instructor
    //    Chain: User email → Employee(user_id) → Instructor(employee)
    let instructorName = "";
    let instructorDisplayName = "";
    try {
      // Find Employee by user_id (email)
      const empRes = await axios.get(
        `${FRAPPE_URL}/api/resource/Employee`,
        {
          params: {
            filters: JSON.stringify([["user_id", "=", email]]),
            fields: JSON.stringify(["name", "employee_name"]),
            limit_page_length: 1,
          },
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
        }
      );
      const empData = empRes.data?.data?.[0];
      if (empData) {
        // Check if this employee is linked to an Instructor
        const instrRes = await axios.get(
          `${FRAPPE_URL}/api/resource/Instructor`,
          {
            params: {
              filters: JSON.stringify([["employee", "=", empData.name]]),
              fields: JSON.stringify(["name", "instructor_name"]),
              limit_page_length: 1,
            },
            headers: {
              Authorization: adminAuth,
              "Content-Type": "application/json",
            },
          }
        );
        const instrData = instrRes.data?.data?.[0];
        if (instrData) {
          instructorName = instrData.name;
          instructorDisplayName = instrData.instructor_name || empData.employee_name || "";

          // Pure instructors: move "Instructor" to position 0 for frontend
          // role detection. Users with higher-priority roles keep their primary
          // role untouched — the frontend picks the best role from store.
          const HIGHER_ROLES = ["Director", "Management", "General Manager", "Branch Manager", "HR Manager", "Administrator"];
          const hasPrimaryRole = HIGHER_ROLES.some((r) => roles.includes(r));

          if (!hasPrimaryRole) {
            // Ensure "Instructor" is at position 0 for frontend role detection.
            const existingIdx = roles.indexOf("Instructor");
            if (existingIdx > -1) roles.splice(existingIdx, 1);
            roles.unshift("Instructor");
          }

          // 6b. Ensure ALL instructors (including BM+Instructor) have
          //     "Academics User" role in Frappe.  Course Schedule and Student
          //     Attendance DocType permissions require this role for
          //     write/create — without it, the user cannot create schedules
          //     or mark attendance even when acting in instructor mode.
          if (!roles.includes("Academics User")) {
            try {
              const existingRoleRows = (userData.roles || []).map(
                (r: { role: string; name?: string }) => ({
                  role: r.role,
                  ...(r.name ? { name: r.name } : {}),
                })
              );
              existingRoleRows.push({ role: "Academics User" });
              await axios.put(
                `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(email)}`,
                { roles: existingRoleRows },
                {
                  headers: {
                    Authorization: adminAuth,
                    "Content-Type": "application/json",
                  },
                }
              );
              roles.push("Academics User");
              console.log(
                `[login] Added "Academics User" role to instructor ${email}`
              );
            } catch (roleErr) {
              console.warn(
                `[login] Could not add Academics User role to ${email}:`,
                roleErr
              );
            }
          }
        }
      }
    } catch (instrErr) {
      console.warn("[login] Instructor detection failed:", instrErr);
    }

    const user = {
      name: userData.name,
      email: userData.email,
      full_name: userData.full_name,
      user_image: userData.user_image,
      role_profile_name: userData.role_profile_name,
      roles,
      api_key: apiKey,
      allowed_companies: allowedCompanies,
      default_company: defaultCompany,
      instructor_name: instructorName || undefined,
      instructor_display_name: instructorDisplayName || undefined,
      allowed_batches: allowedBatches.length > 0 ? allowedBatches : undefined,
      default_batch: defaultBatch || undefined,
    };

    const response = NextResponse.json({ user, message: "Login successful" });

    const sessionData = JSON.stringify({
      email: user.email,
      api_key: apiKey,
      api_secret: apiSecret,
      roles,
      full_name: user.full_name,
      allowed_companies: allowedCompanies,
      default_company: defaultCompany,
      instructor_name: instructorName || undefined,
      instructor_display_name: instructorDisplayName || undefined,
      allowed_batches: allowedBatches.length > 0 ? allowedBatches : undefined,
      default_batch: defaultBatch || undefined,
    });

    response.cookies.set("smartup_session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data?: { message?: string } } };
    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
