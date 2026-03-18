"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, FileBarChart } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReportSelector } from "@/components/reports/ReportSelector";
import { ReportFiltersBar } from "@/components/reports/ReportFilters";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { ExportButton } from "@/components/reports/ExportButton";
import { REPORT_DEFINITIONS, getReportDefinition } from "@/lib/reports/definitions";
import type { ReportFilters } from "@/lib/reports/definitions";
import apiClient from "@/lib/api/client";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/** Fetch preview data using the proxy (client-side), limited to 50 rows */
async function fetchPreview(
  reportKey: string,
  filters: ReportFilters,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const def = getReportDefinition(reportKey);
  if (!def) return { rows: [], total: 0 };

  const steps = def.buildFetch(filters);
  if (!steps.length) return { rows: [], total: 0 };

  // Use first step only for preview
  const step = steps[0];

  // Get total count
  const countParams = new URLSearchParams({
    doctype: step.doctype,
    filters: JSON.stringify(step.filters),
  });
  const { data: countData } = await apiClient.get(
    `/method/frappe.client.get_count?${countParams}`,
  );
  const total: number = countData?.message ?? 0;

  // Get first 50 rows for preview
  const listParams = new URLSearchParams({
    fields: JSON.stringify(step.fields),
    filters: JSON.stringify(step.filters),
    limit_page_length: "50",
    ...(step.orderBy ? { order_by: step.orderBy } : {}),
  });
  const { data: listData } = await apiClient.get(
    `/resource/${step.doctype}?${listParams}`,
  );
  let rows: Record<string, unknown>[] = listData?.data ?? [];

  // Apply postProcess if exists
  if (def.postProcess) {
    rows = def.postProcess([rows]);
  }

  return { rows, total };
}

export default function DirectorReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});

  const definition = selectedReport ? getReportDefinition(selectedReport) : null;

  const handleSelectReport = useCallback((key: string) => {
    setSelectedReport(key);
    setFilters({}); // reset filters when switching reports
  }, []);

  // Preview query — auto-fetches when report + filters change
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["report-preview", selectedReport, filters],
    queryFn: () => fetchPreview(selectedReport!, filters),
    enabled: !!selectedReport,
    staleTime: 30_000,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
              <p className="text-text-secondary text-sm mt-0.5">
                Export data as Excel or CSV
              </p>
            </div>
          </div>
          <Badge variant="default" className="self-start px-3 py-1 text-sm">
            {REPORT_DEFINITIONS.length} reports available
          </Badge>
        </div>
      </motion.div>

      {/* Step 1: Select Report */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Select Report
        </h2>
        <ReportSelector
          reports={REPORT_DEFINITIONS}
          selected={selectedReport}
          onSelect={handleSelectReport}
        />
      </motion.div>

      {/* Step 2: Filters + Export (shown after selection) */}
      {definition && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                Filters
              </h2>
              <ReportFiltersBar
                definition={definition}
                filters={filters}
                onChange={setFilters}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetchPreview()}>
                Refresh Preview
              </Button>
              {preview && (
                <p className="text-xs text-text-tertiary">
                  {preview.total.toLocaleString()} total records
                </p>
              )}
            </div>
            <ExportButton
              reportType={selectedReport!}
              filters={filters}
              disabled={!preview || preview.total === 0}
            />
          </div>

          {/* Preview */}
          <motion.div variants={itemVariants}>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
              Preview
            </h2>
            {previewLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <AlertCircle className="h-6 w-6 text-error" />
                <p className="text-sm text-error">Failed to load preview</p>
              </div>
            ) : preview ? (
              <ReportPreview
                columns={definition.columns}
                rows={preview.rows}
                totalCount={preview.total}
              />
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
