"use client";

import React, { useState } from "react";
import { X, MessageCircle, Send, ExternalLink, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { normalisePhone, generateWhatsAppHeading } from "@/lib/reports/report-share-helpers";
import { toast } from "sonner";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fetchFile: (format: "xlsx" | "csv") => Promise<{ blob: Blob; filename: string }>;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fetchFile,
}: WhatsAppShareModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [customNote, setCustomNote] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  // Primary Action: Dispatch via SmartUp ERP Meta Cloud API
  const handleSendViaBusinessAPI = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.trim().length < 8) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setSending(true);
    try {
      const formattedPhone = normalisePhone(phoneNumber);
      const { blob, filename } = await fetchFile(format);

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileBase64 = buffer.toString("base64");

      const res = await fetch("/api/director/share-report-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: formattedPhone,
          title,
          subtitle,
          customNote,
          format,
          filename,
          fileBase64,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send WhatsApp message");
      }

      if (json.metaSent) {
        toast.success(
          `Report attached and sent directly to +${formattedPhone} from SmartUp ERP WhatsApp!`,
          { duration: 6000 }
        );
      } else if (json.fallbackUrl) {
        // Trigger local file download so user has file ready
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.open(json.fallbackUrl, "_blank");
        toast.success(`Opened WhatsApp chat to +${formattedPhone}! Report file downloaded.`, {
          duration: 6000,
        });
      }

      setPhoneNumber("");
      setCustomNote("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  // Secondary Action: Open WhatsApp chat directly via wa.me link
  const handleOpenDirectWhatsApp = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setSending(true);
    try {
      const { blob, filename } = await fetchFile(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const formattedPhone = normalisePhone(phoneNumber);
      const headingText = generateWhatsAppHeading(title, subtitle, customNote);
      const encodedText = encodeURIComponent(headingText);

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
      window.open(whatsappUrl, "_blank");

      toast.success(
        `Opened WhatsApp chat to +${formattedPhone}! Report file (${filename}) downloaded.`,
        { duration: 6000 }
      );

      setPhoneNumber("");
      setCustomNote("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open WhatsApp");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface rounded-[16px] border border-border-light shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Send Report via WhatsApp</h3>
              <p className="text-xs text-text-secondary">Official SmartUp ERP Business Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-app-bg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSendViaBusinessAPI} className="space-y-4">
          {/* Recipient Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              WhatsApp Mobile Number *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-text-tertiary font-medium">
                +91
              </span>
              <input
                type="tel"
                required
                placeholder="e.g. 98466 60166"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-12 pr-3 py-2 rounded-[10px] border border-border-light bg-app-bg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">
              Enter 10-digit mobile number or full international format.
            </p>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Report Format
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-[10px] border text-xs font-medium transition-all ${
                  format === "xlsx"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                    : "border-border-light bg-app-bg text-text-secondary hover:text-text-primary"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-[10px] border text-xs font-medium transition-all ${
                  format === "csv"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                    : "border-border-light bg-app-bg text-text-secondary hover:text-text-primary"
                }`}
              >
                <FileText className="h-4 w-4 text-blue-600" />
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Custom Message / Note
            </label>
            <textarea
              rows={2}
              placeholder="Add an optional custom note to include in the message..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-border-light bg-app-bg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border-light space-y-2">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </Button>

              {/* Primary: Send via SmartUp ERP Business Account */}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={sending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Report...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Report to WhatsApp
                  </>
                )}
              </Button>
            </div>

            {/* Alternative: Open in WhatsApp Chat */}
            <button
              type="button"
              onClick={handleOpenDirectWhatsApp}
              disabled={sending}
              className="w-full text-center text-xs text-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 pt-1 flex items-center justify-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Or open in WhatsApp Web / App directly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
