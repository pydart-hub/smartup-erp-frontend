"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Loader2,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Trash2,
  GraduationCap,
  ExternalLink,
  Check,
  X,
  Pencil,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  getGMStudySubjects,
  getAllGMStudySubjects,
  createGMStudySubject,
  updateGMStudySubject,
  deleteGMStudySubject,
  getGMStudyMaterialLinks,
  createGMStudyMaterialLink,
  updateGMStudyMaterialLink,
  deleteGMStudyMaterialLink,
  type GMStudyMaterialSubject,
  type GMStudyMaterialLink,
} from "@/lib/api/gmStudyMaterials";
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

// ── Main Page Component ───────────────────────────────────────────────────────

export default function StudyMaterialsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Get all Programs from Frappe
  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    staleTime: 5 * 60_000,
  });

  // Get all Study Subjects
  const { data: allSubjects = [] } = useQuery({
    queryKey: ["gm-all-study-subjects"],
    queryFn: getAllGMStudySubjects,
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

  // Group programs by grade
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
        <Link href="/dashboard/general-manager/learning-hub">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Study Materials Link Assign
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Assign notes, shared resources, Google Drive, or Notion links per program and subject.
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

// ── Program Row Component ────────────────────────────────────────────────────

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
    queryKey: ["gm-study-subjects", programName],
    queryFn: () => getGMStudySubjects(programName),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectEmoji, setNewSubjectEmoji] = useState("📚");

  const { mutate: addSubject, isPending: addingSubjectPending } = useMutation({
    mutationFn: () =>
      createGMStudySubject({
        program: programName,
        subject_name: newSubjectName.trim(),
        icon_emoji: newSubjectEmoji || "📚",
        sort_order: subjects.length,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-study-subjects"] });
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

// ── Subject Row Component ────────────────────────────────────────────────────

function SubjectRow({
  subject,
  programName,
  isExpanded,
  onToggle,
  qc,
}: {
  subject: GMStudyMaterialSubject;
  programName: string;
  isExpanded: boolean;
  onToggle: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["gm-study-materials", subject.name],
    queryFn: () => getGMStudyMaterialLinks(subject.name),
    staleTime: 2 * 60_000,
    enabled: isExpanded,
  });

  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState(subject.subject_name);
  const [editedEmoji, setEditedEmoji] = useState(subject.icon_emoji || "📚");

  const { mutate: removeSubject, isPending: removingSubject } = useMutation({
    mutationFn: () => deleteGMStudySubject(subject.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-study-subjects"] });
      toast.success(`Removed "${subject.subject_name}"`);
    },
    onError: () => toast.error("Failed to remove subject"),
  });

  const { mutate: saveSubjectEdit, isPending: savingSubjectEdit } = useMutation({
    mutationFn: () =>
      updateGMStudySubject(subject.name, {
        subject_name: editedName.trim(),
        icon_emoji: editedEmoji || "📚",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-subjects", programName] });
      qc.invalidateQueries({ queryKey: ["gm-all-study-subjects"] });
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
              {materials.length > 0 && (
                <Badge variant="success" className="text-[10px]">
                  {materials.length} link{materials.length !== 1 ? "s" : ""}
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
              if (window.confirm(`Delete "${subject.subject_name}" and all its materials?`)) {
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

      {/* Chapters (Material links) */}
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
                  {materials.length > 0 && (
                    <div className="space-y-1">
                      {materials.map((mat, i) => (
                        <MaterialItem
                          key={mat.name}
                          index={i + 1}
                          material={mat}
                          subjectName={subject.name}
                          qc={qc}
                        />
                      ))}
                    </div>
                  )}
                  <AddMaterialLinkForm subjectName={subject.name} qc={qc} existingCount={materials.length} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Material Link Item Component ──────────────────────────────────────────────

function MaterialItem({
  index,
  material,
  subjectName,
  qc,
}: {
  index: number;
  material: GMStudyMaterialLink;
  subjectName: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [editingLink, setEditingLink] = useState(false);
  const [materialUrl, setMaterialUrl] = useState(material.material_url);
  const [editingName, setEditingName] = useState(false);
  const [materialTitle, setMaterialTitle] = useState(material.material_title);

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => deleteGMStudyMaterialLink(material.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-materials", subjectName] });
      toast.success(`Removed "${material.material_title}"`);
    },
    onError: () => toast.error("Failed to remove material"),
  });

  const { mutate: saveLink, isPending: savingLink } = useMutation({
    mutationFn: () => updateGMStudyMaterialLink(material.name, { material_url: materialUrl.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-materials", subjectName] });
      setEditingLink(false);
      toast.success("Material link saved");
    },
    onError: () => toast.error("Failed to save material link"),
  });

  const { mutate: saveName, isPending: savingName } = useMutation({
    mutationFn: () => updateGMStudyMaterialLink(material.name, { material_title: materialTitle.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-materials", subjectName] });
      setEditingName(false);
      toast.success("Material title updated");
    },
    onError: () => toast.error("Failed to update material title"),
  });

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[10px] bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-6 h-6 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index}
          </span>
          {editingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                autoFocus
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="flex-1 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => saveName()}
                disabled={savingName || !materialTitle.trim()}
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
              {material.material_title}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <a
            href={material.material_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100/50 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Link
          </a>
          <button
            onClick={() => { setEditingLink(true); setMaterialUrl(material.material_url); }}
            className="px-2.5 py-1.5 text-xs font-medium rounded-[8px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 transition-colors"
          >
            Edit Link
          </button>

          <button
            onClick={() => remove()}
            disabled={removing}
            className="p-1.5 rounded-[8px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-500 border border-rose-100/50 dark:border-rose-900/40 transition-all"
            title="Delete material link"
          >
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Material URL editor */}
      {editingLink && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] flex flex-col gap-2 shadow-sm"
        >
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Paste Material URL (Google Drive, Notion, Dropbox, etc.)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLink();
                if (e.key === "Escape") setEditingLink(false);
              }}
            />
            <button
              onClick={() => saveLink()}
              disabled={savingLink}
              className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1"
            >
              {savingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => setEditingLink(false)}
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

// ── Add Material Link Form Component ──────────────────────────────────────────

function AddMaterialLinkForm({
  subjectName,
  qc,
  existingCount,
}: {
  subjectName: string;
  qc: ReturnType<typeof useQueryClient>;
  existingCount: number;
}) {
  const [adding, setAdding] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");

  const { mutate: add, isPending } = useMutation({
    mutationFn: () =>
      createGMStudyMaterialLink({
        subject: subjectName,
        material_title: materialTitle.trim(),
        material_url: materialUrl.trim(),
        sort_order: existingCount,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gm-study-materials", subjectName] });
      setMaterialTitle("");
      setMaterialUrl("");
      setAdding(false);
      toast.success("Material link added");
    },
    onError: () => toast.error("Failed to add material link"),
  });

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs text-text-tertiary hover:text-primary hover:bg-primary/5 border border-dashed border-border-light hover:border-primary/30 transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Material Link
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[10px] space-y-2 shadow-sm"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Material Link</p>
      <input
        autoFocus
        value={materialTitle}
        onChange={(e) => setMaterialTitle(e.target.value)}
        placeholder="Material title (e.g. Chapter 1 Notes)"
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <input
        value={materialUrl}
        onChange={(e) => setMaterialUrl(e.target.value)}
        placeholder="Shared folder/file link (e.g. https://drive.google.com/...)"
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && materialTitle.trim() && materialUrl.trim()) add();
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
          onClick={() => materialTitle.trim() && materialUrl.trim() && add()}
          disabled={!materialTitle.trim() || !materialUrl.trim() || isPending}
          className="h-8 px-4 text-xs rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Link
        </button>
      </div>
    </motion.div>
  );
}
