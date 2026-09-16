"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmailShareModal } from "@/components/reports/EmailShareModal";
import { WhatsAppShareModal } from "@/components/reports/WhatsAppShareModal";
import { toast } from "sonner";

interface ShareReportMenuProps {
  title: string;
  subtitle?: string;
  onExport: (format: "xlsx" | "csv") => Promise<{ blob: Blob; filename: string }>;
  disabled?: boolean;
}

export function ShareReportMenu({
  title,
  subtitle,
  onExport,
  disabled = false,
}: ShareReportMenuProps) {
  const [loadingAction, setLoadingAction] = useState<"xlsx" | "csv" | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const handleExportDownload = async (format: "xlsx" | "csv") => {
    setLoadingAction(format);
    try {
      const { blob, filename } = await onExport(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded (${filename})`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = disabled || loadingAction !== null;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Excel Download */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleExportDownload("xlsx")}
          disabled={isBusy}
          title="Download Excel spreadsheet"
        >
          {loadingAction === "xlsx" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Excel
          <Download className="h-3.5 w-3.5 ml-0.5" />
        </Button>

        {/* CSV Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportDownload("csv")}
          disabled={isBusy}
          title="Download CSV file"
        >
          {loadingAction === "csv" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          CSV
          <Download className="h-3.5 w-3.5 ml-0.5" />
        </Button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-border-light mx-0.5" />

        {/* WhatsApp Share Button (Opens Modal for Phone Number Input) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsWhatsAppModalOpen(true)}
          disabled={isBusy}
          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/40 font-medium"
          title="Share report to specific WhatsApp phone number"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600/10" />
          WhatsApp
        </Button>

        {/* Email Share Button (Opens Modal for direct attachment sending) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEmailModalOpen(true)}
          disabled={isBusy}
          className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/40 font-medium"
          title="Send report attachment via email"
        >
          <Mail className="h-4 w-4 text-blue-600" />
          Email
        </Button>
      </div>

      {/* WhatsApp Share Phone Number Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title={title}
        subtitle={subtitle}
        fetchFile={onExport}
      />

      {/* Email Share Attachment Modal */}
      <EmailShareModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={title}
        subtitle={subtitle}
        fetchFile={onExport}
      />
    </>
  );
}
