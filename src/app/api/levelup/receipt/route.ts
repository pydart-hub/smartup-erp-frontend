import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CLASS_LEVEL_MAP: Record<string, string> = {
  "Class 8": "8",
  "Class 9": "9",
  "Class 10": "10",
  "Plus One (+1)": "11",
  "+1": "11",
  "Plus Two (+2)": "12",
  "+2": "12",
};

/**
 * Public confirmation lookup for the LevelUp Thank You page on refresh/new tab.
 * Returns only non-PII confirmation fields (no phone or email).
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Valid registration ID is required." },
      { status: 400 }
    );
  }

  try {
    const registration = await levelupDb.levelUpRegistration.findUnique({
      where: { id },
      select: {
        id: true,
        studentName: true,
        schoolName: true,
        country: true,
        emirateCity: true,
        classLevel: true,
        curriculum: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration receipt not found." },
        { status: 404 }
      );
    }

    const targetLevel =
      CLASS_LEVEL_MAP[registration.classLevel] || registration.classLevel;

    const activePublishing = await levelupDb.levelUpPublishing.findFirst({
      where: {
        classLevel: targetLevel,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        durationMinutes: true,
        paper: {
          select: { totalQuestions: true },
        },
      },
    });

    const durationMinutes =
      activePublishing?.paper?.totalQuestions ||
      activePublishing?.durationMinutes ||
      45;

    return NextResponse.json({
      registrationId: registration.id,
      studentName: registration.studentName,
      schoolName: registration.schoolName || "",
      country: registration.country,
      emirateCity: registration.emirateCity || "",
      classLevel: registration.classLevel,
      curriculum: registration.curriculum || "CBSE",
      hasActiveExam: Boolean(activePublishing),
      examTitle: activePublishing?.title || null,
      durationMinutes,
    });
  } catch (error) {
    console.error("[api/levelup/receipt] Error:", error);
    return NextResponse.json(
      { error: "Unable to load registration confirmation." },
      { status: 500 }
    );
  }
}
