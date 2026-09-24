"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  BookOpen,
  Filter,
  GraduationCap,
  LayoutGrid,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/enrollment";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { AcademicPlanningBranchDrilldown } from "@/components/academic-planning/AcademicPlanningBranchDrilldown";
import APDPortionCompletionPage from "@/app/dashboard/academic-planning/portion-completion/page";

export default function DirectorPortionCompletionPage() {
  const [activeTab, setActiveTab] = useState<"drilldown" | "matrix">("drilldown");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Fetch branches for quick filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-director-pc"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNav />

      {/* Director Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                  Portion Completion & Syllabus Tracking
                </h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Director Overview
                </Badge>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                Centralized syllabus progression and milestone coverage across all campus branches.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Quick Branch Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main View Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-surface border border-border text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("drilldown")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "drilldown"
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-muted/50"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus Drilldown</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "matrix"
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-muted/50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Curriculum & Milestones</span>
            </button>
          </div>

          {/* Branch Quick Filter (active in drilldown mode) */}
          {activeTab === "drilldown" && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-tertiary" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-xs sm:text-sm border border-border rounded-xl px-3 py-1.5 sm:py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
              >
                <option value="all">All Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === "drilldown" ? (
          <motion.div
            key="drilldown-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <AcademicPlanningBranchDrilldown preselectedBranch={selectedBranch} />
          </motion.div>
        ) : (
          <motion.div
            key="matrix-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <APDPortionCompletionPage hideBreadcrumbs={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
