"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  GraduationCap,
  Video,
  Play,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type AttendanceRecord,
} from "../page";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ── Types for absent-day video sessions ─────────────────────────
interface AbsentDaySession {
  course: string;
  topic: string | null;
  topic_name: string | null;
  from_time: string;
  to_time: string;
  instructor_name: string;
  video_url: string | null;
  has_video: boolean;
}

interface AbsentDayData {
  attendance_name: string;
  video_watched: boolean;
  sessions: AbsentDaySession[];
}

// ── Helpers ─────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:live\/|watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function formatTime(t: string): string {
  // "9:00:00" → "9:00 AM"
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function stripCoursePrefix(name: string): string {
  return name.replace(/^\d+\w*\s+/, "");
}

function TopicEventLabels({ topics }: { topics?: { course: string | null; topic: string | null; event_title: string | null; event_type: string | null }[] }) {
  if (!topics || topics.length === 0) return null;

  const events = topics.filter((t) => t.event_type || t.event_title);
  const classes = topics.filter((t) => t.course);

  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {events.map((e, i) => (
        <span key={`ev-${i}`} className="inline-flex items-center gap-1 text-[11px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          {e.event_title || e.event_type}
        </span>
      ))}
      {classes.map((c, i) => (
        <span key={`cl-${i}`} className="text-[11px] text-text-tertiary">
          {c.topic ? `${stripCoursePrefix(c.course!)}: ${c.topic}` : stripCoursePrefix(c.course!)}
          {i < classes.length - 1 ? " · " : ""}
        </span>
      ))}
    </div>
  );
}

function getDisplayStatus(record: AttendanceRecord): {
  label: string;
  variant: "success" | "error" | "warning" | "info";
} {
  if (record.status === "Present") return { label: "Present", variant: "success" };
  if (record.status === "Absent" && record.custom_video_watched)
    return { label: "Video Watched", variant: "info" };
  if (record.status === "Absent") return { label: "Absent", variant: "error" };
  return { label: "Late", variant: "warning" };
}

// ── Expandable Absent Row ───────────────────────────────────────
function AbsentDayRow({
  record,
  childName,
}: {
  record: AttendanceRecord;
  childName: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const WATCH_THRESHOLD = 60; // seconds before auto-marking

  const { data, isLoading } = useQuery<AbsentDayData>({
    queryKey: ["absent-day-videos", childName, record.attendance_date],
    queryFn: async () => {
      const res = await fetch(
        `/api/parent/absent-day-videos?student=${encodeURIComponent(childName)}&date=${record.attendance_date}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: expanded,
    staleTime: 5 * 60_000,
  });

  const markWatched = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/mark-video-watched", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance_name: record.name }),
      });
      if (!res.ok) throw new Error("Failed to mark");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-data"] });
      queryClient.invalidateQueries({
        queryKey: ["absent-day-videos", childName, record.attendance_date],
      });
    },
  });

  const displayStatus = getDisplayStatus(record);
  const hasVideos = data?.sessions?.some((s) => s.has_video) ?? false;
  const isVideoWatched = record.custom_video_watched === 1 || data?.video_watched;

  // Start/stop 1-minute watch timer when video plays
  useEffect(() => {
    if (playingVideo && !isVideoWatched) {
      setWatchSeconds(0);
      timerRef.current = setInterval(() => {
        setWatchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!playingVideo) setWatchSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playingVideo, isVideoWatched]);

  // Auto-mark when threshold reached
  useEffect(() => {
    if (watchSeconds >= WATCH_THRESHOLD && !isVideoWatched && !markWatched.isPending) {
      markWatched.mutate();
    }
  }, [watchSeconds]);

  return (
    <div className="rounded-[8px] border border-border-light bg-app-bg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 px-3 text-sm hover:bg-brand-wash/10 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
          <div className="min-w-0">
            <span className="text-text-primary font-medium">
              {new Date(record.attendance_date).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <TopicEventLabels topics={record.topics} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>
          <ChevronDown
            className={`h-3.5 w-3.5 text-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light px-3 py-3 space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}

              {!isLoading && (!data?.sessions || data.sessions.length === 0) && (
                <p className="text-xs text-text-tertiary text-center py-2">
                  No class sessions found for this day.
                </p>
              )}

              {!isLoading &&
                data?.sessions?.map((session, sIdx) => {
                  const ytId = session.video_url
                    ? getYouTubeId(session.video_url)
                    : null;
                  const videoKey = `${record.attendance_date}-${sIdx}`;
                  const isPlaying = playingVideo === videoKey;

                  return (
                    <div
                      key={sIdx}
                      className="rounded-[8px] border border-border-light bg-surface p-3 space-y-2"
                    >
                      {/* Session info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary">
                            {stripCoursePrefix(session.course)}
                          </p>
                          {session.topic && (
                            <p className="text-xs text-text-secondary">
                              Topic: {session.topic_name || session.topic}
                            </p>
                          )}
                          <p className="text-xs text-text-tertiary">
                            {formatTime(session.from_time)} – {formatTime(session.to_time)}
                            {session.instructor_name && ` · ${session.instructor_name}`}
                          </p>
                        </div>

                        {session.has_video ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {ytId && (
                              <button
                                onClick={() =>
                                  setPlayingVideo(isPlaying ? null : videoKey)
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                              >
                                <Play className="h-3.5 w-3.5" />
                                {isPlaying ? "Close" : "Watch"}
                              </button>
                            )}
                            <a
                              href={session.video_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-[6px] text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary shrink-0">
                            No video
                          </span>
                        )}
                      </div>

                      {/* Inline YouTube embed */}
                      <AnimatePresence>
                        {isPlaying && ytId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="relative w-full rounded-[10px] overflow-hidden bg-black aspect-video">
                              <iframe
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                title={session.topic_name || session.course}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

              {/* Watch progress or confirmed status */}
              {!isVideoWatched && playingVideo && watchSeconds > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Watching… will mark after 1 min</span>
                    <span className="font-medium text-primary">
                      {Math.min(watchSeconds, WATCH_THRESHOLD)}s / {WATCH_THRESHOLD}s
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000"
                      style={{ width: `${Math.min((watchSeconds / WATCH_THRESHOLD) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {isVideoWatched && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-info">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Video class watched
                  {record.custom_video_watched_on && (
                    <span className="text-text-tertiary">
                      · {new Date(record.custom_video_watched_on).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function ParentAttendancePage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");

  const children = data?.children ?? [];

  const targetChildren = selectedChild === "all"
    ? children
    : children.filter((c) => c.name === selectedChild);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Attendance
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Monthly attendance details for your children
          </p>
        </div>

        {children.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        targetChildren.map((child) => {
          const enrollment = getLatestEnrollment(data, child.name);
          const records = (data?.attendance?.[child.name] ?? []) as AttendanceRecord[];
          const present = records.filter((r) => r.status === "Present").length;
          const absentRaw = records.filter((r) => r.status === "Absent");
          const videoWatched = absentRaw.filter((r) => r.custom_video_watched === 1).length;
          const absent = absentRaw.length - videoWatched;
          const late = records.filter((r) => r.status === "Late").length;
          const total = records.length;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;

          return (
            <motion.div key={child.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-2">
                      {enrollment?.program || child.custom_branch?.replace("Smart Up ", "")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {total === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-6">
                      No attendance records this month.
                    </p>
                  ) : (
                    <>
                      {/* Summary stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                          <p className="text-xs text-text-tertiary">Total Days</p>
                          <p className="text-xl font-bold text-text-primary">{total}</p>
                        </div>
                        <div className="bg-success-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            <p className="text-xs text-text-secondary">Present</p>
                          </div>
                          <p className="text-xl font-bold text-success">{present}</p>
                        </div>
                        <div className="bg-error-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-error" />
                            <p className="text-xs text-text-secondary">Absent</p>
                          </div>
                          <p className="text-xl font-bold text-error">{absent}</p>
                        </div>
                        <div className="bg-info-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Video className="h-3.5 w-3.5 text-info" />
                            <p className="text-xs text-text-secondary">Video Watched</p>
                          </div>
                          <p className="text-xl font-bold text-info">{videoWatched}</p>
                        </div>
                        <div className="bg-warning-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-warning" />
                            <p className="text-xs text-text-secondary">Late</p>
                          </div>
                          <p className="text-xl font-bold text-warning">{late}</p>
                        </div>
                      </div>

                      {/* Attendance rate bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-text-secondary">
                          <span>Attendance Rate</span>
                          <span className={`font-bold ${pct >= 75 ? "text-success" : "text-warning"}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-success" : "bg-warning"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Day-by-day list */}
                      <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                        {records.map((record, idx) => {
                          // Absent rows are expandable with video watch feature
                          if (record.status === "Absent") {
                            return (
                              <AbsentDayRow
                                key={record.name || idx}
                                record={record}
                                childName={child.name}
                              />
                            );
                          }

                          // Present / Late rows are simple
                          const ds = getDisplayStatus(record);
                          return (
                            <div
                              key={record.name || idx}
                              className="flex items-center justify-between py-2 px-3 rounded-[8px] border border-border-light bg-app-bg text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-text-primary font-medium">
                                    {new Date(record.attendance_date).toLocaleDateString("en-IN", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <TopicEventLabels topics={record.topics} />
                                </div>
                              </div>
                              <Badge variant={ds.variant} className="shrink-0 ml-2">{ds.label}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
