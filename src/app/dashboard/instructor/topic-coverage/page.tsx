"use client";

import React, { useMemo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PartyPopper,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getCourseSchedules,
  markTopicCovered,
  unmarkTopicCovered,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";

function isSessionEnded(schedule: CourseSchedule): boolean {
  const today = new Date().toISOString().split("T")[0];
  if (!schedule.schedule_date) return false;
  if (schedule.schedule_date < today) return true;
  if (schedule.schedule_date === today) {
    const [h, m] = (schedule.to_time || "23:59").split(":").map(Number);
    const now = new Date();
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }
  return false;
}

function fmtDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

interface TopicItem {
  scheduleName: string;
  topicName: string;
  covered: boolean;
  date: string;
  sessionEnded: boolean;
}

interface EventItem {
  scheduleName: string;
  title: string;
  eventType: string;
  studentGroup: string;
  done: boolean;
  date: string;
  sessionEnded: boolean;
}

export default function InstructorTopicCoveragePage() {
  const { instructorName, defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || allowedCompanies[0] || "";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"topics" | "events">("topics");

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

  // Query 1: instructor class topics (filtered by instructor)
  const queryKey = ["topic-coverage-instructor", instructorName, fromDate, toDate];

  const { data: scheduleRes, isLoading } = useQuery({
    queryKey,
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

  // Query 2: branch events (no instructor filter — events have instructor=null)
  const eventsQueryKey = ["topic-coverage-instructor-events", branch, fromDate, toDate];

  const { data: eventsRes, isLoading: eventsLoading } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () =>
      getCourseSchedules({
        branch: branch || undefined,
        from_date: fromDate,
        to_date: toDate,
        limit_page_length: 200,
      }),
    staleTime: 2 * 60_000,
    enabled: !!branch,
  });

  const markMutation = useMutation({
    mutationFn: markTopicCovered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      toast.success("Marked as covered");
    },
    onError: () => toast.error("Failed to update. Please try again."),
  });

  const unmarkMutation = useMutation({
    mutationFn: unmarkTopicCovered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      toast.success("Marked as pending");
    },
    onError: () => toast.error("Failed to update. Please try again."),
  });

  const isBusy = useCallback(
    (scheduleName: string) =>
      (markMutation.isPending && markMutation.variables === scheduleName) ||
      (unmarkMutation.isPending && unmarkMutation.variables === scheduleName),
    [markMutation, unmarkMutation],
  );

  // Class topic groups (from instructor query, no events)
  const courseGroups = useMemo(() => {
    const schedules = (scheduleRes?.data ?? []).filter(
      (s: CourseSchedule) => s.custom_topic && !s.custom_event_type,
    );
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
        const topics: TopicItem[] = records.map((r) => ({
          scheduleName: r.name,
          topicName: r.custom_topic!,
          covered: !!r.custom_topic_covered,
          date: r.schedule_date ?? "",
          sessionEnded: isSessionEnded(r),
        }));
        return { course: first.course, student_group: first.student_group, total, covered, topics };
      })
      .sort((a, b) => a.course.localeCompare(b.course));
  }, [scheduleRes]);

  // Events (from branch query — events have no instructor assigned)
  const events: EventItem[] = useMemo(() => {
    return (eventsRes?.data ?? [])
      .filter((s: CourseSchedule) => !!s.custom_event_type)
      .map((s: CourseSchedule) => ({
        scheduleName: s.name,
        title: s.custom_event_title || s.title || s.custom_event_type || "Event",
        eventType: s.custom_event_type!,
        studentGroup: s.student_group,
        done: !!s.custom_topic_covered,
        date: s.schedule_date ?? "",
        sessionEnded: isSessionEnded(s),
      }))
      .sort((a: EventItem, b: EventItem) => a.date.localeCompare(b.date));
  }, [eventsRes]);

  const totalTopics = courseGroups.reduce((a, c) => a + c.total, 0);
  const coveredTopics = courseGroups.reduce((a, c) => a + c.covered, 0);
  const totalEvents = events.length;
  const doneEvents = events.filter((e) => e.done).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          My Topic Coverage
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Mark topics and events as completed after each session ends
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-text-primary">{totalTopics}</p>
            <p className="text-xs text-text-secondary mt-1">Topics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-success">{coveredTopics}</p>
            <p className="text-xs text-success mt-1">Covered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-primary">{totalEvents}</p>
            <p className="text-xs text-text-secondary mt-1">Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-success">{doneEvents}</p>
            <p className="text-xs text-success mt-1">Done</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("topics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "topics"
              ? "bg-primary text-white"
              : "bg-surface-secondary text-text-secondary hover:text-primary"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Class Topics
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "topics" ? "bg-white/20" : "bg-border-light"
            }`}
          >
            {totalTopics - coveredTopics > 0 ? totalTopics - coveredTopics : "✓"}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "events"
              ? "bg-primary text-white"
              : "bg-surface-secondary text-text-secondary hover:text-primary"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Events
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "events" ? "bg-white/20" : "bg-border-light"
            }`}
          >
            {totalEvents - doneEvents > 0 ? totalEvents - doneEvents : "✓"}
          </span>
        </button>
      </div>

      {(isLoading || eventsLoading) && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* CLASS TOPICS TAB */}
      {!isLoading && !eventsLoading && activeTab === "topics" && (
        <>
          {courseGroups.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No topic-assigned schedules found yet.
            </div>
          ) : (
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
                      <div className="space-y-2">
                        {cg.topics.map((t, i) => {
                          const busy = isBusy(t.scheduleName);
                          return (
                            <div
                              key={`${t.scheduleName}-${i}`}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                                t.covered
                                  ? "bg-success/10 border-success/20"
                                  : t.sessionEnded
                                  ? "bg-surface-secondary border-border-light"
                                  : "bg-app-bg border-border-light opacity-60"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {t.covered ? (
                                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                                ) : t.sessionEnded ? (
                                  <FileText className="h-4 w-4 text-text-secondary flex-shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-text-secondary flex-shrink-0" />
                                )}
                                <span
                                  className={`truncate ${
                                    t.covered ? "text-success font-medium" : "text-text-primary"
                                  }`}
                                >
                                  {t.topicName}
                                </span>
                                {t.date && (
                                  <span className="text-[11px] text-text-secondary flex-shrink-0">
                                    {fmtDate(t.date)}
                                  </span>
                                )}
                              </div>
                              <div className="flex-shrink-0 ml-3">
                                {t.covered ? (
                                  <button
                                    onClick={() => unmarkMutation.mutate(t.scheduleName)}
                                    disabled={busy}
                                    className="text-xs px-2.5 py-1 rounded-md border border-warning/40 text-warning bg-warning/10 hover:bg-warning/20 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Mark Pending"
                                    )}
                                  </button>
                                ) : t.sessionEnded ? (
                                  <button
                                    onClick={() => markMutation.mutate(t.scheduleName)}
                                    disabled={busy}
                                    className="text-xs px-2.5 py-1 rounded-md border border-success/40 text-success bg-success/10 hover:bg-success/20 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Mark Covered"
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-text-secondary italic">
                                    Not yet ended
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* EVENTS TAB */}
      {!isLoading && !eventsLoading && activeTab === "events" && (
        <>
          {events.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No events scheduled in this period.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev, i) => {
                const busy = isBusy(ev.scheduleName);
                return (
                  <div
                    key={`${ev.scheduleName}-${i}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                      ev.done
                        ? "bg-success/10 border-success/20"
                        : ev.sessionEnded
                        ? "bg-surface-secondary border-border-light"
                        : "bg-app-bg border-border-light opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ev.done ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      ) : ev.sessionEnded ? (
                        <PartyPopper className="h-5 w-5 text-text-secondary flex-shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-text-secondary flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`font-medium truncate ${
                            ev.done ? "text-success" : "text-text-primary"
                          }`}
                        >
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {ev.eventType}
                          </span>
                          {ev.studentGroup && (
                            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                              <Users className="h-3 w-3" />
                              {ev.studentGroup}
                            </span>
                          )}
                          {ev.date && (
                            <span className="text-[11px] text-text-secondary">
                              {fmtDate(ev.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {ev.done ? (
                        <button
                          onClick={() => unmarkMutation.mutate(ev.scheduleName)}
                          disabled={busy}
                          className="text-xs px-2.5 py-1 rounded-md border border-warning/40 text-warning bg-warning/10 hover:bg-warning/20 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Pending"}
                        </button>
                      ) : ev.sessionEnded ? (
                        <button
                          onClick={() => markMutation.mutate(ev.scheduleName)}
                          disabled={busy}
                          className="text-xs px-2.5 py-1 rounded-md border border-success/40 text-success bg-success/10 hover:bg-success/20 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Done"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-text-secondary italic">
                          Not yet ended
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
