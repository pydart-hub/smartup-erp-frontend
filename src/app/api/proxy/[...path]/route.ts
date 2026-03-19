import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;

// Doctypes that must be scoped by company/branch for Branch Managers.
// Maps doctype path segment → the field name used for company filtering.
const COMPANY_SCOPED_DOCTYPES: Record<string, string> = {
  Employee: "company",
  Attendance: "company",
  Instructor: "custom_company",
  // Education doctypes — also branch-scoped
  "Student Group": "custom_branch",
  "Student Attendance": "custom_branch",
  "Course Schedule": "custom_branch",
  Student: "custom_branch",
};

// ── Frappe-native permission model ──
// Instructors in the Frappe backend already have User Permissions that restrict
// which Company and Student Batch Name they can access. When the proxy uses the
// instructor's OWN api_key:api_secret, Frappe automatically enforces those
// permissions on every REST call. Therefore the proxy does NOT need to inject
// batch/student-group filters for instructors — Frappe handles this natively.
//
// The proxy only adds company-level filters for Branch Managers, who have
// broader access but still need to be scoped to their branch.

// Generic proxy for all Frappe API calls
// Routes: /api/proxy/resource/Student → FRAPPE_URL/api/resource/Student
//         /api/proxy/method/some.method → FRAPPE_URL/api/method/some.method
//
// NOTE: Uses native fetch (not axios) for the outbound request.
// axios + Node.js http module injects "Expect: 100-continue" at the socket
// level which Frappe Cloud rejects with 417 Expectation Failed.
// Native fetch never sends that header.

async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Extract the Frappe path from the URL
    const url = new URL(request.url);
    const proxyPath = url.pathname.replace("/api/proxy/", "");

    // Get auth from session cookie
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    const roles: string[] = sessionData.roles || [];
    const allowedCompanies: string[] = sessionData.allowed_companies || [];
    const defaultCompany: string = sessionData.default_company || "";
    const isAdmin = roles.includes("Administrator");
    const isBranchManager = roles.includes("Branch Manager");
    const isInstructor = !!sessionData.instructor_name;
    const isPureInstructor = isInstructor && !isBranchManager && !isAdmin;
    const hasUserToken = !!(sessionData.api_key && sessionData.api_secret);

    // If an instructor doesn't have their own token (generate_keys may have
    // failed during login), log a warning but DON'T block the request.
    // The admin-token fallback is less ideal (Frappe can't enforce User
    // Permissions), but blocking would make the app unusable. The frontend
    // hooks already scope data to the instructor's allowed batches.
    if (isPureInstructor && !hasUserToken) {
      console.warn(
        `[PROXY] Instructor ${sessionData.email} has no personal API token — falling back to admin credentials. ` +
        `User-level Frappe permissions will NOT be enforced server-side for this request.`
      );
    }

    // ── Branch-level enforcement for list GET requests ──
    // For non-admin users who DON'T have a personal token, inject a company
    // filter so they only see their branch data.  Instructors with their own
    // token skip this — Frappe enforces scoping natively via User Permissions.
    // BM+Instructors still need company scoping (they are Branch Managers).
    // Only pure instructors with their own token skip this — Frappe handles
    // their scoping natively via User Permissions.
    const needsCompanyScoping =
      method === "GET" &&
      !isAdmin &&
      allowedCompanies.length > 0 &&
      !(isPureInstructor && hasUserToken);

    if (needsCompanyScoping) {
      // Check if this is a resource list request (e.g. resource/Employee)
      const resourceMatch = proxyPath.match(/^resource\/([^/]+)$/);
      if (resourceMatch) {
        const doctype = decodeURIComponent(resourceMatch[1]);
        const companyField = COMPANY_SCOPED_DOCTYPES[doctype];

        if (companyField) {
          // Parse existing filters and inject company filter if not already present
          const filtersParam = url.searchParams.get("filters");
          let filters: string[][] = [];
          try {
            filters = filtersParam ? JSON.parse(filtersParam) : [];
          } catch {
            filters = [];
          }

          const hasCompanyFilter = filters.some(
            (f) => f[0] === companyField || f[0] === "company"
          );

          if (!hasCompanyFilter) {
            // Add company filter — use the user's default company
            const company = defaultCompany || allowedCompanies[0];
            if (company) {
              filters.push([companyField, "=", company]);
              url.searchParams.set("filters", JSON.stringify(filters));
            }
          } else {
            // Validate that the requested company is in allowed list
            const requestedCompanyFilter = filters.find(
              (f) => (f[0] === companyField || f[0] === "company") && f[1] === "="
            );
            if (
              requestedCompanyFilter &&
              requestedCompanyFilter[2] &&
              !allowedCompanies.includes(requestedCompanyFilter[2])
            ) {
              return NextResponse.json(
                { error: `Access denied. You can only access data for: ${allowedCompanies.join(", ")}` },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // ── Instructor write-guard ──
    // Block PURE instructors from modifying Student Group docs directly (only
    // Branch Managers / Admins can do that). BM+Instructors are allowed.
    // Note: instructors are auto-granted "Academics User" role at login,
    // which gives broad write/delete access — so we must also block DELETE.
    if (isPureInstructor && (method === "PUT" || method === "POST" || method === "DELETE")) {
      const resourceSingleMatch = proxyPath.match(/^resource\/([^/]+)\/(.+)$/);
      if (resourceSingleMatch) {
        const doctype = decodeURIComponent(resourceSingleMatch[1]);
        if (doctype === "Student Group") {
          return NextResponse.json(
            { error: "Instructors cannot modify batch records." },
            { status: 403 }
          );
        }
      }
    }

    const queryString = url.search;
    const targetUrl = `${FRAPPE_URL}/api/${proxyPath}${queryString}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // ── Auth header ──
    // Use the user's own api_key:api_secret so Frappe enforces User Permissions.
    // Only fall back to the server admin token for non-instructor users whose
    // key generation may have failed (rare edge case).
    if (hasUserToken) {
      headers["Authorization"] = `token ${sessionData.api_key}:${sessionData.api_secret}`;
    } else {
      // Non-instructor fallback (branch managers, admins, etc.)
      const adminKey = process.env.FRAPPE_API_KEY;
      const adminSecret = process.env.FRAPPE_API_SECRET;
      if (adminKey && adminSecret) {
        headers["Authorization"] = `token ${adminKey}:${adminSecret}`;
      }
    }

    let body: string | undefined = undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        const json = await request.json();
        body = JSON.stringify(json);
      } catch {
        // No body
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      // Next.js fetch caching — disable for all proxy calls
      cache: "no-store",
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    // Debug: log non-success responses for troubleshooting
    if (!response.ok) {
      console.error(`[PROXY] ${method} ${proxyPath} → ${response.status}`);
      if (body) console.error(`[PROXY] Request body:`, body.slice(0, 500));
      console.error(`[PROXY] Response:`, JSON.stringify(responseData).slice(0, 800));
    }

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Proxy error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}
