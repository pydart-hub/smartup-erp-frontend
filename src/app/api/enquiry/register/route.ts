import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/enquiry-client";
import { enquiryDb } from "@/lib/enquiry/db";
import {
  enquiryRegistrationSchema,
  generateEnquiryRefCode,
} from "@/lib/enquiry/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = enquiryRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error:
            firstIssue?.message ||
            "Please check the entered details and try again.",
          field: firstIssue?.path?.[0] || null,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedStream =
      data.classLevel === "Class 8" ||
      data.classLevel === "Class 9" ||
      data.classLevel === "Class 10"
        ? "Science"
        : data.stream;

    if (!process.env.ENQUIRY_DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "Enquiry database is not configured yet (ENQUIRY_DATABASE_URL missing).",
        },
        { status: 503 }
      );
    }

    // Check if an enquiry with the same phone & class was already submitted
    const existing = await enquiryDb.courseEnquiry.findFirst({
      where: {
        phone: data.phone,
        classLevel: data.classLevel,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const updated = await enquiryDb.courseEnquiry.update({
        where: { id: existing.id },
        data: {
          studentName: data.studentName,
          parentName: data.parentName,
          email: data.email || existing.email,
          country: data.country,
          city: data.city || existing.city,
          stream: normalizedStream,
          board: data.board,
          preferredPlan: data.preferredPlan,
          schoolName: data.schoolName || existing.schoolName,
          preferredCallTime: data.preferredCallTime || existing.preferredCallTime,
          utmSource: data.utmSource || existing.utmSource,
          utmMedium: data.utmMedium || existing.utmMedium,
          utmCampaign: data.utmCampaign || existing.utmCampaign,
        },
      });

      return NextResponse.json({
        success: true,
        updated: true,
        referenceCode: updated.referenceCode,
        enquiryId: updated.id,
        studentName: updated.studentName,
        classLevel: updated.classLevel,
        preferredPlan: updated.preferredPlan,
      });
    }

    // Create with retry on referenceCode collision (P2002)
    let created = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await enquiryDb.courseEnquiry.create({
          data: {
            referenceCode: generateEnquiryRefCode(),
            studentName: data.studentName,
            parentName: data.parentName,
            phone: data.phone,
            email: data.email || null,
            country: data.country,
            city: data.city || null,
            classLevel: data.classLevel,
            stream: normalizedStream,
            board: data.board,
            preferredPlan: data.preferredPlan,
            schoolName: data.schoolName || null,
            preferredCallTime: data.preferredCallTime || "Evening (GCC)",
            utmSource: data.utmSource || null,
            utmMedium: data.utmMedium || null,
            utmCampaign: data.utmCampaign || null,
            referrer: data.referrer || null,
          },
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }
        throw err;
      }
    }

    if (!created) {
      throw new Error("Failed to create enquiry record after retries.");
    }

    return NextResponse.json(
      {
        success: true,
        updated: false,
        referenceCode: created.referenceCode,
        enquiryId: created.id,
        studentName: created.studentName,
        classLevel: created.classLevel,
        preferredPlan: created.preferredPlan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Enquiry Register Error]:", error);
    return NextResponse.json(
      {
        error:
          "Unable to save your enquiry right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
