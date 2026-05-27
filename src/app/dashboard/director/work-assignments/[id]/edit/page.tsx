"use client";

import React from "react";
import { useParams } from "next/navigation";
import { WorkAssignmentForm } from "@/components/work-assignments";

const BASE_PATH = "/dashboard/director/work-assignments";

export default function DirectorEditWorkAssignmentPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Work Assignment</h1>
        <p className="mt-2 text-gray-600">Update the assignment details below.</p>
      </div>

      <WorkAssignmentForm assignmentId={decodeURIComponent(id)} basePath={BASE_PATH} />
    </div>
  );
}
