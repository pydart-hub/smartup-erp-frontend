"use client";

import React from "react";
import { AcademicPerformanceBatchView } from "@/components/academic-performance/AcademicPerformanceBatchView";

export default function AcademicPlanningBatchPerformancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface rounded animate-pulse" />
          <div className="h-80 bg-surface rounded-2xl animate-pulse" />
        </div>
      }
    >
      <AcademicPerformanceBatchView
        basePath="/dashboard/academic-planning/academic-performance"
        rolePrefix="/dashboard/academic-planning"
      />
    </React.Suspense>
  );
}
