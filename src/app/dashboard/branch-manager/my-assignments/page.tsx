"use client";

import React, { useState } from "react";
import { InstructorAssignmentList } from "@/components/work-assignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function BranchManagerAssignmentsPage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);

  const fmt = (n: number | null) => (n === null ? "--" : String(n));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">My Work Assignments</h1>
        <p className="mt-2 text-gray-600">
          Review your assignments and submit work before the deadline
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(activeCount)}</p>
            <p className="mt-1 text-xs text-gray-500">Assignments to complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{fmt(submittedCount)}</p>
            <p className="mt-1 text-xs text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(approvedCount)}</p>
            <p className="mt-1 text-xs text-gray-500">Completed and approved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructorAssignmentList
            recipientType="Branch Manager"
            basePath="/dashboard/branch-manager/my-assignments"
            onStatsChange={(a, s, ap) => {
              setActiveCount(a);
              setSubmittedCount(s);
              setApprovedCount(ap);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
