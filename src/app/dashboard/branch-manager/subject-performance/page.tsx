"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useAuth } from "@/lib/hooks/useAuth";
import BranchPerformanceHub from "@/components/branch-manager/BranchPerformanceHub";

function SubjectPerformanceContent() {
  const searchParams = useSearchParams();
  const { defaultCompany } = useAuth();

  const urlBranch = searchParams.get("branch") || "";
  const activeBranch = urlBranch || defaultCompany || "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subject Performance</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Subject-wise pass rates, class drilldowns, batch scores & exam analytics for {activeBranch || "your branch"}.
          </p>
        </div>
      </div>

      {/* Dedicated Subject-Wise Performance View */}
      <BranchPerformanceHub
        branchName={activeBranch}
        defaultTab="subject_wise"
        hideTabSwitcher={true}
      />
    </div>
  );
}

export default function SubjectPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface rounded animate-pulse" />
          <div className="h-64 bg-surface rounded-2xl animate-pulse" />
        </div>
      }
    >
      <SubjectPerformanceContent />
    </Suspense>
  );
}
