import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { validateFullE164PhoneStrict } from "@/lib/constants/countries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number parameter is required" }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/[^\d+]/g, "");
    const validation = validateFullE164PhoneStrict(normalizedPhone);
    if (!validation.isValid) {
      return NextResponse.json({ registered: false, message: "Invalid phone format" });
    }

    // Lookup most recent registration by phone number
    const registration = await db.scholarRegistration.findFirst({
      where: { phone: normalizedPhone },
      orderBy: { createdAt: "desc" },
    });

    if (!registration) {
      return NextResponse.json({ registered: false });
    }

    // Check if an existing exam attempt exists for this student
    const latestAttempt = await db.examAttempt.findFirst({
      where: { studentPhone: normalizedPhone },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        publishingId: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      registered: true,
      registrationId: registration.id,
      studentName: registration.studentName,
      schoolName: registration.schoolName || "",
      classLevel: registration.classLevel,
      syllabus: registration.syllabus || "State",
      district: registration.district,
      hasAttempt: !!latestAttempt,
      attemptId: latestAttempt?.id || null,
      attemptStatus: latestAttempt?.status || null,
    });
  } catch (error: any) {
    console.error("[api/scholar/check] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check registration status" },
      { status: 500 }
    );
  }
}
