"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Building2, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/enrollment";
import { AcademicPlanningBranchDrilldown } from "@/components/academic-planning/AcademicPlanningBranchDrilldown";

export default function AcademicPlanningDashboardPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Fetch branches for quick filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-apd"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Clean APD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Academic Planning Dashboard
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Campus Overview
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            All branches curriculum and syllabus progression. Click any branch card to inspect classes, batches, and subjects.
          </p>
        </div>

        {/* Branch Quick Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
          >
            <option value="all">All Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: All Branches -> Classes -> Batches -> Subjects Drilldown */}
      <AcademicPlanningBranchDrilldown preselectedBranch={selectedBranch} />
    </div>
  );
}

