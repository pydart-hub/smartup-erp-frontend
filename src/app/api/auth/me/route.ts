import { NextRequest, NextResponse } from "next/server";
import { getSalesUserBranches } from "@/lib/utils/constants";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    const roles: string[] = sessionData.roles || [];
    let allowedCompanies: string[] = sessionData.allowed_companies || [];
    let defaultCompany: string = sessionData.default_company || "";

    if (roles.includes("Sales User") && sessionData.email) {
      const mappedBranches = getSalesUserBranches(sessionData.email);
      if (mappedBranches.length > 0) {
        allowedCompanies = mappedBranches;
        if (!defaultCompany || !mappedBranches.includes(defaultCompany)) {
          defaultCompany = mappedBranches[0];
        }
      }
    }

    return NextResponse.json({
      user: {
        name: sessionData.email,
        email: sessionData.email,
        full_name: sessionData.full_name,
        roles,
        role_profile_name: sessionData.roles?.[0] || null,
        allowed_companies: allowedCompanies,
        default_company: defaultCompany,
        instructor_name: sessionData.instructor_name || undefined,
        instructor_display_name: sessionData.instructor_display_name || undefined,
        allowed_batches: sessionData.allowed_batches || undefined,
        default_batch: sessionData.default_batch || undefined,
        mentor_profile: sessionData.mentor_profile || undefined,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
