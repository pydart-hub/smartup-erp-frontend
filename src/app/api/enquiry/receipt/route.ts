import { NextRequest, NextResponse } from "next/server";
import { enquiryDb } from "@/lib/enquiry/db";

export const dynamic = "force-dynamic";

const REF_CODE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

/**
 * Public confirmation lookup for the enquiry Thank You page on refresh/new tab.
 * Returns only non-PII confirmation fields (no phone, email, or parent name).
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref")?.trim();

  if (!ref || !REF_CODE_PATTERN.test(ref)) {
    return NextResponse.json(
      { error: "Valid reference code is required." },
      { status: 400 }
    );
  }

  if (!process.env.ENQUIRY_DATABASE_URL) {
    return NextResponse.json(
      { error: "Enquiry database is not configured." },
      { status: 503 }
    );
  }

  try {
    const enquiry = await enquiryDb.courseEnquiry.findUnique({
      where: { referenceCode: ref },
      select: {
        referenceCode: true,
        studentName: true,
        classLevel: true,
        preferredPlan: true,
      },
    });

    if (!enquiry) {
      return NextResponse.json(
        { error: "Registration receipt not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      referenceCode: enquiry.referenceCode,
      studentName: enquiry.studentName,
      classLevel: enquiry.classLevel,
      preferredPlan: enquiry.preferredPlan,
    });
  } catch (error) {
    console.error("[Enquiry Receipt Lookup Error]:", error);
    return NextResponse.json(
      { error: "Unable to load registration confirmation." },
      { status: 500 }
    );
  }
}
