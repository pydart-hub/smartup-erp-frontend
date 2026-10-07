"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  Search,
  ClipboardList,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getAssessmentPlans,
  getAssessmentGroups,
  getSubmittedAssessmentPlanNames,
} from "@/lib/api/assessment";
import type { AssessmentPlan, AssessmentGroup } from "@/lib/types/assessment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime12h(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function BranchManagerRegularExamsPage() {
  const { defaultCompany } = useAuth();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "entered" | "pending">("all");

  // Fetch branch-scoped assessment plans
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["assessment-plans", defaultCompany],
    queryFn: () =>
      getAssessmentPlans({ custom_branch: defaultCompany || undefined }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Fetch assessment groups
  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  // Fetch submitted plans to determine if marks are entered
  const { data: submittedPlanNames = new Set<string>() } = useQuery<Set<string>>({
    queryKey: ["submitted-assessment-plan-names"],
    queryFn: getSubmittedAssessmentPlanNames,
    staleTime: 30_000,
  });

  // Filter + Search
  const filtered = useMemo(() => {
    let result = exams;

    if (groupFilter !== "all") {
      result = result.filter((e) => e.assessment_group === groupFilter);
    }

    if (statusFilter === "entered") {
      result = result.filter((e) => submittedPlanNames.has(e.name));
    } else if (statusFilter === "pending") {
      result = result.filter((e) => !submittedPlanNames.has(e.name));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.course?.toLowerCase().includes(q) ||
          e.assessment_name?.toLowerCase().includes(q) ||
          e.student_group?.toLowerCase().includes(q) ||
          e.examiner_name?.toLowerCase().includes(q) ||
          e.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [exams, groupFilter, statusFilter, search, submittedPlanNames]);

  // Statistics
  const stats = useMemo(() => {
    let enteredCount = 0;
    exams.forEach((e) => {
      if (submittedPlanNames.has(e.name)) enteredCount++;
    });

    return {
      total: exams.length,
      marksEntered: enteredCount,
      marksPending: exams.length - enteredCount,
    };
  }, [exams, submittedPlanNames]);

  const isLoading = examsLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <ClipboardList className="h-7 w-7 text-primary" />
            Regular Exams
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage course exams, view marks status, and enter student scores for {defaultCompany || "your branch"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/branch-manager/exams/analytics">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total Scheduled</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Marks Entered</p>
              <p className="text-2xl font-bold text-success mt-1">{stats.marksEntered}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-2xl text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Pending Entry</p>
              <p className="text-2xl font-bold text-warning mt-1">{stats.marksPending}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-2xl text-warning">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-surface p-4 rounded-2xl border border-border-light shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search exam name, course, batch, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary placeholder:text-text-tertiary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-border-light text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-text-primary shadow-xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "pending"
                  ? "bg-white dark:bg-slate-800 text-warning shadow-xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("entered")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "entered"
                  ? "bg-white dark:bg-slate-800 text-success shadow-xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Entered
            </button>
          </div>

          {/* Exam Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary cursor-pointer font-medium"
          >
            <option value="all">All Exam Categories</option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-text-tertiary flex flex-col items-center gap-3">
          <GifLoader size="lg" />
          <p className="text-sm font-medium animate-pulse">Loading branch examinations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="mx-auto h-12 w-12 text-text-tertiary/50 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">No examinations found</h3>
          <p className="text-sm text-text-secondary mt-1">
            {search || groupFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search criteria or active filters."
              : "No examinations currently scheduled for this branch."}
          </p>
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((exam) => {
            const hasMarks = submittedPlanNames.has(exam.name);
            return (
              <motion.div key={exam.name} variants={item}>
                <Link href={`/dashboard/branch-manager/exams/${encodeURIComponent(exam.name)}`}>
                  <Card
                    hover
                    className="h-full border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all overflow-hidden group flex flex-col justify-between"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 font-medium text-[11px]"
                        >
                          {exam.course || "General Paper"}
                        </Badge>
                        {hasMarks ? (
                          <Badge
                            variant="success"
                            className="text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Marks Entered
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            className="text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-2xs"
                          >
                            <AlertCircle className="w-3 h-3" /> Pending Entry
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                        {exam.assessment_name}
                      </CardTitle>
                      <p className="text-xs text-text-tertiary font-mono">{exam.name}</p>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-3">
                      <div className="space-y-1.5 text-xs text-text-secondary border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>
                            Batch:{" "}
                            <strong className="text-text-primary font-medium">
                              {exam.student_group}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>
                            Date:{" "}
                            <strong className="text-text-primary font-medium">
                              {formatDate(exam.schedule_date)}
                            </strong>
                          </span>
                        </div>
                        {exam.from_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                            <span>
                              Time:{" "}
                              <strong className="text-text-primary font-medium">
                                {formatTime12h(exam.from_time)} - {formatTime12h(exam.to_time)}
                              </strong>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>
                            Maximum Score:{" "}
                            <strong className="text-text-primary font-semibold">
                              {exam.maximum_assessment_score} Marks
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform border-t border-dashed border-border-light">
                        <span>{hasMarks ? "Review / Update Marks" : "Enter Student Marks"}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
