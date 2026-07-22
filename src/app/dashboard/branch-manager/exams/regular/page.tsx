"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  FileText,
  Calendar,
  Search,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Clock,
  Users,
  FlaskConical,
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

export default function BranchManagerRegularExamsPage() {
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
    };
  }, [exams]);

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
            Manage course exams, subject tests, and scheduled assessments for {defaultCompany || "your branch"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/branch-manager/exams/create">
            <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4" />
              Create Regular Exam
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/exams/analytics">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total Exams</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-info shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Upcoming</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.upcoming}</p>
            </div>
            <div className="p-3 bg-info/10 rounded-2xl text-info">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-2xl text-success">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by exam name, course, batch, or examiner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary cursor-pointer font-medium"
          >
            <option value="all">All Exam Groups</option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam List */}
      {isLoading ? (
        <div className="py-16 text-center text-text-tertiary flex flex-col items-center gap-3">
          <GifLoader size="lg" />
          <p className="text-sm">Fetching exam records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="mx-auto h-12 w-12 text-text-tertiary/50 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">No regular exams found</h3>
          <p className="text-sm text-text-secondary mt-1">
            {search ? "Try adjusting your search or filter." : "Create your first regular exam to get started."}
          </p>
          {!search && (
            <Link href="/dashboard/branch-manager/exams/create" className="mt-4 inline-block">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Create Exam
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exam) => (
            <motion.div key={exam.name} variants={item}>
              <Link href={`/dashboard/branch-manager/exams/${exam.name}`}>
                <Card hover className="h-full border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
                        {exam.course || "General Course"}
                      </Badge>
                      <span className="text-xs text-text-tertiary font-mono">
                        {exam.name}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                      {exam.assessment_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-3">
                    <div className="space-y-1.5 text-xs text-text-secondary border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-text-tertiary" />
                        <span>Batch: <strong className="text-text-primary font-medium">{exam.student_group}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                        <span>Date: <strong className="text-text-primary font-medium">{formatDate(exam.schedule_date)}</strong></span>
                      </div>
                      {exam.from_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>Time: <strong className="text-text-primary font-medium">{formatTime12h(exam.from_time)} - {formatTime12h(exam.to_time)}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                      <span>View Exam Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
