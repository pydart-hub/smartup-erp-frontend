"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  School,
  Users,
  GraduationCap,
  ChevronRight,
  List,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Receipt,
  Phone,
  Mail,
  Zap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import type {
  CrashCourseBranchDetailData,
  CrashCourseStudentRosterItem,
  CrashCourseClass,
} from "@/lib/types/crashCourse";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function formatRupee(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export default function CrashCourseBranchDrillDownPage() {
  const params = useParams();
  const pathname = usePathname();
  const rawBranch = decodeURIComponent((params.branch as string) || "");

  const isBranchManager = pathname.startsWith("/dashboard/branch-manager");
  const isSalesUser = pathname.startsWith("/dashboard/sales-user");
  const isGeneralManager = pathname.startsWith("/dashboard/general-manager");

  const basePath = isBranchManager
    ? "/dashboard/branch-manager/crash-course"
    : isSalesUser
    ? "/dashboard/sales-user/crash-course"
    : isGeneralManager
    ? "/dashboard/general-manager/crash-course"
    : "/dashboard/director/crash-course";

  const [selectedClass, setSelectedClass] = useState<CrashCourseClass | "All">("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<{
    success: boolean;
    data: CrashCourseBranchDetailData;
  }>({
    queryKey: ["crash-course-branch-detail", rawBranch],
    queryFn: async () => {
      const res = await fetch(`/api/crash-course/branch/${encodeURIComponent(rawBranch)}`);
      if (!res.ok) throw new Error("Failed to fetch branch Crash Course data");
      return res.json();
    },
    staleTime: 60_000,
  });

  const branchData = data?.data;
  const shortName = branchData?.shortName || rawBranch.replace("Smart Up ", "");

  // Filter students by selected program/class and search term
  const allStudents = branchData?.students || [];
  const filteredStudents = allStudents.filter((stu) => {
    const classMatch =
      selectedClass === "All" || stu.classLevel === selectedClass;
    const searchLower = search.toLowerCase();
    const searchMatch =
      !search ||
      stu.name.toLowerCase().includes(searchLower) ||
      stu.srrId.toLowerCase().includes(searchLower) ||
      (stu.phone && stu.phone.includes(searchLower)) ||
      (stu.batchName && stu.batchName.toLowerCase().includes(searchLower));
    return classMatch && searchMatch;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back button */}
      <motion.div variants={itemVariants}>
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Crash Course Overview
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span>Crash Course — {shortName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                2026–27
              </span>
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {branchData
                ? `${branchData.totalStudents} total students across ${branchData.programs.length} class programs`
                : "Loading branch details..."}
            </p>
            {branchData && branchData.totalStudents > 0 && (
              <p className="text-xs text-text-tertiary mt-1">
                All enrolled students are linked to active class batches and have registered invoices in Frappe.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Top 3 Summary Cards — matching Screenshot 3 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Students & Status */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-cyan-400/12 flex items-center justify-center mb-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">
              {isLoading ? (
                <span className="inline-block w-8 h-8 bg-border-light rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={branchData?.totalStudents ?? 0} />
              )}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">Total Crash Students</p>
            
            <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-border-light w-full">
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {branchData?.activeStudents ?? 0}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Active</p>
              </div>
              <div className="w-px bg-border-light self-stretch" />
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatRupee(branchData?.totalCollected ?? 0)}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Collected</p>
              </div>
              <div className="w-px bg-border-light self-stretch" />
              <div className="text-center">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatRupee(branchData?.totalDue ?? 0)}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Programs / Classes */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-400/12 flex items-center justify-center mb-2">
              <School className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">
              {isLoading ? (
                <span className="inline-block w-8 h-8 bg-border-light rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={branchData?.programsCount ?? 4} />
              )}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">Programs / Classes</p>
            
            <div className="flex justify-center items-center mt-3 pt-3 border-t border-border-light w-full">
              <p className="text-[11px] text-text-tertiary">
                Select a class card below to filter roster
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Batches */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-sky-400/12 flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-sky-400" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">
              {isLoading ? (
                <span className="inline-block w-8 h-8 bg-border-light rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={branchData?.activeBatchesCount ?? 0} />
              )}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">Active Batches</p>
            
            <div className="flex justify-center items-center mt-3 pt-3 border-t border-border-light w-full">
              <p className="text-[11px] text-text-tertiary">
                Guaranteed 20–50 students limit per batch
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* "Select a Program / Class" Section */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Select a Program / Class
          </h2>
          {selectedClass !== "All" && (
            <button
              onClick={() => setSelectedClass("All")}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Clear Filter (Show All)
            </button>
          )}
        </div>

        {/* Class Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(branchData?.programs || []).map((prog) => {
            const isSelected = selectedClass === prog.classLevel;
            return (
              <motion.div
                key={prog.program}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setSelectedClass((prev) =>
                    prev === prog.classLevel ? "All" : prog.classLevel
                  )
                }
                className="cursor-pointer"
              >
                <Card
                  className={`border transition-all duration-200 ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-md"
                      : "border-border-light hover:border-primary/30 bg-surface"
                  }`}
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <School className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary leading-tight">
                            {prog.program}
                          </p>
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            {prog.batches.length} batch{prog.batches.length !== 1 ? "es" : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isSelected ? "rotate-90 text-primary" : "text-text-tertiary"
                        }`}
                      />
                    </div>

                    {/* Batches tag list */}
                    {prog.batches.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {prog.batches.map((b) => (
                          <span
                            key={b.name}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border-light text-text-secondary"
                          >
                            {b.name} ({b.enrolled_count}/{b.max_capacity})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Student count & financials */}
                    <div className="pt-2 border-t border-border-light/60 flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-primary">
                        {prog.studentCount} student{prog.studentCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {formatRupee(prog.totalCollected)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Student Roster Table */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span>Enrolled Students</span>
              <Badge variant="outline" className="text-xs">
                {filteredStudents.length} of {allStudents.length}
              </Badge>
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search by name, SRR, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface text-xs"
            />
          </div>
        </div>

        <Card className="border-border-light overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-light bg-surface-subtle/50 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  <th className="py-3 px-4">SRR ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class & Batch</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Billed</th>
                  <th className="py-3 px-4 text-right">Collected</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-tertiary">
                      {search || selectedClass !== "All"
                        ? "No students match the current filter."
                        : "No students enrolled in this branch yet."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => (
                    <tr
                      key={stu.id}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-text-primary">
                        #{stu.srrId}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-text-primary">{stu.name}</p>
                        <p className="text-[10px] text-text-tertiary font-mono">{stu.id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-text-secondary">{stu.program}</p>
                        <p className="text-[10px] font-mono text-text-tertiary mt-0.5">
                          {stu.batchName || "Not assigned"}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {stu.phone && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="h-3 w-3 text-text-tertiary" />
                            <span>{stu.phone}</span>
                          </div>
                        )}
                        {stu.email && (
                          <div className="flex items-center gap-1 text-[10px] text-text-tertiary truncate max-w-[150px]">
                            <Mail className="h-2.5 w-2.5" />
                            <span>{stu.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-text-primary tabular-nums">
                        {formatRupee(stu.amountBilled)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatRupee(stu.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatRupee(stu.amountDue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            stu.paymentStatus === "Paid"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                              : stu.paymentStatus === "Partly Paid"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                              : "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/20"
                          }`}
                        >
                          {stu.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
