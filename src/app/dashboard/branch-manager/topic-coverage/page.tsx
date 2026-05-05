"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  GraduationCap,
  Loader2,
  PartyPopper,
  Search,
  Filter,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getCourseSchedules,
  markTopicCovered,
  unmarkTopicCovered,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";

// ── Types ────────────────────────────────────────────────────────────────────

interface TopicItem {
  scheduleName: string;
  topicName: string;
  covered: boolean;
  date: string;
  sessionEnded: boolean;
}

interface SubjectGroup {
  course: string;
  instructor_name: string;
  totalTopicSessions: number;
  coveredSessions: number;
  topics: TopicItem[];
}

interface ClassGroup {
  student_group: string;
  totalTopicSessions: number;
  coveredSessions: number;
  subjects: SubjectGroup[];
}

interface EventItem {
  scheduleName: string;
  title: string;
  eventType: string;
  instructor_name: string;
  studentGroup: string;
  done: boolean;
  date: string;
  sessionEnded: boolean;
}

/** Returns true if the session end-time has already passed */
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TopicCoveragePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || allowedCompanies[0] || "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"topics" | "events">("topics");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "covered">("all");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

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

  const queryKey = ["topic-coverage-bm", branch, fromDate, toDate];

  const { data: scheduleRes, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getCourseSchedules({
        branch: branch || undefined,
        from_date: fromDate,
        to_date: toDate,
        limit_page_length: 500,
      }),
    staleTime: 2 * 60_000,
  });

  const markMutation = useMutation({
    mutationFn: markTopicCovered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Marked as covered");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to update. Please try again.";
      toast.error(message);
    },
  });

  const unmarkMutation = useMutation({
    mutationFn: unmarkTopicCovered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Marked as pending");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to update. Please try again.";
      toast.error(message);
    },
  });

  const isBusy = useCallback(
    (scheduleName: string) =>
      (markMutation.isPending && markMutation.variables === scheduleName) ||
      (unmarkMutation.isPending && unmarkMutation.variables === scheduleName),
    [markMutation, unmarkMutation],
  );

  // ── Class → Subject → Topics ─────────────────────────────────────────────
  const classGroups: ClassGroup[] = useMemo(() => {
    const schedules = (scheduleRes?.data ?? []).filter(
      (s: CourseSchedule) => s.custom_topic && !s.custom_event_type,
    );
    // group by student_group → course → records
    const classMap = new Map<string, Map<string, CourseSchedule[]>>();
    for (const s of schedules) {
      const sg = s.student_group ?? "Unknown Class";
      const co = s.course ?? "Unknown Subject";
      if (!classMap.has(sg)) classMap.set(sg, new Map());
      const subMap = classMap.get(sg)!;
      if (!subMap.has(co)) subMap.set(co, []);
      subMap.get(co)!.push(s);
    }
    return [...classMap.entries()]
      .map(([sg, subMap]) => {
        const subjects: SubjectGroup[] = [...subMap.entries()]
          .map(([co, records]) => {
            const first = records[0];
            return {
              course: co,
              instructor_name: first.instructor_name ?? "",
              totalTopicSessions: records.length,
              coveredSessions: records.filter((r) => r.custom_topic_covered).length,
              topics: records
                .sort((a, b) => (a.schedule_date ?? "").localeCompare(b.schedule_date ?? ""))
                .map((r) => ({
                  scheduleName: r.name,
                  topicName: r.custom_topic!,
                  covered: !!r.custom_topic_covered,
                  date: r.schedule_date ?? "",
                  sessionEnded: isSessionEnded(r),
                })),
            };
          })
          .sort((a, b) => a.course.localeCompare(b.course));
        return {
          student_group: sg,
          totalTopicSessions: subjects.reduce((a, s) => a + s.totalTopicSessions, 0),
          coveredSessions: subjects.reduce((a, s) => a + s.coveredSessions, 0),
          subjects,
        };
      })
      .sort((a, b) => a.student_group.localeCompare(b.student_group));
  }, [scheduleRes]);

  // ── Events ───────────────────────────────────────────────────────────────
  const events: EventItem[] = useMemo(() => {
    return (scheduleRes?.data ?? [])
      .filter((s: CourseSchedule) => !!s.custom_event_type)
      .map((s: CourseSchedule) => ({
        scheduleName: s.name,
        title: s.custom_event_title || s.title || s.custom_event_type || "Event",
        eventType: s.custom_event_type!,
        instructor_name: s.instructor_name ?? "",
        studentGroup: s.student_group,
        done: !!s.custom_topic_covered,
        date: s.schedule_date ?? "",
        sessionEnded: isSessionEnded(s),
      }))
      .sort((a: EventItem, b: EventItem) => a.date.localeCompare(b.date));
  }, [scheduleRes]);

  // ── Filtered class groups ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = classGroups;
    if (search) {
      const q = search.toLowerCase();
      items = items
        .map((cg) => {
          const matchedSubjects = cg.subjects
            .map((sub) => {
              const matchedTopics = sub.topics.filter(
                (t) =>
                  t.topicName.toLowerCase().includes(q) ||
                  sub.course.toLowerCase().includes(q) ||
                  sub.instructor_name.toLowerCase().includes(q) ||
                  cg.student_group.toLowerCase().includes(q),
              );
              return matchedTopics.length > 0
                ? { ...sub, topics: matchedTopics }
                : null;
            })
            .filter(Boolean) as SubjectGroup[];
          return matchedSubjects.length > 0
            ? { ...cg, subjects: matchedSubjects }
            : null;
        })
        .filter(Boolean) as ClassGroup[];
    }
    if (statusFilter === "covered") {
      items = items.filter((cg) => cg.coveredSessions === cg.totalTopicSessions);
    } else if (statusFilter === "pending") {
      items = items.filter((cg) => cg.coveredSessions < cg.totalTopicSessions);
    }
    return items;
  }, [classGroups, search, statusFilter]);

  // ── Filtered events ──────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let items = events;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          e.instructor_name.toLowerCase().includes(q) ||
          e.studentGroup.toLowerCase().includes(q),
      );
    }
    if (statusFilter === "covered") items = items.filter((e) => e.done);
    else if (statusFilter === "pending") items = items.filter((e) => !e.done);
    return items;
  }, [events, search, statusFilter]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalTopics = classGroups.reduce((a, c) => a + c.totalTopicSessions, 0);
  const coveredTopics = classGroups.reduce((a, c) => a + c.coveredSessions, 0);
  const totalEvents = events.length;
  const doneEvents = events.filter((e) => e.done).length;

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
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "topics" ? "bg-white/20" : "bg-border-light"}`}>
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
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "events" ? "bg-white/20" : "bg-border-light"}`}>
            {totalEvents - doneEvents > 0 ? totalEvents - doneEvents : "✓"}
          </span>
        </button>
      </div>

      {/* Filters (shared for both tabs) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "topics"
                ? "Search course, instructor, batch, topic…"
                : "Search event title, type, instructor…"
            }
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
              {f === "all" ? "All" : f === "pending" ? "Pending" : "Done"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* ── CLASS TOPICS TAB ── */}
      {!isLoading && activeTab === "topics" && (
        <>
          {classGroups.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No topic-assigned schedules found. Assign topics while creating schedules.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((cg) => {
                const classPct =
                  cg.totalTopicSessions > 0
                    ? Math.round((cg.coveredSessions / cg.totalTopicSessions) * 100)
                    : 0;
                const isClassExpanded = expandedClasses.has(cg.student_group);
                return (
                  <Card key={cg.student_group}>
                    {/* Class header */}
                    <CardContent className="p-4 space-y-3">
                      <button
                        onClick={() =>
                          setExpandedClasses((prev) => {
                            const next = new Set(prev);
                            if (next.has(cg.student_group)) next.delete(cg.student_group);
                            else next.add(cg.student_group);
                            return next;
                          })
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-bold text-text-primary">{cg.student_group}</span>
                            <span className="text-xs text-text-secondary">
                              {cg.subjects.length} subject{cg.subjects.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={classPct === 100 ? "success" : classPct > 50 ? "warning" : "outline"}>
                              {classPct}% · {cg.coveredSessions}/{cg.totalTopicSessions}
                            </Badge>
                            <span className="text-text-tertiary text-sm">{isClassExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-surface-secondary rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-success rounded-full transition-all"
                            style={{ width: `${classPct}%` }}
                          />
                        </div>
                      </button>

                      {/* Subjects within class */}
                      {isClassExpanded && (
                        <div className="space-y-3 pt-1">
                          {cg.subjects.map((sub) => {
                            const subPct =
                              sub.totalTopicSessions > 0
                                ? Math.round((sub.coveredSessions / sub.totalTopicSessions) * 100)
                                : 0;
                            const subKey = `${cg.student_group}::${sub.course}`;
                            const isSubExpanded = expandedSubjects.has(subKey);
                            return (
                              <div key={subKey} className="border border-border-light rounded-xl overflow-hidden">
                                {/* Subject header */}
                                <button
                                  onClick={() =>
                                    setExpandedSubjects((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(subKey)) next.delete(subKey);
                                      else next.add(subKey);
                                      return next;
                                    })
                                  }
                                  className="w-full text-left px-4 py-3 bg-surface-secondary hover:bg-surface-hover transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                      <span className="font-semibold text-text-primary text-sm">{sub.course}</span>
                                      {sub.instructor_name && (
                                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                                          <GraduationCap className="h-3 w-3" />
                                          {sub.instructor_name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        subPct === 100
                                          ? "bg-success/15 text-success"
                                          : subPct > 50
                                          ? "bg-warning/15 text-warning"
                                          : "bg-border-light text-text-secondary"
                                      }`}>
                                        {subPct}% · {sub.coveredSessions}/{sub.totalTopicSessions}
                                      </span>
                                      <span className="text-text-tertiary text-xs">{isSubExpanded ? "▲" : "▼"}</span>
                                    </div>
                                  </div>
                                </button>

                                {/* Topics within subject */}
                                {isSubExpanded && (
                                  <div className="p-3 space-y-2 bg-app-bg">
                                    {sub.topics.map((t, i) => {
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
                                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Pending"}
                                              </button>
                                            ) : t.sessionEnded ? (
                                              <button
                                                onClick={() => markMutation.mutate(t.scheduleName)}
                                                disabled={busy}
                                                className="text-xs px-2.5 py-1 rounded-md border border-success/40 text-success bg-success/10 hover:bg-success/20 transition disabled:opacity-50 flex items-center gap-1"
                                              >
                                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Covered"}
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── EVENTS TAB ── */}
      {!isLoading && activeTab === "events" && (
        <>
          {events.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No events scheduled in this period.
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No events match your filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((ev, i) => {
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
                        <p className={`font-medium truncate ${ev.done ? "text-success" : "text-text-primary"}`}>
                          {ev.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {ev.eventType}
                          </span>
                          {ev.instructor_name && (
                            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                              <GraduationCap className="h-3 w-3" />{ev.instructor_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                            <Users className="h-3 w-3" />{ev.studentGroup}
                          </span>
                          {ev.date && (
                            <span className="text-[11px] text-text-secondary">{fmtDate(ev.date)}</span>
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
                        <span className="text-[11px] text-text-secondary italic">Not yet ended</span>
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
