import { NextRequest, NextResponse } from "next/server";

const WABA_ID = process.env.WHATSAPP_BUSINESS_ID || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface MetaDataPoint {
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
}

interface MetaAnalyticsResponse {
  id: string;
  analytics?: {
    phone_numbers?: string[];
    granularity: string;
    data_points: MetaDataPoint[];
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

// CORS headers helper
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(req: NextRequest) {
  try {
    if (!WABA_ID || !ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: "WhatsApp credentials not configured on server" },
        { status: 500, headers: corsHeaders() }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from") || searchParams.get("startDate");
    const toParam = searchParams.get("to") || searchParams.get("endDate");
    const granularity = (searchParams.get("granularity") || "DAY").toUpperCase();

    if (!["DAY", "HALF_HOUR", "MONTH"].includes(granularity)) {
      return NextResponse.json(
        { success: false, error: "Invalid granularity. Allowed: DAY, HALF_HOUR, MONTH" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const now = new Date();
    let startSec: number;
    let endSec: number;

    if (fromParam) {
      startSec = Math.floor(new Date(`${fromParam}T00:00:00+05:30`).getTime() / 1000);
    } else {
      // Default: 30 days ago
      startSec = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
    }

    if (toParam) {
      endSec = Math.floor(new Date(`${toParam}T23:59:59+05:30`).getTime() / 1000);
    } else {
      // Default: right now
      endSec = Math.floor(now.getTime() / 1000);
    }

    if (isNaN(startSec) || isNaN(endSec)) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (startSec > endSec) {
      return NextResponse.json(
        { success: false, error: "'from' date cannot be after 'to' date" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Meta limitation: Retained for up to 90 days
    const ninetyDaysAgo = Math.floor((now.getTime() - 90 * 24 * 60 * 60 * 1000) / 1000);
    if (startSec < ninetyDaysAgo) {
      startSec = ninetyDaysAgo;
    }

    const metaUrl = `${BASE_URL}/${WABA_ID}?fields=analytics.start(${startSec}).end(${endSec}).granularity(${granularity})`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      cache: "no-store",
    });

    const metaData: MetaAnalyticsResponse = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      console.error("[whatsapp-analytics] Meta API error:", metaData.error);
      return NextResponse.json(
        { success: false, error: metaData.error?.message || "Failed to fetch analytics from Meta" },
        { status: metaRes.status || 500, headers: corsHeaders() }
      );
    }

    const rawPoints = metaData.analytics?.data_points || [];
    let totalSent = 0;
    let totalDelivered = 0;

    const dataPoints = rawPoints.map((pt) => {
      const sent = pt.sent || 0;
      const delivered = pt.delivered || 0;
      const undelivered = Math.max(0, sent - delivered);
      totalSent += sent;
      totalDelivered += delivered;

      const dateStr = new Date(pt.start * 1000).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      return {
        date: dateStr,
        startTimestamp: pt.start,
        endTimestamp: pt.end,
        sent,
        delivered,
        undelivered,
        deliveryRate: sent > 0 ? `${((delivered / sent) * 100).toFixed(1)}%` : "0%",
      };
    });

    const totalUndelivered = Math.max(0, totalSent - totalDelivered);
    const overallRate =
      totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(2)}%` : "0.00%";

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            totalSent,
            totalDelivered, // Successful messages
            totalUndelivered,
            deliveryRate: overallRate,
          },
          filter: {
            from: fromParam || new Date(startSec * 1000).toISOString().slice(0, 10),
            to: toParam || new Date(endSec * 1000).toISOString().slice(0, 10),
            granularity,
            startTimestamp: startSec,
            endTimestamp: endSec,
            phoneNumber: metaData.analytics?.phone_numbers?.[0] || null,
          },
          dataPoints,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp-analytics] Server error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
