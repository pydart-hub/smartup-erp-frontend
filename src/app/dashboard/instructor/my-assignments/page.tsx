// Instructor My Assignments Listing Page
// File: src/app/dashboard/instructor/my-assignments/page.tsx

"use client";

import React, { useState } from "react";
import { InstructorAssignmentList } from "@/components/work-assignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function InstructorAssignmentsPage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);

  const fmt = (n: number | null) => (n === null ? "--" : String(n));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">My Work Assignments</h1>
        <p className="text-gray-600 mt-2">
          Review your assignments and submit work before the deadline
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(activeCount)}</p>
            <p className="text-xs text-gray-500 mt-1">Assignments to complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{fmt(submittedCount)}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(approvedCount)}</p>
            <p className="text-xs text-gray-500 mt-1">Completed & approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructorAssignmentList
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
