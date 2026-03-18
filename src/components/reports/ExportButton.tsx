"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { ReportFilters } from "@/lib/reports/definitions";

interface ExportButtonProps {
  reportType: string;
  filters: ReportFilters;
  disabled?: boolean;
}

export function ExportButton({ reportType, filters, disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, filters, format }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || `Export failed (${res.status})`);
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `report.${format}`;

      // Download the blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="primary"
        size="sm"
        onClick={() => handleExport("xlsx")}
        disabled={disabled || loading !== null}
      >
        {loading === "xlsx" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Excel
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("csv")}
        disabled={disabled || loading !== null}
      >
        {loading === "csv" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        CSV
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
