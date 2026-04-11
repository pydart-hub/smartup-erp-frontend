"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Users,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCourseSchedules, type CourseSchedule } from "@/lib/api/courseSchedule";

export default function InstructorTopicCoveragePage() {
  const { instructorName, defaultCompany } = useAuth();

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
    queryKey: ["topic-coverage-instructor", instructorName, fromDate, toDate],
    queryFn: () =>
      getCourseSchedules({
        instructor: instructorName || undefined,
        from_date: fromDate,
        to_date: toDate,
        limit_page_length: 500,
      }),
    staleTime: 2 * 60_000,
    enabled: !!instructorName,
  });

  // Group by course+student_group
  const courseGroups = useMemo(() => {
    const schedules = (scheduleRes?.data ?? []).filter((s: CourseSchedule) => s.custom_topic);
    const map = new Map<string, CourseSchedule[]>();
    for (const s of schedules) {
      const key = `${s.course}::${s.student_group}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .map(([, records]) => {
        const first = records[0];
        const total = records.length;
        const covered = records.filter((r) => r.custom_topic_covered).length;
        return {
          course: first.course,
          student_group: first.student_group,
          total,
          covered,
          topics: records.map((r) => ({
            name: r.custom_topic!,
            covered: !!r.custom_topic_covered,
            date: r.schedule_date,
          })),
        };
      })
      .sort((a, b) => a.course.localeCompare(b.course));
  }, [scheduleRes]);

  const totalSessions = courseGroups.reduce((a, c) => a + c.total, 0);
  const coveredTotal = courseGroups.reduce((a, c) => a + c.covered, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          My Topic Coverage
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track your topic-wise class completion progress
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{totalSessions}</p>
            <p className="text-xs text-text-secondary mt-1">Total</p>
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

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && courseGroups.length === 0 && (
        <div className="text-center py-16 text-text-secondary text-sm">
          No topic-assigned schedules found yet.
        </div>
      )}

      {!isLoading && courseGroups.length > 0 && (
        <div className="space-y-4">
          {courseGroups.map((cg) => {
            const pct = cg.total > 0 ? Math.round((cg.covered / cg.total) * 100) : 0;
            return (
              <Card key={`${cg.course}::${cg.student_group}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-text-primary">{cg.course}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Users className="h-3 w-3" />
                        {cg.student_group}
                      </span>
                    </div>
                    <Badge variant={pct === 100 ? "success" : pct > 50 ? "warning" : "outline"}>
                      {pct}% · {cg.covered}/{cg.total}
                    </Badge>
                  </div>

                  <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {cg.topics.map((t, i) => (
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
