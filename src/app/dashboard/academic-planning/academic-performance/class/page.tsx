"use client";

import { Suspense } from "react";
import { AcademicPerformanceClassView } from "@/components/academic-performance/AcademicPerformanceClassView";

export default function AcademicPlanningClassPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface rounded animate-pulse" />
          <div className="h-72 bg-surface rounded-2xl animate-pulse" />
        </div>
      }
    >
      <AcademicPerformanceClassView
        basePath="/dashboard/academic-planning/academic-performance"
        rolePrefix="/dashboard/academic-planning"
      />
    </Suspense>
  );
}
