"use client";

import React, { useState } from "react";
import { WorkAssignmentList } from "@/components/work-assignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const BASE_PATH = "/dashboard/director/work-assignments";

export default function DirectorWorkAssignmentsPage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);

  const handleStatsChange = (active: number, pendingReview: number, completed: number, overdue: number) => {
    setActiveCount(active);
    setPendingReviewCount(pendingReview);
    setCompletedCount(completed);
    setOverdueCount(overdue);
  };

  const fmt = (n: number | null) => (n === null ? "--" : String(n));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mt-4">Work Assignments</h1>
        <p className="text-text-secondary mt-2">
          Create, manage, and review work assignments for instructors and branch managers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-text-secondary">Active Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-text-primary">{fmt(activeCount)}</p>
            <p className="text-xs text-text-tertiary mt-1">Assignments in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-text-secondary">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{fmt(pendingReviewCount)}</p>
            <p className="text-xs text-text-tertiary mt-1">Awaiting your approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-text-secondary">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{fmt(completedCount)}</p>
            <p className="text-xs text-text-tertiary mt-1">Fully approved assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-text-secondary">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(overdueCount)}</p>
            <p className="text-xs text-text-tertiary mt-1">Past deadline, not approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <WorkAssignmentList onStatsChange={handleStatsChange} basePath={BASE_PATH} />
    </div>
  );
}
