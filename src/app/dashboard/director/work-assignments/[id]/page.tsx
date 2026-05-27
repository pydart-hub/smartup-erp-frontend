"use client";

import React from "react";
import { useParams } from "next/navigation";
import { WorkAssignmentDetail } from "@/components/work-assignments";

const BASE_PATH = "/dashboard/director/work-assignments";

export default function DirectorWorkAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Work Assignment Review</h1>
        <p className="mt-2 text-gray-600">Review instructor submissions and approve or reject inline.</p>
      </div>

      <WorkAssignmentDetail assignmentId={decodeURIComponent(id)} basePath={BASE_PATH} />
    </div>
  );
}
