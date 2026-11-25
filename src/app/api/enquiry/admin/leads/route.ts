import { NextRequest, NextResponse } from "next/server";
import { enquiryDb } from "@/lib/enquiry/db";
import { verifyAdminToken } from "@/lib/scholar-admin-auth";
import { verifyEnquiryAdminPassword } from "@/lib/enquiry/admin-auth";
import { ENQUIRY_STATUSES } from "@/lib/enquiry/validation";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
  const cookieToken = request.cookies.get("enquiry_admin_token")?.value;
  return verifyAdminToken(bearerToken || cookieToken);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  if (!process.env.ENQUIRY_DATABASE_URL) {
    return NextResponse.json(
      { error: "ENQUIRY_DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const classLevel = searchParams.get("classLevel");
    const plan = searchParams.get("plan");
    const search = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (classLevel && classLevel !== "all") where.classLevel = classLevel;
    if (plan && plan !== "all") where.preferredPlan = plan;
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: "insensitive" } },
        { parentName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { referenceCode: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, totalCount, statusGroups, planGroups] = await Promise.all([
      enquiryDb.courseEnquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          followUps: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        take: 500,
      }),
      enquiryDb.courseEnquiry.count(),
      enquiryDb.courseEnquiry.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      enquiryDb.courseEnquiry.groupBy({
        by: ["preferredPlan"],
        _count: { preferredPlan: true },
      }),
    ]);

    const countsByStatus: Record<string, number> = {};
    for (const row of statusGroups) {
      countsByStatus[row.status] = row._count.status;
    }

    const countsByPlan: Record<string, number> = {};
    for (const row of planGroups) {
      countsByPlan[row.preferredPlan] = row._count.preferredPlan;
    }

    return NextResponse.json({
      leads,
      summary: {
        total: totalCount,
        byStatus: countsByStatus,
        byPlan: countsByPlan,
      },
    });
  } catch (error) {
    console.error("[api/enquiry/admin/leads GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch enquiries." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      id,
      status,
      assignedCounsellor,
      notes,
      followUp,
    } = body as {
      id?: string;
      status?: string;
      assignedCounsellor?: string;
      notes?: string;
      followUp?: {
        counsellorName: string;
        channel?: string;
        outcome: string;
        remarks?: string;
      };
    };

    if (!id) {
      return NextResponse.json(
        { error: "Enquiry ID is required." },
        { status: 400 }
      );
    }

    if (
      status &&
      !(ENQUIRY_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (assignedCounsellor !== undefined) {
      updateData.assignedCounsellor = assignedCounsellor.trim() || null;
    }
    if (notes !== undefined) {
      updateData.notes = notes.trim() || null;
    }

    const updated = await enquiryDb.courseEnquiry.update({
      where: { id },
      data: {
        ...updateData,
        ...(followUp && followUp.outcome?.trim()
          ? {
              followUps: {
                create: {
                  counsellorName:
                    followUp.counsellorName?.trim() || "Counsellor",
                  channel: followUp.channel || "WhatsApp",
                  outcome: followUp.outcome.trim(),
                  remarks: followUp.remarks?.trim() || null,
                },
              },
            }
          : {}),
      },
      include: {
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      lead: updated,
    });
  } catch (error) {
    console.error("[api/enquiry/admin/leads PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update enquiry." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, password } = body as { id?: string; password?: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Enquiry ID is required." },
        { status: 400 }
      );
    }

    if (
      typeof password !== "string" ||
      !verifyEnquiryAdminPassword(password)
    ) {
      return NextResponse.json(
        { error: "Incorrect password. Deletion denied." },
        { status: 403 }
      );
    }

    const existing = await enquiryDb.courseEnquiry.findUnique({
      where: { id },
      select: { id: true, referenceCode: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Enquiry record not found." },
        { status: 404 }
      );
    }

    await enquiryDb.courseEnquiry.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      referenceCode: existing.referenceCode,
    });
  } catch (error) {
    console.error("[api/enquiry/admin/leads DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete enquiry." },
      { status: 500 }
    );
  }
}
