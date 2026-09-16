import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/utils/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipientEmail,
      subject,
      title,
      subtitle,
      customMessage,
      format,
      filename,
      fileBase64,
    } = body;

    if (!recipientEmail || !fileBase64 || !filename) {
      return NextResponse.json(
        { error: "Recipient email and report file data are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const mimeType =
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 12px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">SmartUp ERP Report</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Report Generated on ${dateStr}</p>
        </div>

        <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">Hello,</p>
        <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">
          Please find attached the official report spreadsheet for <strong>${title}</strong>.
        </p>

        ${
          subtitle
            ? `<div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #334155; font-size: 13px; font-weight: bold;">Summary Highlight:</p>
                <p style="margin: 4px 0 0 0; color: #475569; font-size: 13px;">${subtitle}</p>
              </div>`
            : ""
        }

        ${
          customMessage
            ? `<div style="background-color: #f1f5f9; padding: 12px 16px; margin: 16px 0; border-radius: 8px;">
                <p style="margin: 0; color: #334155; font-size: 13px; font-style: italic;">"${customMessage}"</p>
              </div>`
            : ""
        }

        <p style="color: #64748b; font-size: 12px; margin-top: 32px; border-t: 1px solid #e2e8f0; padding-top: 16px;">
          SmartUp ERP System &bull; Confidential Education Analytics Report
        </p>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject: subject || `SmartUp ERP Report: ${title}`,
      html: htmlContent,
      attachments: [
        {
          filename: filename,
          content: buffer,
          contentType: mimeType,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Report attached and sent to ${recipientEmail}`,
    });
  } catch (err: unknown) {
    console.error("[share-report-email error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send report email" },
      { status: 500 }
    );
  }
}
