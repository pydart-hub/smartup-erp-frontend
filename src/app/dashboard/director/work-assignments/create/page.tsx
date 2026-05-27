"use client";

import React from "react";
import { WorkAssignmentForm } from "@/components/work-assignments";

const BASE_PATH = "/dashboard/director/work-assignments";

export default function DirectorWorkAssignmentCreatePage() {
  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Work Assignment</h1>
        <p className="mt-2 text-gray-600">Assign work to instructors and branch managers with a shared deadline.</p>
      </div>

      <WorkAssignmentForm basePath={BASE_PATH} />
    </div>
  );
}
