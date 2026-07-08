"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  Play,
  BookOpen,
  ExternalLink,
  ChevronDown,
  GraduationCap,
  Loader2,
  ListVideo,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GMChapter {
  name: string;
  chapter_name: string;
  video_url: string | null;
  description: string | null;
  sort_order: number;
}

interface GMSubject {
  name: string;
  subject_name: string;
  icon_emoji: string;
  sort_order: number;
  chapters: GMChapter[];
}

interface ChildVideoData {
  student: string;
  student_name: string;
  program: string;
  subjects: GMSubject[];
}

interface GMVideoResponse {
  children: ChildVideoData[];
}

// ── Animations ────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:live\/|watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentGroupVideoClassesPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const { data, isLoading } = useQuery<GMVideoResponse>({
    queryKey: ["parent-gm-video-classes"],
    queryFn: async () => {
      const res = await fetch("/api/parent/gm-video-classes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch video classes");
      return res.json();
    },
    enabled: !!user?.email,
    staleTime: 2 * 60_000,
  });

  const allChildren = data?.children ?? [];
  const targetChildren =
    selectedChild === "all"
      ? allChildren
      : allChildren.filter((c) => c.student === selectedChild);

  // Total video count across all children shown
  const totalVideos = targetChildren.reduce(
    (sum, child) =>
      sum +
      child.subjects.reduce(
        (sSum, sub) => sSum + sub.chapters.filter((ch) => !!ch.video_url).length,
        0
      ),
    0
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ListVideo className="h-6 w-6 text-primary" />
            Group Video Classes
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isLoading
              ? "Loading…"
              : totalVideos > 0
              ? `${totalVideos} video${totalVideos !== 1 ? "s" : ""} available for your child's class`
              : "Video classes will appear here once the General Manager uploads them."}
          </p>
        </div>

        {/* Child selector (only shown for multi-child parents) */}
        {allChildren.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {allChildren.map((c) => (
                <option key={c.student} value={c.student}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && targetChildren.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ListVideo className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No group video classes available yet. The General Manager will upload videos for your child's class.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Per-child sections */}
      {!isLoading &&
        targetChildren.map((child, childIdx) => {
          const videoCount = child.subjects.reduce(
            (s, sub) => s + sub.chapters.filter((ch) => !!ch.video_url).length,
            0
          );

          return (
            <motion.div
              key={child.student}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: childIdx * 0.07 }}
              className="space-y-3"
            >
              {/* Child header card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-1">
                      — {child.program}
                    </span>
                    {videoCount > 0 && (
                      <Badge variant="info" className="ml-auto">
                        {videoCount} video{videoCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {child.subjects.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">
                      No subjects available for this class yet.
                    </p>
                  ) : (
                    child.subjects.map((subject) => {
                      const subjectKey = `${child.student}-${subject.name}`;
                      const isExpanded = expandedSubject === subjectKey;
                      const chapterVideoCount = subject.chapters.filter(
                        (ch) => !!ch.video_url
                      ).length;

                      return (
                        <div
                          key={subject.name}
                          className="border border-border-light rounded-[12px] overflow-hidden"
                        >
                          {/* Subject header */}
                          <button
                            onClick={() =>
                              setExpandedSubject(isExpanded ? null : subjectKey)
                            }
                            className="w-full flex items-center justify-between p-3 bg-app-bg hover:bg-brand-wash/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl shrink-0">
                                {subject.icon_emoji || "📚"}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-text-primary">
                                  {subject.subject_name}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {subject.chapters.length} chapter
                                  {subject.chapters.length !== 1 ? "s" : ""}
                                  {chapterVideoCount > 0 && (
                                    <span className="text-primary ml-1">
                                      · {chapterVideoCount} video
                                      {chapterVideoCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-text-tertiary transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Chapters list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border-light divide-y divide-border-light">
                                  {subject.chapters.map((chapter, idx) => {
                                    const hasVideo = !!chapter.video_url;
                                    const ytId = hasVideo
                                      ? getYouTubeId(chapter.video_url!)
                                      : null;
                                    const videoKey = `${subjectKey}-${chapter.name}`;
                                    const isPlaying = playingVideo === videoKey;

                                    return (
                                      <div key={chapter.name} className="px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                              {idx + 1}
                                            </span>
                                            <span className="text-sm text-text-primary truncate">
                                              {chapter.chapter_name}
                                            </span>
                                          </div>

                                          {hasVideo ? (
                                            <div className="flex items-center gap-2 shrink-0">
                                              {ytId && (
                                                <button
                                                  onClick={() =>
                                                    setPlayingVideo(
                                                      isPlaying ? null : videoKey
                                                    )
                                                  }
                                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                                                >
                                                  <Play className="h-3.5 w-3.5" />
                                                  {isPlaying ? "Close" : "Watch"}
                                                </button>
                                              )}
                                              <a
                                                href={chapter.video_url!}
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
                                              No video yet
                                            </span>
                                          )}
                                        </div>

                                        {/* Optional description */}
                                        {chapter.description && (
                                          <p className="text-xs text-text-secondary mt-1 ml-9">
                                            {chapter.description}
                                          </p>
                                        )}

                                        {/* Inline YouTube embed */}
                                        <AnimatePresence>
                                          {isPlaying && ytId && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.2 }}
                                              className="mt-3 overflow-hidden"
                                            >
                                              <div className="relative w-full rounded-[10px] overflow-hidden bg-black aspect-video">
                                                <iframe
                                                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                                  title={chapter.chapter_name}
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
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
    </motion.div>
  );
}
