"use client";

import React, { useState } from "react";
import { X, Mail, Send, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface EmailShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fetchFile: (format: "xlsx" | "csv") => Promise<{ blob: Blob; filename: string }>;
}

export function EmailShareModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fetchFile,
}: EmailShareModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setSending(true);
    try {
      // 1. Fetch file blob
      const { blob, filename } = await fetchFile(format);

      // Convert blob to base64 string
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileBase64 = buffer.toString("base64");

      // 2. Call API to send email with attachment
      const res = await fetch("/api/director/share-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          subject: `SmartUp ERP Report: ${title}`,
          title,
          subtitle,
          customMessage,
          format,
          filename,
          fileBase64,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send email");
      }

      toast.success(`Report emailed successfully to ${recipientEmail}!`);
      setRecipientEmail("");
      setCustomMessage("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send report email");
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
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Email Report Attachment</h3>
              <p className="text-xs text-text-secondary">{title}</p>
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
        <form onSubmit={handleSend} className="space-y-4">
          {/* Recipient Email */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Recipient Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. director@smartup.in, manager@gmail.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-border-light bg-app-bg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Attachment Format
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-[10px] border text-xs font-medium transition-all ${
                  format === "xlsx"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
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
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "border-border-light bg-app-bg text-text-secondary hover:text-text-primary"
                }`}
              >
                <FileText className="h-4 w-4 text-blue-600" />
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Optional Note / Message
            </label>
            <textarea
              rows={3}
              placeholder="Add any additional notes for the recipient..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-border-light bg-app-bg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Attachment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
