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
  // Syllabus tracking
  "Syllabus Configuration": "company",
  "Syllabus Part Completion": "company",
  // Assessment / Exams
  "Assessment Plan": "custom_branch",
  "Assessment Result": "custom_branch",
  // HR Salary module (custom doctypes)
  "SmartUp Salary Record": "company",
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

    let parsedBody: unknown = undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        parsedBody = await request.json();
      } catch {
        // No body
      }
    }

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
    const isAdmin = roles.includes("Administrator") || roles.includes("Director");
    const isBranchManager = roles.includes("Branch Manager");
    const isHRManager = roles.includes("HR Manager");
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
    //
    // Effective company list: prefer allowedCompanies from User Permissions,
    // fall back to defaultCompany for Branch Managers who may not have
    // exhaustive User Permissions configured in Frappe.
    const effectiveCompanies =
      allowedCompanies.length > 0
        ? allowedCompanies
        : defaultCompany && (isBranchManager || isHRManager)
          ? [defaultCompany]
          : [];

    const needsCompanyScoping =
      method === "GET" &&
      !isAdmin &&
      effectiveCompanies.length > 0 &&
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let filters: any[][] = [];
          try {
            filters = filtersParam ? JSON.parse(filtersParam) : [];
          } catch {
            filters = [];
          }

          const hasCompanyFilter = filters.some(
            (f) => f[0] === companyField || f[0] === "company"
          );

          if (!hasCompanyFilter) {
            // Directors / multi-branch users: use "in" so they see all branches
            // Branch Managers with one branch: use "=" for exact match
            if (effectiveCompanies.length > 1) {
              filters.push([companyField, "in", effectiveCompanies]);
            } else {
              const company = defaultCompany || effectiveCompanies[0];
              if (company) {
                filters.push([companyField, "=", company]);
              }
            }
            url.searchParams.set("filters", JSON.stringify(filters));
          } else {
            // Validate that the requested company is in allowed list
            const requestedCompanyFilter = filters.find(
              (f) => (f[0] === companyField || f[0] === "company") && (f[1] === "=" || f[1] === "in")
            );
            if (
              requestedCompanyFilter &&
              requestedCompanyFilter[1] === "=" &&
              requestedCompanyFilter[2] &&
              !effectiveCompanies.includes(requestedCompanyFilter[2])
            ) {
              return NextResponse.json(
                { error: `Access denied. You can only access data for: ${effectiveCompanies.join(", ")}` },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    const isSetValueTopicCoverageRequest =
      method === "POST" &&
      proxyPath === "method/frappe.client.set_value" &&
      !!parsedBody &&
      typeof parsedBody === "object" &&
      !Array.isArray(parsedBody) &&
      (parsedBody as Record<string, unknown>).doctype === "Course Schedule" &&
      (parsedBody as Record<string, unknown>).fieldname === "custom_topic_covered" &&
      ((parsedBody as Record<string, unknown>).value === 0 ||
        (parsedBody as Record<string, unknown>).value === 1) &&
      typeof (parsedBody as Record<string, unknown>).name === "string";

    // ── Instructor write-guard ──
    // Block PURE instructors from modifying Student Group docs directly (only
    // Branch Managers / Admins can do that). BM+Instructors are allowed.
    // Note: instructors are auto-granted "Academics User" role at login,
    // which gives broad write/delete access — so we must also block DELETE.
    let allowInstructorTopicCoverageWrite = false;
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

        // Allow ONLY topic-coverage toggles on Course Schedule for pure instructors.
        if (doctype === "Course Schedule" && method === "PUT") {
          const payload =
            parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
              ? (parsedBody as Record<string, unknown>)
              : null;

          if (!payload) {
            return NextResponse.json(
              { error: "Invalid request payload." },
              { status: 400 }
            );
          }

          const keys = Object.keys(payload);
          const isTopicCoveredOnlyPayload =
            keys.length === 1 &&
            keys[0] === "custom_topic_covered" &&
            (payload.custom_topic_covered === 0 || payload.custom_topic_covered === 1);

          if (!isTopicCoveredOnlyPayload) {
            return NextResponse.json(
              { error: "Instructors can only update topic coverage status." },
              { status: 403 }
            );
          }

          const adminKey = process.env.FRAPPE_API_KEY;
          const adminSecret = process.env.FRAPPE_API_SECRET;
          if (!adminKey || !adminSecret) {
            return NextResponse.json(
              { error: "Server auth is not configured." },
              { status: 500 }
            );
          }

          const scheduleName = decodeURIComponent(resourceSingleMatch[2]);
          const guardQuery = new URLSearchParams({
            fields: JSON.stringify(["name", "instructor", "custom_branch", "custom_event_type"]),
          });
          const guardUrl =
            `${FRAPPE_URL}/api/resource/Course%20Schedule/${encodeURIComponent(scheduleName)}?${guardQuery.toString()}`;

          const guardRes = await fetch(guardUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `token ${adminKey}:${adminSecret}`,
            },
            cache: "no-store",
          });

          if (!guardRes.ok) {
            return NextResponse.json(
              { error: "Unable to validate schedule access." },
              { status: guardRes.status }
            );
          }

          const guardJson = (await guardRes.json()) as {
            data?: {
              instructor?: string;
              custom_branch?: string;
              custom_event_type?: string;
            };
          };

          const schedule = guardJson.data;
          if (!schedule) {
            return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
          }

          const scheduleBranch = schedule.custom_branch || "";
          const scheduleIsEvent = !!schedule.custom_event_type;
          const inAllowedBranch =
            !scheduleBranch ||
            effectiveCompanies.length === 0 ||
            effectiveCompanies.includes(scheduleBranch);

          const instructorOwnsSchedule =
            !!sessionData.instructor_name && schedule.instructor === sessionData.instructor_name;

          // Topics must belong to the logged-in instructor.
          // Events are branch-level and can be toggled by instructors in that branch.
          const allowedByOwnership = scheduleIsEvent ? inAllowedBranch : instructorOwnsSchedule;

          if (!allowedByOwnership || !inAllowedBranch) {
            return NextResponse.json(
              { error: "Access denied for this schedule update." },
              { status: 403 }
            );
          }

          allowInstructorTopicCoverageWrite = true;
        }
      }

      if (isSetValueTopicCoverageRequest) {
        const payload = parsedBody as Record<string, unknown>;
        const adminKey = process.env.FRAPPE_API_KEY;
        const adminSecret = process.env.FRAPPE_API_SECRET;
        if (!adminKey || !adminSecret) {
          return NextResponse.json(
            { error: "Server auth is not configured." },
            { status: 500 }
          );
        }

        const scheduleName = String(payload.name || "");
        const guardQuery = new URLSearchParams({
          fields: JSON.stringify(["name", "instructor", "custom_branch", "custom_event_type"]),
        });
        const guardUrl =
          `${FRAPPE_URL}/api/resource/Course%20Schedule/${encodeURIComponent(scheduleName)}?${guardQuery.toString()}`;

        const guardRes = await fetch(guardUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `token ${adminKey}:${adminSecret}`,
          },
          cache: "no-store",
        });

        if (!guardRes.ok) {
          return NextResponse.json(
            { error: "Unable to validate schedule access." },
            { status: guardRes.status }
          );
        }

        const guardJson = (await guardRes.json()) as {
          data?: {
            instructor?: string;
            custom_branch?: string;
            custom_event_type?: string;
          };
        };

        const schedule = guardJson.data;
        if (!schedule) {
          return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
        }

        const scheduleBranch = schedule.custom_branch || "";
        const scheduleIsEvent = !!schedule.custom_event_type;
        const inAllowedBranch =
          !scheduleBranch ||
          effectiveCompanies.length === 0 ||
          effectiveCompanies.includes(scheduleBranch);

        const instructorOwnsSchedule =
          !!sessionData.instructor_name && schedule.instructor === sessionData.instructor_name;

        const allowedByOwnership = scheduleIsEvent ? inAllowedBranch : instructorOwnsSchedule;
        if (!allowedByOwnership || !inAllowedBranch) {
          return NextResponse.json(
            { error: "Access denied for this schedule update." },
            { status: 403 }
          );
        }

        allowInstructorTopicCoverageWrite = true;
      }
    }

    const queryString = url.search;
    const targetUrl = `${FRAPPE_URL}/api/${proxyPath}${queryString}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // ── Auth header ──
    // - Instructors with their own token: use personal token so Frappe enforces
    //   User Permissions natively (batch/student-group scoping).
    // - Branch Managers: use admin token. BM role in Frappe may not have full
    //   doctype read permissions. Security is enforced at the proxy layer above
    //   via company-filter injection (effectiveCompanies).
    // - Everyone else (admins, etc.): use personal token if available, else admin.
    const useAdminToken = ((isBranchManager || isHRManager) && !isAdmin) || allowInstructorTopicCoverageWrite;
    if (!useAdminToken && hasUserToken) {
      headers["Authorization"] = `token ${sessionData.api_key}:${sessionData.api_secret}`;
    } else {
      // Admin token fallback
      const adminKey = process.env.FRAPPE_API_KEY;
      const adminSecret = process.env.FRAPPE_API_SECRET;
      if (adminKey && adminSecret) {
        headers["Authorization"] = `token ${adminKey}:${adminSecret}`;
      }
    }

    let body: string | undefined = undefined;
    if (method !== "GET" && method !== "DELETE") {
      if (parsedBody !== undefined) {
        body = JSON.stringify(parsedBody);
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
