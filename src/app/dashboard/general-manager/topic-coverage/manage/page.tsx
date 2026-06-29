"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  Plus,
  Loader2,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Trash2,
  GraduationCap,
  Video,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  getProgramCourses,
  getProgramTopics,
  getAllProgramTopics,
  createTopic,
  addProgramTopic,
  removeProgramTopic,
  updateProgramTopicVideo,
  type ProgramTopic,
  type ProgramCourse,
} from "@/lib/api/courseSchedule";
import { getPrograms } from "@/lib/api/enrollment";

// ── Grade helpers ───────────────────────────────────────────────────────────

function gradeKey(programName: string): string {
  const m = programName.match(/^(\d+)(st|nd|rd|th)/i);
  return m ? `${m[1]}th` : "Other";
}

const GRADE_ORDER = ["8th", "9th", "10th", "11th", "12th", "Other"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GMManageTopicsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const { data: programs = [], isLoading: loading } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    staleTime: 5 * 60_000,
  });

  const gradeGroups = useMemo(() => {
    const filtered = search
      ? programs.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : programs;
    const map = new Map<string, typeof programs>();
    for (const p of filtered) {
      const g = gradeKey(p.name);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return GRADE_ORDER.filter((g) => map.has(g)).map((g) => ({
      grade: g,
      programs: map.get(g)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [programs, search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/general-manager/learning-hub">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Manage Topics &amp; Video Links
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Define ordered topic lists and assign Video Class URLs per program &amp; subject.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter programs…"
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading &&
        gradeGroups.map((group) => (
          <div key={group.grade} className="space-y-2">
            <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">
              {group.grade} Grade
            </h2>
            <div className="space-y-1">
              {group.programs.map((program) => (
                <ProgramRow
                  key={program.name}
                  programName={program.name}
                  isExpanded={expandedProgram === program.name}
                  onToggle={() =>
                    setExpandedProgram((prev) => (prev === program.name ? null : program.name))
                  }
                  expandedCourse={expandedProgram === program.name ? expandedCourse : null}
                  onToggleCourse={(c) => setExpandedCourse((prev) => (prev === c ? null : c))}
                  queryClient={queryClient}
                />
              ))}
            </div>
          </div>
        ))}
    </motion.div>
  );
}

// ── Program row ─────────────────────────────────────────────────────────────

function ProgramRow({
  programName,
  isExpanded,
  onToggle,
  expandedCourse,
  onToggleCourse,
  queryClient,
}: {
  programName: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedCourse: string | null;
  onToggleCourse: (course: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data: courses = [], isLoading: isLoading } = useQuery({
    queryKey: ["program-courses", programName],
    queryFn: () => getProgramCourses(programName),
    staleTime: 5 * 60_000,
    enabled: isExpanded,
  });

  // Fetch ALL topics for this program in one call (for counts)
  const { data: allTopics = [] } = useQuery({
    queryKey: ["all-program-topics", programName],
    queryFn: () => getAllProgramTopics(programName),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  // Build count maps
  const topicCountByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTopics) {
      map.set(t.course, (map.get(t.course) ?? 0) + 1);
    }
    return map;
  }, [allTopics]);

  const videoCountByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTopics) {
      if (t.custom_video_url) map.set(t.course, (map.get(t.course) ?? 0) + 1);
    }
    return map;
  }, [allTopics]);

  const totalTopics = allTopics.length;
  const totalVideos = allTopics.filter((t) => !!t.custom_video_url).length;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-text-primary">{programName}</span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && !isLoading && (
            <>
              <Badge variant="outline" className="text-[10px]">
                {courses.length} subject{courses.length !== 1 ? "s" : ""}
              </Badge>
              {totalTopics > 0 && (
                <Badge variant="info" className="text-[10px]">
                  {totalTopics} topic{totalTopics !== 1 ? "s" : ""}
                </Badge>
              )}
              {totalVideos > 0 && (
                <Badge variant="success" className="text-[10px]">
                  {totalVideos} video{totalVideos !== 1 ? "s" : ""}
                </Badge>
              )}
            </>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border-light pt-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-text-tertiary py-2 px-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                courses.map((c) => (
                  <CourseTopicRow
                    key={c.course}
                    courseName={c.course}
                    courseDisplayName={c.course_name}
                    programName={programName}
                    isExpanded={expandedCourse === c.course}
                    onToggle={() => onToggleCourse(c.course)}
                    queryClient={queryClient}
                    topicCount={topicCountByCourse.get(c.course) ?? 0}
                    videoCount={videoCountByCourse.get(c.course) ?? 0}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Course row inside a program ─────────────────────────────────────────────

function CourseTopicRow({
  courseName,
  courseDisplayName,
  programName,
  isExpanded,
  onToggle,
  queryClient,
  topicCount,
  videoCount,
}: {
  courseName: string;
  courseDisplayName: string;
  programName: string;
  isExpanded: boolean;
  onToggle: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
  topicCount: number;
  videoCount: number;
}) {
  const {
    data: topics = [],
    isLoading,
  } = useQuery({
    queryKey: ["program-topics", programName, courseName],
    queryFn: () => getProgramTopics(programName, courseName),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  return (
    <div className="rounded-[8px] border border-border-light overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="text-sm text-text-primary">{courseDisplayName}</span>
        </div>
        <div className="flex items-center gap-2">
          {topicCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {topicCount} topic{topicCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {videoCount > 0 && (
            <Badge variant="success" className="text-[10px]">
              {videoCount} video{videoCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border-light pt-2 space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  {topics.length > 0 && (
                    <div className="space-y-1">
                      {topics.map((t, i) => (
                        <TopicListItem
                          key={t.name}
                          index={i + 1}
                          topic={t}
                          programName={programName}
                          courseName={courseName}
                          queryClient={queryClient}
                        />
                      ))}
                    </div>
                  )}

                  <BulkAddTopics
                    programName={programName}
                    courseName={courseName}
                    existingTopics={topics}
                    queryClient={queryClient}
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Numbered topic item ─────────────────────────────────────────────────────

function TopicListItem({
  index,
  topic,
  programName,
  courseName,
  queryClient,
}: {
  index: number;
  topic: ProgramTopic;
  programName: string;
  courseName: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(topic.custom_video_url ?? "");

  const { mutate: remove, isPending } = useMutation({
    mutationFn: () => removeProgramTopic(topic.name, topic.topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-topics", programName, courseName] });
      queryClient.invalidateQueries({ queryKey: ["all-program-topics", programName] });
      toast.success(`Removed "${topic.topic_name || topic.topic}"`);
    },
    onError: () => toast.error("Failed to remove topic"),
  });

  const { mutate: saveVideo, isPending: savingVideo } = useMutation({
    mutationFn: () => updateProgramTopicVideo(topic.name, videoUrl.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-topics", programName, courseName] });
      queryClient.invalidateQueries({ queryKey: ["all-program-topics", programName] });
      setEditingVideo(false);
      toast.success(videoUrl.trim() ? "Video link saved" : "Video link removed");
    },
    onError: () => toast.error("Failed to save video link"),
  });

  const hasVideo = !!topic.custom_video_url;

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-[12px] bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:shadow-sm hover:border-indigo-500/20 transition-all">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index}
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {topic.topic_name || topic.topic}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {hasVideo ? (
            <div className="flex items-center gap-2">
              <a
                href={topic.custom_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/80 transition-all"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Watch Video</span>
              </a>
              <button
                onClick={() => { setEditingVideo(true); setVideoUrl(topic.custom_video_url ?? ""); }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-[8px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 transition-colors"
                title="Edit Video URL"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingVideo(true); setVideoUrl(""); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-100/50 dark:border-indigo-900/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Video Link</span>
            </button>
          )}

          <button
            onClick={() => remove()}
            disabled={isPending}
            className="p-1.5 rounded-[8px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/40 transition-all"
            title="Delete Topic"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {editingVideo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] flex flex-col gap-2 shadow-sm mt-1"
        >
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
            Paste Video URL (YouTube, Vimeo, etc.)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveVideo(); if (e.key === "Escape") setEditingVideo(false); }}
            />
            <button
              onClick={() => saveVideo()}
              disabled={savingVideo}
              className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1"
            >
              {savingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Save</span>
            </button>
            <button
              onClick={() => setEditingVideo(false)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Bulk add textarea ───────────────────────────────────────────────────────

function BulkAddTopics({
  programName,
  courseName,
  existingTopics,
  queryClient,
}: {
  programName: string;
  courseName: string;
  existingTopics: ProgramTopic[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const existingSet = useMemo(
    () => new Set(existingTopics.map((t) => t.topic)),
    [existingTopics],
  );

  // Parse lines — strip leading "1." "2)" "3-" etc.
  const parsedTopics = useMemo(() => {
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^\d+[\.\)\-\s]+/, "").trim())
      .filter(Boolean);
    return [...new Set(lines)];
  }, [text]);

  const newCount = parsedTopics.filter((t) => !existingSet.has(t)).length;

  async function handleBulkAdd() {
    if (parsedTopics.length === 0) return;
    setAdding(true);
    let added = 0;
    let failed = 0;
    let nextSort = existingTopics.length;

    for (const topicName of parsedTopics) {
      if (existingSet.has(topicName)) continue;
      try {
        // Create Topic record (ignore duplicate)
        try {
          await createTopic(topicName);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { exception?: string } } })
            ?.response?.data?.exception;
          if (!msg?.includes("DuplicateEntryError")) throw err;
        }
        // Create Program Topic link
        nextSort++;
        await addProgramTopic(programName, courseName, topicName, nextSort);
        added++;
      } catch {
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["program-topics", programName, courseName] });
    queryClient.invalidateQueries({ queryKey: ["all-program-topics", programName] });

    if (added > 0) {
      toast.success(`Added ${added} topic${added !== 1 ? "s" : ""}`);
      setText("");
    }
    if (failed > 0) {
      toast.error(`${failed} topic${failed !== 1 ? "s" : ""} failed`);
    }
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <Plus className="h-3.5 w-3.5" />
        Add Topics (one per line)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Photosynthesis\nCell Division\nHuman Digestive System"}
        rows={3}
        className="w-full rounded-[8px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
        style={{ minHeight: 60 }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">
          {parsedTopics.length > 0
            ? `${parsedTopics.length} topic${parsedTopics.length !== 1 ? "s" : ""} detected${
                newCount < parsedTopics.length
                  ? ` · ${parsedTopics.length - newCount} already linked`
                  : ""
              }`
            : "Paste topic names, one per line"}
        </span>
        <Button
          size="sm"
          onClick={handleBulkAdd}
          disabled={newCount === 0 || adding}
          className="h-8 px-4 text-xs"
        >
          {adding ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              Adding…
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add {newCount > 0 ? newCount : ""} Topic{newCount !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
