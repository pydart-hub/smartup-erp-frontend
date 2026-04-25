"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  BarChart3,
  FileText,
  Calendar,
  Clock,
  Hash,
  ChevronLeft,
  Search,
  ClipboardList,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getAssessmentPlans,
  getAssessmentGroups,
} from "@/lib/api/assessment";
import type { AssessmentGroup, AssessmentPlan } from "@/lib/types/assessment";

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

export default function DirectorBranchExamsPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.branch as string);

  const [examSearch, setExamSearch] = useState("");
  const [examGroupFilter, setExamGroupFilter] = useState<string>("all");

  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["director-branch-exams", branchName],
    queryFn: () => getAssessmentPlans({ custom_branch: branchName }),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let result = exams;
    if (examGroupFilter !== "all") {
      result = result.filter((e) => e.assessment_group === examGroupFilter);
    }
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.course?.toLowerCase().includes(q) ||
          e.student_group?.toLowerCase().includes(q) ||
          e.assessment_name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [exams, examGroupFilter, examSearch]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: exams.length,
      upcoming: exams.filter((e) => e.schedule_date >= today).length,
      completed: exams.filter((e) => e.schedule_date < today).length,
      groups: new Set(exams.map((e) => e.assessment_group)).size,
    };
  }, [exams]);

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
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/director/exams">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{branchName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">Exams and student marks</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Total</p>
        </div>
        <div className="bg-brand-wash rounded-[12px] p-3 text-center border border-primary/10">
          <p className="text-2xl font-bold text-primary">{stats.upcoming}</p>
          <p className="text-xs text-primary font-medium mt-0.5">Upcoming</p>
        </div>
        <div className="bg-success-light rounded-[12px] p-3 text-center border border-success/10">
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
          <p className="text-xs text-success font-medium mt-0.5">Completed</p>
        </div>
        <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{stats.groups}</p>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Exam Types</p>
        </div>
      </div>

      {/* Section 1: Exam List */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> All Exams
          {filtered.length > 0 && <Badge variant="outline">{filtered.length}</Badge>}
        </h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by course, batch..."
              value={examSearch}
              onChange={(e) => setExamSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-border-input bg-surface text-sm"
            />
          </div>
          <select
            value={examGroupFilter}
            onChange={(e) => setExamGroupFilter(e.target.value)}
            className="h-9 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-[160px]"
          >
            <option value="all">All Types</option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.assessment_group_name}
              </option>
            ))}
          </select>
        </div>

        {examsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-text-tertiary mb-2" />
              <p className="text-sm text-text-secondary">
                {exams.length === 0
                  ? "No exams created for this branch yet."
                  : "No exams match your search / filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedByDate.map(([date, dateExams]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="text-xs font-semibold text-text-secondary">
                    {formatDate(date)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {dateExams.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {dateExams.map((exam) => {
                    const today = new Date().toISOString().split("T")[0];
                    const isPast = exam.schedule_date < today;
                    const isToday = exam.schedule_date === today;
                    const isDone = isPast && exam.docstatus === 1;
                    const cardContent = (
                      <CardContent className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-text-primary text-sm truncate">
                                {exam.course}
                              </h3>
                              <Badge
                                variant={isPast ? "success" : isToday ? "warning" : "outline"}
                                className="text-[10px]"
                              >
                                {isPast ? "Done" : isToday ? "Today" : "Upcoming"}
                              </Badge>
                              {isDone && (
                                <span className="text-[10px] text-primary font-medium">View Results →</span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {exam.student_group}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-tertiary flex-shrink-0">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {exam.assessment_group}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12h(exam.from_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {exam.maximum_assessment_score}
                            </span>
                          </div>
                        </div>
                        </CardContent>
                    );
                    if (isDone) {
                      return (
                        <Link
                          key={exam.name}
                          href={`/dashboard/director/exams/${encodeURIComponent(branchName)}/${encodeURIComponent(exam.name)}`}
                        >
                          <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                            {cardContent}
                          </Card>
                        </Link>
                      );
                    }
                    return (
                      <Card key={exam.name} className="transition-all">
                        {cardContent}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
