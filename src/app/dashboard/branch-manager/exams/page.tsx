"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  FileText,
  Calendar,
  Search,
  Loader2,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Clock,
  Users,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAssessmentPlans, getAssessmentGroups } from "@/lib/api/assessment";
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
  if (!d) return "";
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

export default function BranchManagerExamsPage() {
  const { defaultCompany } = useAuth();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Fetch exams
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["assessment-plans", defaultCompany],
    queryFn: () =>
      getAssessmentPlans({ custom_branch: defaultCompany || undefined }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Fetch exam groups for filter
  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  // Filter + search
  const filtered = useMemo(() => {
    let result = exams;
    if (groupFilter !== "all") {
      result = result.filter((e) => e.assessment_group === groupFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.course?.toLowerCase().includes(q) ||
          e.assessment_name?.toLowerCase().includes(q) ||
          e.student_group?.toLowerCase().includes(q) ||
          e.examiner_name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [exams, groupFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: exams.length,
      upcoming: exams.filter((e) => e.schedule_date >= today).length,
      completed: exams.filter((e) => e.schedule_date < today).length,
      groups: new Set(exams.map((e) => e.assessment_group)).size,
    };
  }, [exams]);

  // Group exams by date for display
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AssessmentPlan[]>();
    for (const exam of filtered) {
      const date = exam.schedule_date || "Undated";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(exam);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exams</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Create exams, enter marks, and view results
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/branch-manager/exams/results">
            <Button variant="outline" size="md">
              <BarChart3 className="h-4 w-4" />
              Results
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/exams/create">
            <Button variant="primary" size="md">
              <Plus className="h-4 w-4" />
              Create Exam
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[12px] p-4 text-center border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary font-medium mt-1">Total Exams</p>
        </div>
        <div className="bg-brand-wash rounded-[12px] p-4 text-center border border-primary/10">
          <p className="text-2xl font-bold text-primary">{stats.upcoming}</p>
          <p className="text-xs text-primary font-medium mt-1">Upcoming</p>
        </div>
        <div className="bg-success-light rounded-[12px] p-4 text-center border border-success/10">
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
          <p className="text-xs text-success font-medium mt-1">Completed</p>
        </div>
        <div className="bg-surface rounded-[12px] p-4 text-center border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{stats.groups}</p>
          <p className="text-xs text-text-secondary font-medium mt-1">Exam Types</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search exams by course, batch, examiner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-border-input bg-surface text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-[180px]"
                >
                  <option value="all">All Exam Types</option>
                  {groups.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.assessment_group_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-text-tertiary mb-3" />
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {exams.length === 0 ? "No exams yet" : "No matching exams"}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {exams.length === 0
                  ? "Create your first exam to get started."
                  : "Try adjusting your search or filter."}
              </p>
              {exams.length === 0 && (
                <Link href="/dashboard/branch-manager/exams/create">
                  <Button variant="primary" size="md">
                    <Plus className="h-4 w-4" /> Create Exam
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Exam list grouped by date */}
      {!isLoading &&
        groupedByDate.map(([date, dateExams]) => (
          <motion.div key={date} variants={item}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-secondary">
                {formatDate(date)}
              </h2>
              <Badge variant="outline">{dateExams.length}</Badge>
            </div>
            <div className="grid gap-3">
              {dateExams.map((exam) => {
                const today = new Date().toISOString().split("T")[0];
                const isPast = exam.schedule_date < today;
                const isToday = exam.schedule_date === today;

                return (
                  <Link
                    key={exam.name}
                    href={`/dashboard/branch-manager/exams/${encodeURIComponent(exam.name)}`}
                  >
                    <Card className="hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-text-primary truncate">
                                {exam.course}
                              </h3>
                              <Badge
                                variant={
                                  isPast
                                    ? "success"
                                    : isToday
                                      ? "warning"
                                      : "outline"
                                }
                              >
                                {isPast
                                  ? "Completed"
                                  : isToday
                                    ? "Today"
                                    : "Upcoming"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {exam.assessment_group}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {exam.student_group}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime12h(exam.from_time)} –{" "}
                                {formatTime12h(exam.to_time)}
                              </span>
                              {exam.examiner_name && (
                                <span>Examiner: {exam.examiner_name}</span>
                              )}
                              <span>Max Score: {exam.maximum_assessment_score}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-text-tertiary shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ))}
    </motion.div>
  );
}
