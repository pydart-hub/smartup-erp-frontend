import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { validateFullE164PhoneStrict } from "@/lib/constants/countries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, schoolName, phone, selectedClass, country, emirateCity, curriculum } = body;

    const normalizedPhone = typeof phone === "string" ? phone.replace(/[^\d+]/g, "") : "";
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Please enter a valid student name." },
        { status: 400 }
      );
    }

    const phoneValidation = validateFullE164PhoneStrict(normalizedPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || "Please enter a valid mobile number with country code." },
        { status: 400 }
      );
    }

    const selectedCurriculum = curriculum || "CBSE";
    const selectedCountry = country || "UAE";

    // Map class labels to publishing search target levels
    const classLevelMap: Record<string, string> = {
      "Class 8": "8",
      "Class 9": "9",
      "Class 10": "10",
      "Plus One (+1)": "11",
      "+1": "11",
      "Plus Two (+2)": "12",
      "+2": "12",
    };

    const targetLevel = classLevelMap[selectedClass] || selectedClass;

    // Check for existing registration in smartup_online DB
    const existingRegistration = await levelupDb.levelUpRegistration.findFirst({
      where: { phone: normalizedPhone },
      orderBy: { createdAt: "desc" },
    });

    let registration;
    if (existingRegistration) {
      registration = await levelupDb.levelUpRegistration.update({
        where: { id: existingRegistration.id },
        data: {
          studentName: name.trim(),
          email: typeof email === "string" ? email.trim() : existingRegistration.email,
          schoolName: typeof schoolName === "string" ? schoolName.trim() : existingRegistration.schoolName,
          classLevel: selectedClass,
          curriculum: selectedCurriculum,
          country: selectedCountry,
          emirateCity: emirateCity || existingRegistration.emirateCity,
          status: "registered",
        },
      });
    } else {
      registration = await levelupDb.levelUpRegistration.create({
        data: {
          studentName: name.trim(),
          email: typeof email === "string" ? email.trim() : null,
          schoolName: typeof schoolName === "string" ? schoolName.trim() : null,
          phone: normalizedPhone,
          country: selectedCountry,
          emirateCity: emirateCity || "Dubai",
          classLevel: selectedClass,
          curriculum: selectedCurriculum,
          status: "registered",
        },
      });
    }

    // Check if an active LevelUp publishing exists for this class
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

    const durationMinutes = activePublishing?.paper?.totalQuestions || activePublishing?.durationMinutes || 45;

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      hasActiveExam: !!activePublishing,
      publishingId: activePublishing?.id || null,
      examTitle: activePublishing?.title || null,
      durationMinutes,
    });
  } catch (error: any) {
    console.error("[api/levelup/register] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register student for LevelUp scholarship exam." },
      { status: 500 }
    );
  }
}
