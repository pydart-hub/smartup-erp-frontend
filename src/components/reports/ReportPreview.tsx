"use client";

import React from "react";
import type { ReportColumn } from "@/lib/reports/definitions";

interface ReportPreviewProps {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totalCount: number;
}

export function ReportPreview({ columns, rows, totalCount }: ReportPreviewProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        No records found. Adjust your filters and try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-tertiary">
          Showing {rows.length} of {totalCount} records
          {rows.length < totalCount && " (preview)"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-brand-wash/30 transition-colors">
                {columns.map((col) => {
                  const raw = row[col.key];
                  const display = col.transform ? col.transform(raw) : (raw ?? "—");
                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2 text-text-primary whitespace-nowrap"
                    >
                      {String(display)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
