"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllBranches } from "@/lib/api/director";
import type { ReportDefinition, ReportFilters } from "@/lib/reports/definitions";

interface ReportFiltersBarProps {
  definition: ReportDefinition;
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}

export function ReportFiltersBar({ definition, filters, onChange }: ReportFiltersBarProps) {
  const hasBranch = definition.filters.some((f) => f.type === "branch");
  const hasStatus = definition.filters.some((f) => f.type === "status");
  const hasDateRange = definition.filters.some((f) => f.type === "date-range");

  const { data: branches } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
    enabled: hasBranch,
  });

  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-surface rounded-[14px] border border-border-light">
      {hasBranch && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Branch</label>
          <select
            className="h-9 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[180px]"
            value={filters.branch ?? ""}
            onChange={(e) => onChange({ ...filters, branch: e.target.value })}
          >
            <option value="">All Branches</option>
            {activeBranches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name.replace("Smart Up ", "")}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasStatus && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Status</label>
          <select
            className="h-9 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[140px]"
            value={filters.status ?? "all"}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      )}

      {hasDateRange && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">From Date</label>
            <input
              type="date"
              className="h-9 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={filters.fromDate ?? ""}
              onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">To Date</label>
            <input
              type="date"
              className="h-9 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={filters.toDate ?? ""}
              onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}
