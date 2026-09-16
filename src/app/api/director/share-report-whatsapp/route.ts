import { NextRequest, NextResponse } from "next/server";
import { sendTemplate, uploadMedia, normalisePhone } from "@/lib/utils/whatsapp";
import { buildReportDeliveryWithDocument } from "@/lib/utils/whatsappTemplates";
import { storeReportFile } from "@/lib/reports/report-token-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      toPhone,
      title,
      subtitle,
      customNote,
      format,
      filename,
      fileBase64,
      recipientName,
    } = body;

    if (!toPhone) {
      return NextResponse.json(
        { error: "Recipient WhatsApp phone number is required" },
        { status: 400 }
      );
    }

    if (!fileBase64 || !filename) {
      return NextResponse.json(
        { error: "Report file content is required" },
        { status: 400 }
      );
    }

    const formattedPhone = normalisePhone(toPhone);
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const buffer = Buffer.from(fileBase64, "base64");

    // Determine correct MIME type for Meta API
    let mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const lowerFilename = filename.toLowerCase();
    if (format === "csv" || lowerFilename.endsWith(".csv")) {
      mimeType = "text/plain";
    } else if (format === "pdf" || lowerFilename.endsWith(".pdf")) {
      mimeType = "application/pdf";
    }

    // Check Meta WhatsApp API configuration
    const hasMetaConfig =
      Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
      Boolean(process.env.WHATSAPP_ACCESS_TOKEN);

    if (hasMetaConfig) {
      try {
        console.log(`[share-report-whatsapp] Uploading ${filename} (${buffer.length} bytes) to Meta Media API...`);
        const mediaId = await uploadMedia(buffer, filename, mimeType);
        console.log(`[share-report-whatsapp] Media uploaded successfully. mediaId: ${mediaId}`);

        // Sanitize summary for template body parameter (Meta disallows raw newlines in some params)
        const summaryText = (subtitle || customNote || "Branch Analytics & Operational Summary")
          .replace(/[\r\n]+/g, " ")
          .trim();

        const templatePayload = buildReportDeliveryWithDocument(formattedPhone, {
          recipientName: recipientName || "Director",
          reportTitle: title || "Management Report",
          reportType: format ? `${format.toUpperCase()} Report` : "ERP Analytics",
          date: dateStr,
          summary: summaryText,
          mediaId: mediaId,
          filename: filename,
        });

        console.log(`[share-report-whatsapp] Sending template smartup_report_delivery to ${formattedPhone}...`);
        const sendResult = await sendTemplate(templatePayload);
        const msgId = sendResult.messages?.[0]?.id;
        console.log(`[share-report-whatsapp] Template sent successfully! Message ID: ${msgId}`);

        return NextResponse.json({
          success: true,
          metaSent: true,
          messageId: msgId,
          message: `Report document attached and sent directly to +${formattedPhone} from SmartUp ERP WhatsApp!`,
        });
      } catch (metaErr: unknown) {
        console.error("[share-report-whatsapp Meta delivery failed]", metaErr);
        // If Meta fails, proceed to token generation & fallback link
      }
    }

    // Fallback: Store file buffer in temporary public download cache & provide link
    const token = storeReportFile(buffer, filename, mimeType);
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartuplearning.net";
    if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      baseUrl = "https://smartuplearning.net";
    }
    const publicDownloadUrl = `${baseUrl}/api/public/reports/download/${token}`;

    let caption = `📊 *SmartUp ERP - ${title}*\n📅 Date: ${dateStr}`;
    if (subtitle) caption += `\n📌 ${subtitle}`;
    if (customNote) caption += `\n💬 "${customNote}"`;
    caption += `\n\nGenerated via SmartUp ERP Portal`;

    const directWaUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(
      `${caption}\n\n📥 *Download Report File:* ${publicDownloadUrl}`
    )}`;

    return NextResponse.json({
      success: true,
      metaSent: false,
      fallbackUrl: directWaUrl,
      publicDownloadUrl: publicDownloadUrl,
      message: `WhatsApp direct link generated for +${formattedPhone}`,
    });
  } catch (err: unknown) {
    console.error("[share-report-whatsapp fatal error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}
