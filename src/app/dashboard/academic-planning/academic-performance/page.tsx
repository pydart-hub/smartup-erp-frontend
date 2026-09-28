"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { AcademicPerformanceDashboard } from "@/components/academic-performance/AcademicPerformanceDashboard";

export default function AcademicPlanningAcademicPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      }
    >
      <AcademicPerformanceDashboard
        basePath="/dashboard/academic-planning/academic-performance"
        roleTitle="Academic Planning Dept"
      />
    </Suspense>
  );
}
