"use client";

import React from "react";
import { useParams } from "next/navigation";
import { InstructorAssignmentDetail } from "@/components/work-assignments";

export default function InstructorAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assignment Detail</h1>
        <p className="mt-2 text-gray-600">Track your status and submit your work before deadline.</p>
      </div>

      <InstructorAssignmentDetail assignmentId={decodeURIComponent(id)} />
    </div>
  );
}
