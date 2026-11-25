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
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCrashCourseBranchProgress } from "@/lib/api/crashCourse";
import type { CrashCourseBranchProgress } from "@/lib/types/crashCourse";
import { TargetProgressBar } from "@/components/crash-course/TargetProgressBar";
import { formatINR } from "@/lib/utils/crashCoursePricing";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

export default function DirectorCrashCoursePerformancePage() {
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
  const totalOutstanding = progressData.reduce(
    (sum, b) => sum + b.totalOutstanding,
    0
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Zap className="w-3.5 h-3.5" />
            <span>Executive Oversight</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-1">
            Crash Course 2026–27 Multi-Branch Tracker
          </h1>
          <p className="text-sm text-text-muted">
            Executive monitoring across Palluruthy, Thoppumpady & Fort Kochi
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
            <span>Refresh Data</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/dashboard/sales-user/admit-crash-course")}
            className="flex items-center gap-1.5"
          >
            <span>Admit Student</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Total Admissions
          </span>
          <div className="text-3xl font-bold text-text-primary">
            {totalEnrolled}
          </div>
          <div className="text-xs text-text-muted flex justify-between pt-1">
            <span>Overall Target:</span>
            <span className="font-semibold text-text-primary">360–450 students</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Min Viability Threshold (240)
          </span>
          <div className="text-3xl font-bold text-primary">
            {Math.min(100, Math.round((totalEnrolled / totalMinTarget) * 100))}%
          </div>
          <span className="text-xs text-text-muted block pt-1">
            {Math.max(0, totalMinTarget - totalEnrolled)} students to breakeven
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Revenue Realized
          </span>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(totalCollected)}
          </div>
          <span className="text-xs text-text-muted block pt-1">
            Total Invoiced: {formatINR(totalRevenue)}
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-muted font-medium">
            Pending / Outstanding
          </span>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {formatINR(totalOutstanding)}
          </div>
          <span className="text-xs text-text-muted block pt-1">
            Collectable through payment links
          </span>
        </div>
      </div>

      {/* Branch Target Progress Grid */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-text-primary">
            Branch Target Achievement (Palluruthy, Thoppumpady, Fort Kochi)
          </h2>
          <span className="text-xs text-text-muted">
            Target: 80 Min / 120–150 Recommended per branch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {progressData.map((branchProgress) => (
            <TargetProgressBar
              key={branchProgress.company}
              progress={branchProgress}
            />
          ))}
        </div>
      </div>

      {/* Batches Table & Policy Compliance */}
      <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Active Crash Course Batches & Capacity Health
            </h3>
            <p className="text-xs text-text-muted">
              Monitoring 20–50 students/class limit across all 3 branches
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict 50-student batch cap enforced in ERP</span>
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
                <th className="pb-3 font-semibold">Seat Gauge (20–50)</th>
                <th className="pb-3 font-semibold text-right">Batch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {progressData.flatMap((b) => b.batches).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-muted">
                    No active crash course batches yet.
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
                        {batch.enrolled_count} / {batch.max_capacity}
                      </td>
                      <td className="py-3">
                        <div className="w-36 h-2 rounded-full bg-muted overflow-hidden">
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
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            batch.is_full
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : batch.is_near_capacity
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}
                        >
                          {batch.is_full
                            ? "At Max Capacity (50)"
                            : `${batch.seats_remaining} seats remaining`}
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
