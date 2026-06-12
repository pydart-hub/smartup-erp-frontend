"use client";

import React from "react";
import { useParams } from "next/navigation";
import { InstructorAssignmentDetail } from "@/components/work-assignments";

export default function BranchManagerAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) return null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Work Assignment</h1>
        <p className="mt-2 text-gray-600">
          Review assignment details and submit your work before the deadline
        </p>
      </div>

      <InstructorAssignmentDetail
        assignmentId={decodeURIComponent(id)}
        recipientType="Branch Manager"
        basePath="/dashboard/branch-manager/my-assignments"
      />
    </div>
  );
}
