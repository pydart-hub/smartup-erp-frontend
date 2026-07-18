import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, district, stream, marks } = body;

    if (!name || !phone || !district || !marks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const submission = await db.plusTwoPredictorSubmission.create({
      data: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        district: String(district).trim(),
        stream: String(stream || "Science").trim(),
        marksJson: marks,
      },
    });

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (error) {
    console.error("[predictor/submit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
