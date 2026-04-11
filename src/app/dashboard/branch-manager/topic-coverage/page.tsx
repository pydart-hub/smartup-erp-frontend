"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Users,
  GraduationCap,
  Loader2,
  Search,
  Filter,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCourseSchedules, type CourseSchedule } from "@/lib/api/courseSchedule";

// ── Types ────────────────────────────────────────────────────────────────────

interface CourseTopicStats {
  course: string;
  instructor_name: string;
  student_group: string;
  totalTopicSessions: number;
  coveredSessions: number;
  topics: { name: string; covered: boolean; date: string }[];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TopicCoveragePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || allowedCompanies[0] || "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "covered">("all");

  // Fetch all schedules with topics for this branch (last 90 days + next 30 days)
  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split("T")[0];
  }, []);
  const toDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ["topic-coverage-bm", branch, fromDate, toDate],
    queryFn: () =>
      getCourseSchedules({
        branch: branch || undefined,
        from_date: fromDate,
        to_date: toDate,
        limit_page_length: 500,
      }),
    staleTime: 2 * 60_000,
  });

  // Group schedules by course+instructor+student_group
  const courseStats: CourseTopicStats[] = useMemo(() => {
    const schedules = (scheduleRes?.data ?? []).filter((s) => s.custom_topic);
    const map = new Map<string, CourseSchedule[]>();
    for (const s of schedules) {
      const key = `${s.course}::${s.instructor_name}::${s.student_group}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .map(([, records]) => {
        const first = records[0];
        return {
          course: first.course,
          instructor_name: first.instructor_name,
          student_group: first.student_group,
          totalTopicSessions: records.length,
          coveredSessions: records.filter((r) => r.custom_topic_covered).length,
          topics: records.map((r) => ({
            name: r.custom_topic!,
            covered: !!r.custom_topic_covered,
            date: r.schedule_date,
          })),
        };
      })
      .sort((a, b) => a.course.localeCompare(b.course));
  }, [scheduleRes]);

  // Filter
  const filtered = useMemo(() => {
    let items = courseStats;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.course.toLowerCase().includes(q) ||
          c.instructor_name.toLowerCase().includes(q) ||
          c.student_group.toLowerCase().includes(q) ||
          c.topics.some((t) => t.name.toLowerCase().includes(q)),
      );
    }
    if (statusFilter === "covered") {
      items = items.filter((c) => c.coveredSessions === c.totalTopicSessions);
    } else if (statusFilter === "pending") {
      items = items.filter((c) => c.coveredSessions < c.totalTopicSessions);
    }
    return items;
  }, [courseStats, search, statusFilter]);

  const totalSessions = courseStats.reduce((a, c) => a + c.totalTopicSessions, 0);
  const coveredTotal = courseStats.reduce((a, c) => a + c.coveredSessions, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Topic Coverage
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Track topic-wise class completion across all batches · {branch}
          </p>
        </div>
        <Link href="/dashboard/branch-manager/topic-coverage/manage">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" />
            Manage Topics
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{totalSessions}</p>
            <p className="text-xs text-text-secondary mt-1">Total Topic Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{coveredTotal}</p>
            <p className="text-xs text-success mt-1">Covered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{totalSessions - coveredTotal}</p>
            <p className="text-xs text-warning mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course, instructor, batch, topic…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-tertiary" />
          {(["all", "pending", "covered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:text-primary"
              }`}
            >
              {f === "all" ? "All" : f === "pending" ? "Pending" : "Covered"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* No data */}
      {!isLoading && courseStats.length === 0 && (
        <div className="text-center py-16 text-text-secondary text-sm">
          No topic-assigned schedules found. Assign topics while creating schedules.
        </div>
      )}

      {/* Course cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((cs) => {
            const pct = cs.totalTopicSessions > 0
              ? Math.round((cs.coveredSessions / cs.totalTopicSessions) * 100)
              : 0;
            return (
              <Card key={`${cs.course}::${cs.instructor_name}::${cs.student_group}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-text-primary">{cs.course}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {cs.instructor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cs.student_group}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={pct === 100 ? "success" : pct > 50 ? "warning" : "outline"}
                    >
                      {pct}% · {cs.coveredSessions}/{cs.totalTopicSessions}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Topic list */}
                  <div className="flex flex-wrap gap-2">
                    {cs.topics.map((t, i) => (
                      <div
                        key={`${t.name}-${i}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                          t.covered
                            ? "bg-success/10 border-success/20 text-success"
                            : "bg-surface-secondary border-border-light text-text-secondary"
                        }`}
                      >
                        {t.covered ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        {t.name}
                        <span className="text-[10px] opacity-60">
                          {new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
