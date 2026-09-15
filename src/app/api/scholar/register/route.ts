import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { validateFullE164PhoneStrict } from "@/lib/constants/countries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, selectedClass, district, syllabus } = body;

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
        { error: phoneValidation.error || "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    const selectedSyllabus = syllabus === "CBSE" ? "CBSE" : "State";

    // Map class labels to publishing search keywords
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

    // Check for existing registration to prevent duplicates
    const existingRegistration = await db.scholarRegistration.findFirst({
      where: { phone: normalizedPhone },
      orderBy: { createdAt: "desc" },
    });

    let registration;
    if (existingRegistration) {
      // Upsert: update existing registration details
      registration = await db.scholarRegistration.update({
        where: { id: existingRegistration.id },
        data: {
          studentName: name.trim(),
          classLevel: selectedClass,
          syllabus: selectedSyllabus,
          district: district || existingRegistration.district,
          status: "registered",
        },
      });
    } else {
      // Save new Registration Record
      registration = await db.scholarRegistration.create({
        data: {
          studentName: name.trim(),
          phone: normalizedPhone,
          classLevel: selectedClass,
          syllabus: selectedSyllabus,
          district: district || "Ernakulam",
          status: "registered",
        },
      });
    }

    // Check if an active Scholarship exam publishing exists for this class
    const activePublishing = await db.examPublishing.findFirst({
      where: {
        classLevel: targetLevel,
        isActive: true,
        OR: [
          { slug: { startsWith: "scholarship-" } },
          { title: { contains: "Scholarship", mode: "insensitive" } },
        ],
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

    const durationMinutes = activePublishing?.paper?.totalQuestions || activePublishing?.durationMinutes || 40;

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      hasActiveExam: !!activePublishing,
      publishingId: activePublishing?.id || null,
      examTitle: activePublishing?.title || null,
      durationMinutes,
    });
  } catch (error: any) {
    console.error("[api/scholar/register] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register student for scholarship exam." },
      { status: 500 }
    );
  }
}
