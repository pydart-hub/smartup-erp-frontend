"use client";

import { toast } from "sonner";

export interface ShareReportOptions {
  title: string;
  subtitle?: string;
  format?: "xlsx" | "csv";
  fetchFile: (format: "xlsx" | "csv") => Promise<{ blob: Blob; filename: string }>;
}

/**
 * Normalise mobile input to E.164 without leading zeros (defaults to India 91 prefix if 10 digits)
 */
export function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Format clean heading text for WhatsApp message
 */
export function generateWhatsAppHeading(
  title: string,
  subtitle?: string,
  customNote?: string
): string {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  let text = `📊 *SmartUp ERP - ${title}*\n📅 Date: ${dateStr}`;
  if (subtitle) {
    text += `\n📌 ${subtitle}`;
  }
  if (customNote) {
    text += `\n💬 "${customNote}"`;
  }
  text += `\n\nGenerated via SmartUp ERP Portal`;
  return text;
}

/**
 * Helper to check if current environment is a mobile browser
 */
function isMobileBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Download a blob file to user's device
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share report to WhatsApp
 * On Mobile: uses native Web Share API with file attachment.
 * On Desktop / Fallback: downloads file & opens WhatsApp Web with pre-filled heading message.
 */
export async function shareReportToWhatsApp({
  title,
  subtitle,
  format = "xlsx",
  fetchFile,
}: ShareReportOptions) {
  try {
    toast.loading("Preparing report file for WhatsApp...", { id: "wa-share" });

    const headingText = generateWhatsAppHeading(title, subtitle);
    const { blob, filename } = await fetchFile(format);
    const mimeType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";

    const file = new File([blob], filename, { type: mimeType });

    // On mobile devices supporting Web Share API, try native share dialog
    if (
      isMobileBrowser() &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        toast.dismiss("wa-share");
        await navigator.share({
          title: `SmartUp ERP - ${title}`,
          text: headingText,
          files: [file],
        });
        toast.success("Shared to WhatsApp successfully");
        return;
      } catch (shareErr: unknown) {
        // If user cancelled, don't fallback
        if (shareErr instanceof Error && shareErr.name === "AbortError") {
          return;
        }
        // If native share failed on mobile, fall through to web fallback below
      }
    }

    // Standard Desktop & Web Fallback:
    // 1. Download report file
    downloadFile(blob, filename);

    // 2. Open WhatsApp Web / App with pre-filled heading text
    const encodedText = encodeURIComponent(headingText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");

    toast.dismiss("wa-share");
    toast.success(`Report downloaded (${filename})! Attach it in your WhatsApp chat.`, {
      duration: 6000,
    });
  } catch (err: unknown) {
    toast.dismiss("wa-share");
    toast.error(err instanceof Error ? err.message : "Failed to share report to WhatsApp");
  }
}

/**
 * Share report via Email (opens mailto: with subject and heading & downloads file)
 */
export async function shareReportViaEmail({
  title,
  subtitle,
  format = "xlsx",
  fetchFile,
}: ShareReportOptions) {
  try {
    toast.loading("Preparing report file for email...", { id: "email-share" });
    const { blob, filename } = await fetchFile(format);

    // 1. Download actual report file so user has it ready to attach
    downloadFile(blob, filename);

    // 2. Open default mail app with prefilled subject & body text
    const subject = `SmartUp ERP Report: ${title}`;
    const bodyText = `${generateWhatsAppHeading(
      title,
      subtitle
    )}\n\n(The report file "${filename}" has been downloaded to your computer. Please attach it to this email.)`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      bodyText
    )}`;

    window.location.href = mailtoUrl;

    toast.dismiss("email-share");
    toast.success(`Opening email client. Attach the downloaded file (${filename}).`, {
      duration: 6000,
    });
  } catch (err: unknown) {
    toast.dismiss("email-share");
    toast.error(err instanceof Error ? err.message : "Failed to open email client");
  }
}
