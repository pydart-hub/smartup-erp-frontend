"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Users,
  TrendingUp,
  Award,
  Zap,
  ArrowRight,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCrashCourseBranchProgress } from "@/lib/api/crashCourse";
import type { CrashCourseBranchProgress } from "@/lib/types/crashCourse";
import { TargetProgressBar } from "@/components/crash-course/TargetProgressBar";
import { formatINR } from "@/lib/utils/crashCoursePricing";

export default function CrashCourseTargetsPage() {
  const router = useRouter();
  const [progressData, setProgressData] = useState<CrashCourseBranchProgress[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getCrashCourseBranchProgress();
      setProgressData(data);
    } catch (err) {
      console.error("Failed to fetch branch progress:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalEnrolled = progressData.reduce((sum, b) => sum + b.enrolledCount, 0);
  const totalMinTarget = 240; // 80 * 3
  const totalRecTarget = 450; // 150 * 3
  const totalRevenue = progressData.reduce(
    (sum, b) => sum + b.totalRevenuePotential,
    0
  );
  const totalCollected = progressData.reduce(
    (sum, b) => sum + b.totalCollected,
    0
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Zap className="w-3.5 h-3.5" />
            <span>SmartUp Crash Course 2026–27</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-1">
            Branch Admission Targets & Performance
          </h1>
          <p className="text-sm text-text-muted">
            Targeting 360–450 total admissions across Palluruthy, Thoppumpady & Fort Kochi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/dashboard/sales-user/admit-crash-course")}
            className="flex items-center gap-1.5"
          >
            <span>New Admission</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">Total Enrolled</span>
          <div className="text-3xl font-bold text-text-primary">
            {totalEnrolled}
          </div>
          <span className="text-xs text-text-muted block">
            Target: 360–450 students
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Min Target (240 Total)
          </span>
          <div className="text-3xl font-bold text-primary">
            {Math.min(100, Math.round((totalEnrolled / totalMinTarget) * 100))}%
          </div>
          <span className="text-xs text-text-muted block">
            {Math.max(0, totalMinTarget - totalEnrolled)} admits to reach minimum
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Rec Target (450 Total)
          </span>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {Math.min(100, Math.round((totalEnrolled / totalRecTarget) * 100))}%
          </div>
          <span className="text-xs text-text-muted block">
            {Math.max(0, totalRecTarget - totalEnrolled)} admits to reach max goal
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Revenue Realization
          </span>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(totalCollected)}
          </div>
          <span className="text-xs text-text-muted block">
            Of {formatINR(totalRevenue)} billed
          </span>
        </div>
      </div>

      {/* Branch Targets Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">
          Branch Milestone Progress (Min: 80 / Recommended: 120–150)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {progressData.map((branchProgress) => (
            <TargetProgressBar
              key={branchProgress.company}
              progress={branchProgress}
            />
          ))}
        </div>
      </div>

      {/* Batch Distribution Table */}
      <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Active Crash Course Batches
            </h3>
            <p className="text-xs text-text-muted">
              Strict batch size compliance: 20 to 50 students per class
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Batch Name</th>
                <th className="pb-3 font-semibold">Class</th>
                <th className="pb-3 font-semibold">Branch</th>
                <th className="pb-3 font-semibold">Enrolled</th>
                <th className="pb-3 font-semibold">Capacity (20–50)</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {progressData.flatMap((b) => b.batches).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-muted">
                    No crash course batches active yet. They will appear here once
                    students are admitted.
                  </td>
                </tr>
              ) : (
                progressData.flatMap((branch) =>
                  branch.batches.map((batch) => (
                    <tr key={batch.name} className="hover:bg-muted/20">
                      <td className="py-3 font-medium text-text-primary">
                        {batch.student_group_name || batch.name}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {batch.class_level}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {branch.branch}
                      </td>
                      <td className="py-3 font-semibold text-text-primary">
                        {batch.enrolled_count}
                      </td>
                      <td className="py-3">
                        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${
                              batch.is_full
                                ? "bg-red-500"
                                : batch.is_near_capacity
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (batch.enrolled_count / batch.max_capacity) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            batch.is_full
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : batch.is_near_capacity
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}
                        >
                          {batch.is_full
                            ? "Full"
                            : `${batch.seats_remaining} seats left`}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
