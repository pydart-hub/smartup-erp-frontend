"use client";

import { Suspense } from "react";
import { AcademicPerformanceClassView } from "@/components/academic-performance/AcademicPerformanceClassView";

export default function GeneralManagerClassPerformancePage() {
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
        basePath="/dashboard/general-manager/academic-performance"
        rolePrefix="/dashboard/general-manager"
      />
    </Suspense>
  );
}
