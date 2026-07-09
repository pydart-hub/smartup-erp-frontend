"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlayCircle,
  BookOpen,
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
  Pencil,
  ListVideo,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  getGMSubjects,
  getAllGMSubjects,
  createGMSubject,
  updateGMSubject,
  deleteGMSubject,
  getGMChapters,
  getGMChapterCounts,
  createGMChapter,
  updateGMChapter,
  deleteGMChapter,
  type GMVideoSubject,
  type GMVideoChapter,
} from "@/lib/api/gmVideoClasses";
import { getPrograms } from "@/lib/api/enrollment";

// ── Grade grouping helpers ────────────────────────────────────────────────────

function gradeKey(programName: string): string {
  if (/plus\s*one|11th/i.test(programName)) return "Plus One";
  if (/plus\s*two|12th/i.test(programName)) return "Plus Two";
  const m = programName.match(/^(\d+)(st|nd|rd|th)/i);
  if (m) return `${m[1]}th`;
  return "Other";
}

const GRADE_ORDER = ["8th", "9th", "10th", "Plus One", "Plus Two", "Other"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GMGroupVideoClassesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // All programs from Frappe
  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    staleTime: 5 * 60_000,
  });

  // All subjects (for count badges)
  const { data: allSubjects = [] } = useQuery({
    queryKey: ["gm-all-subjects"],
    queryFn: getAllGMSubjects,
    staleTime: 2 * 60_000,
  });

  // Count subjects per program
  const subjectCountByProgram = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allSubjects) {
      map.set(s.program, (map.get(s.program) ?? 0) + 1);
    }
    return map;
  }, [allSubjects]);

  // Grade groups
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/content-admin">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ListVideo className="h-6 w-6 text-primary" />
            Group Video Classes
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Assign subject and chapter-wise video links per student group (program).
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter programs…"
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loadingPrograms && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Grade groups */}
      {!loadingPrograms &&
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
                  subjectCount={subjectCountByProgram.get(program.name) ?? 0}
                  isExpanded={expandedProgram === program.name}
                  onToggle={() =>
                    setExpandedProgram((prev) =>
                      prev === program.name ? null : program.name
                    )
                  }
                  expandedSubject={expandedProgram === program.name ? expandedSubject : null}
                  onToggleSubject={(s) =>
                    setExpandedSubject((prev) => (prev === s ? null : s))
                  }
                  qc={qc}
                />
              ))}
            </div>
          </div>
        ))}
    </motion.div>
  );
}

// ── Program Row ───────────────────────────────────────────────────────────────

function ProgramRow({
  programName,
  subjectCount,
  isExpanded,
  onToggle,
  expandedSubject,
  onToggleSubject,
  qc,
}: {
  programName: string;
  subjectCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSubject: string | null;
  onToggleSubject: (s: string) => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["gm-subjects", programName],
    queryFn: () => getGMSubjects(programName),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectEmoji, setNewSubjectEmoji] = useState("📚");

  const { mutate: addSubject, isPending: addingSubjectPending } = useMutation({
    mutationFn: () =>
      createGMSubject({
        program: programName,
        subject_name: newSubjectName.trim(),
        icon_emoji: newSubjectEmoji || "📚",
        sort_order: subjects.length,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-subjects"] });
      setNewSubjectName("");
      setNewSubjectEmoji("📚");
      setAddingSubject(false);
      toast.success("Subject added");
    },
    onError: () => toast.error("Failed to add subject"),
  });

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
          {subjectCount > 0 && (
            <Badge variant="info" className="text-[10px]">
              {subjectCount} subject{subjectCount !== 1 ? "s" : ""}
            </Badge>
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
                <>
                  {subjects.map((sub) => (
                    <SubjectRow
                      key={sub.name}
                      subject={sub}
                      programName={programName}
                      isExpanded={expandedSubject === sub.name}
                      onToggle={() => onToggleSubject(sub.name)}
                      qc={qc}
                    />
                  ))}

                  {/* Add subject inline form */}
                  {addingSubject ? (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] space-y-2 shadow-sm"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        New Subject
                      </p>
                      <div className="flex gap-2">
                        <input
                          value={newSubjectEmoji}
                          onChange={(e) => setNewSubjectEmoji(e.target.value)}
                          className="w-12 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          maxLength={4}
                          placeholder="📚"
                        />
                        <input
                          autoFocus
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newSubjectName.trim()) addSubject();
                            if (e.key === "Escape") setAddingSubject(false);
                          }}
                          placeholder="Subject name (e.g. Mathematics)"
                          className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                          onClick={() => newSubjectName.trim() && addSubject()}
                          disabled={!newSubjectName.trim() || addingSubjectPending}
                          className="h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {addingSubjectPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Add
                        </button>
                        <button
                          onClick={() => setAddingSubject(false)}
                          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-text-secondary text-xs transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setAddingSubject(true)}
                      className="mt-1 w-full flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs text-text-tertiary hover:text-primary hover:bg-primary/5 border border-dashed border-border-light hover:border-primary/30 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Subject
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Subject Row ───────────────────────────────────────────────────────────────

function SubjectRow({
  subject,
  programName,
  isExpanded,
  onToggle,
  qc,
}: {
  subject: GMVideoSubject;
  programName: string;
  isExpanded: boolean;
  onToggle: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["gm-chapters", subject.name],
    queryFn: () => getGMChapters(subject.name),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState(subject.subject_name);
  const [editedEmoji, setEditedEmoji] = useState(subject.icon_emoji || "📚");

  const videoCount = chapters.filter((c) => !!c.video_url).length;

  const { mutate: removeSubject, isPending: removingSubject } = useMutation({
    mutationFn: () => deleteGMSubject(subject.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-subjects"] });
      toast.success(`Removed "${subject.subject_name}"`);
    },
    onError: () => toast.error("Failed to remove subject"),
  });

  const { mutate: saveSubjectEdit, isPending: savingSubjectEdit } = useMutation({
    mutationFn: () =>
      updateGMSubject(subject.name, {
        subject_name: editedName.trim(),
        icon_emoji: editedEmoji || "📚",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-subjects"] });
      setEditingName(false);
      toast.success("Subject updated");
    },
    onError: () => toast.error("Failed to update subject"),
  });

  return (
    <div className="rounded-[8px] border border-border-light overflow-hidden">
      {/* Subject header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-secondary/40 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          <span className="text-base">{subject.icon_emoji || "📚"}</span>
          <span className="text-sm text-text-primary font-medium">{subject.subject_name}</span>
          {isExpanded && (
            <div className="flex items-center gap-1 ml-1">
              {chapters.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {videoCount > 0 && (
                <Badge variant="success" className="text-[10px]">
                  {videoCount} video{videoCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setEditedName(subject.subject_name);
              setEditedEmoji(subject.icon_emoji || "📚");
              setEditingName(true);
            }}
            className="p-1.5 rounded-[6px] text-text-tertiary hover:text-primary hover:bg-primary/8 transition-colors"
            title="Edit subject"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${subject.subject_name}" and all its chapters?`)) {
                removeSubject();
              }
            }}
            disabled={removingSubject}
            className="p-1.5 rounded-[6px] text-text-tertiary hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete subject"
          >
            {removingSubject ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button onClick={onToggle} className="p-1.5">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
            )}
          </button>
        </div>
      </div>

      {/* Edit subject inline form */}
      <AnimatePresence>
        {editingName && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-border-light bg-white dark:bg-slate-900 flex gap-2">
              <input
                value={editedEmoji}
                onChange={(e) => setEditedEmoji(e.target.value)}
                className="w-12 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-center text-lg focus:outline-none"
                maxLength={4}
              />
              <input
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveSubjectEdit();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => saveSubjectEdit()}
                disabled={savingSubjectEdit || !editedName.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {savingSubjectEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light px-3 pb-3 pt-2 space-y-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  {chapters.length > 0 && (
                    <div className="space-y-1">
                      {chapters.map((ch, i) => (
                        <ChapterItem
                          key={ch.name}
                          index={i + 1}
                          chapter={ch}
                          subjectName={subject.name}
                          qc={qc}
                        />
                      ))}
                    </div>
                  )}
                  <AddChapterForm subjectName={subject.name} qc={qc} existingCount={chapters.length} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chapter Item ──────────────────────────────────────────────────────────────

function ChapterItem({
  index,
  chapter,
  subjectName,
  qc,
}: {
  index: number;
  chapter: GMVideoChapter;
  subjectName: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(chapter.video_url ?? "");
  const [editingName, setEditingName] = useState(false);
  const [chapterName, setChapterName] = useState(chapter.chapter_name);

  const hasVideo = !!chapter.video_url;

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => deleteGMChapter(chapter.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-chapters", subjectName] });
      toast.success(`Removed "${chapter.chapter_name}"`);
    },
    onError: () => toast.error("Failed to remove chapter"),
  });

  const { mutate: saveVideo, isPending: savingVideo } = useMutation({
    mutationFn: () => updateGMChapter(chapter.name, { video_url: videoUrl.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-chapters", subjectName] });
      setEditingVideo(false);
      toast.success(videoUrl.trim() ? "Video link saved" : "Video link removed");
    },
    onError: () => toast.error("Failed to save video link"),
  });

  const { mutate: saveName, isPending: savingName } = useMutation({
    mutationFn: () => updateGMChapter(chapter.name, { chapter_name: chapterName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-chapters", subjectName] });
      setEditingName(false);
      toast.success("Chapter name updated");
    },
    onError: () => toast.error("Failed to update chapter"),
  });

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[10px] bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/20 transition-all">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-6 h-6 rounded-[6px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index}
          </span>
          {editingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                autoFocus
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="flex-1 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => saveName()}
                disabled={savingName || !chapterName.trim()}
                className="p-1 rounded text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setEditingName(false)} className="p-1 rounded text-text-tertiary hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-medium text-slate-700 dark:text-slate-200 text-left hover:text-primary transition-colors truncate"
            >
              {chapter.chapter_name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {hasVideo ? (
            <>
              <a
                href={chapter.video_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100/50 transition-all"
              >
                <Video className="h-3.5 w-3.5" />
                Watch
              </a>
              <button
                onClick={() => { setEditingVideo(true); setVideoUrl(chapter.video_url ?? ""); }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-[8px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 transition-colors"
              >
                Edit Link
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditingVideo(true); setVideoUrl(""); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-100/50 dark:border-indigo-900/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Video Link
            </button>
          )}

          <button
            onClick={() => remove()}
            disabled={removing}
            className="p-1.5 rounded-[8px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-500 border border-rose-100/50 dark:border-rose-900/40 transition-all"
            title="Delete chapter"
          >
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Video URL editor */}
      {editingVideo && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] flex flex-col gap-2 shadow-sm"
        >
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Paste Video URL (YouTube, Vimeo, etc.)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveVideo();
                if (e.key === "Escape") setEditingVideo(false);
              }}
            />
            <button
              onClick={() => saveVideo()}
              disabled={savingVideo}
              className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1"
            >
              {savingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => setEditingVideo(false)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 text-xs"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Add Chapter Form ──────────────────────────────────────────────────────────

function AddChapterForm({
  subjectName,
  qc,
  existingCount,
}: {
  subjectName: string;
  qc: ReturnType<typeof useQueryClient>;
  existingCount: number;
}) {
  const [adding, setAdding] = useState(false);
  const [chapterName, setChapterName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const { mutate: add, isPending } = useMutation({
    mutationFn: () =>
      createGMChapter({
        subject: subjectName,
        chapter_name: chapterName.trim(),
        video_url: videoUrl.trim() || undefined,
        sort_order: existingCount,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-chapters", subjectName] });
      setChapterName("");
      setVideoUrl("");
      setAdding(false);
      toast.success("Chapter added");
    },
    onError: () => toast.error("Failed to add chapter"),
  });

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs text-text-tertiary hover:text-primary hover:bg-primary/5 border border-dashed border-border-light hover:border-primary/30 transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Chapter
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] space-y-2 shadow-sm"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Chapter</p>
      <input
        autoFocus
        value={chapterName}
        onChange={(e) => setChapterName(e.target.value)}
        placeholder="Chapter name (e.g. Ch 1 – Number Systems)"
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="Video URL (optional) — https://youtu.be/..."
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && chapterName.trim()) add();
          if (e.key === "Escape") setAdding(false);
        }}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setAdding(false)}
          className="h-8 px-4 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => chapterName.trim() && add()}
          disabled={!chapterName.trim() || isPending}
          className="h-8 px-4 text-xs rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Chapter
        </button>
      </div>
    </motion.div>
  );
}
