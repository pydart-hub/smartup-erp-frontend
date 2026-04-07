"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Settings,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSyllabusConfigs,
  getSyllabusParts,
  createSyllabusConfig,
  updateSyllabusConfig,
  deleteSyllabusConfig,
  approveSyllabusPart,
  rejectSyllabusPart,
} from "@/lib/api/syllabus";
import type {
  SyllabusConfig,
  SyllabusPartCompletion,
  SyllabusPartStatus,
} from "@/lib/types/syllabus";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ── Helpers ─────────────────────────────────────────────────────
function statusBadge(status: SyllabusPartStatus) {
  switch (status) {
    case "Not Started":
      return <Badge variant="outline">Not Started</Badge>;
    case "Pending Approval":
      return <Badge variant="warning">Pending Approval</Badge>;
    case "Completed":
      return <Badge variant="success">Completed</Badge>;
    case "Rejected":
      return <Badge variant="error">Rejected</Badge>;
  }
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Page ───────────────────────────────────────────────────
export default function BranchManagerSyllabusPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"config" | "approvals" | "progress">("approvals");

  // Fetch configs
  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ["syllabus-configs", defaultCompany],
    queryFn: () => getSyllabusConfigs({ company: defaultCompany || undefined }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Fetch all completion records for this branch
  const { data: allParts = [], isLoading: partsLoading } = useQuery({
    queryKey: ["syllabus-parts", defaultCompany],
    queryFn: () => getSyllabusParts({ company: defaultCompany || undefined }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Fetch courses + course→programs map from instructor logs
  const { data: branchData = { courses: [], coursePrograms: {} } } = useQuery<{ courses: string[]; coursePrograms: Record<string, string[]> }>({
    queryKey: ["branch-courses", defaultCompany],
    queryFn: async () => {
      const res = await fetch(
        `/api/proxy/resource/Instructor?${new URLSearchParams({
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["custom_company", "=", defaultCompany]]),
          limit_page_length: "200",
        })}`,
        { credentials: "include" },
      );
      if (!res.ok) return { courses: [], coursePrograms: {} };
      const { data } = await res.json();
      const courses = new Set<string>();
      const coursePrograms: Record<string, Set<string>> = {};
      for (const inst of data) {
        const docRes = await fetch(
          `/api/proxy/resource/Instructor/${encodeURIComponent(inst.name)}`,
          { credentials: "include" },
        );
        if (docRes.ok) {
          const doc = (await docRes.json()).data;
          for (const log of doc.instructor_log ?? []) {
            if (log.course && log.custom_branch === defaultCompany) {
              courses.add(log.course);
              if (log.program) {
                if (!coursePrograms[log.course]) coursePrograms[log.course] = new Set();
                coursePrograms[log.course].add(log.program);
              }
            }
          }
        }
      }
      // Convert sets to sorted arrays
      const courseProgramsObj: Record<string, string[]> = {};
      for (const [course, progs] of Object.entries(coursePrograms)) {
        courseProgramsObj[course] = [...progs].sort();
      }
      return { courses: [...courses].sort(), coursePrograms: courseProgramsObj };
    },
    staleTime: 10 * 60_000,
    enabled: !!defaultCompany,
  });
  const branchCourses = branchData.courses;
  const coursePrograms = branchData.coursePrograms;

  // Pending count
  const pendingParts = allParts.filter((p) => p.status === "Pending Approval");

  // Stats
  const stats = useMemo(() => {
    const total = allParts.length;
    const completed = allParts.filter((p) => p.status === "Completed").length;
    const pending = pendingParts.length;
    const rejected = allParts.filter((p) => p.status === "Rejected").length;
    const notStarted = allParts.filter((p) => p.status === "Not Started").length;
    return { total, completed, pending, rejected, notStarted };
  }, [allParts, pendingParts]);

  const tabs = [
    { key: "approvals" as const, label: `Approvals${pendingParts.length > 0 ? ` (${pendingParts.length})` : ""}`, icon: Clock },
    { key: "config" as const, label: "Configuration", icon: Settings },
    { key: "progress" as const, label: "Progress", icon: BookOpen },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Syllabus Tracking
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure syllabus parts and approve teacher submissions — {defaultCompany?.replace("Smart Up ", "")}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Parts" count={stats.total} variant="outline" />
        <StatCard label="Completed" count={stats.completed} variant="success" />
        <StatCard label="Pending" count={stats.pending} variant="warning" />
        <StatCard label="Rejected" count={stats.rejected} variant="error" />
        <StatCard label="Not Started" count={stats.notStarted} variant="outline" />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-app-bg border border-border-light"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      {activeTab === "approvals" && (
        <ApprovalsSection parts={pendingParts} allParts={allParts} isLoading={partsLoading} />
      )}
      {activeTab === "config" && (
        <ConfigSection
          configs={configs}
          branchCourses={branchCourses}
          coursePrograms={coursePrograms}
          isLoading={configsLoading}
          company={defaultCompany || ""}
        />
      )}
      {activeTab === "progress" && (
        <ProgressSection allParts={allParts} configs={configs} isLoading={partsLoading} />
      )}
    </motion.div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, count, variant }: {
  label: string;
  count: number;
  variant: "warning" | "success" | "error" | "outline";
}) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-[10px] border border-border-light bg-surface">
      <span className="text-2xl font-bold text-text-primary">{count}</span>
      <Badge variant={variant} className="mt-1">{label}</Badge>
    </div>
  );
}

// ── Approvals Section ───────────────────────────────────────────
function ApprovalsSection({ parts, allParts, isLoading }: {
  parts: SyllabusPartCompletion[];
  allParts: SyllabusPartCompletion[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSyllabusPart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-parts"] });
      setActioningId(null);
    },
    onError: () => setActioningId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectSyllabusPart(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-parts"] });
      setRejectId(null);
      setRejectReason("");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[14px] bg-surface border border-border-light animate-pulse" />
        ))}
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">No pending approvals</p>
          <p className="text-sm text-text-tertiary mt-1">All teacher submissions have been reviewed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {parts.map((part, index) => {
          const instructorParts = allParts.filter(
            (p) => p.instructor === part.instructor && p.course === part.course && p.program === part.program,
          );
          const completed = instructorParts.filter((p) => p.status === "Completed").length;
          const total = instructorParts[0]?.total_parts ?? part.total_parts;

          return (
            <motion.div
              key={part.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-text-primary">
                          {part.instructor_name}
                        </h3>
                        <span className="text-text-tertiary">—</span>
                        <span className="text-sm font-medium text-text-secondary">{part.course}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm text-primary font-medium">
                          Part {part.part_number}: {part.part_title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-tertiary flex-wrap">
                        <span>{part.program}</span>
                        {part.student_group && <span>· {part.student_group}</span>}
                        <span>· Submitted: {formatDate(part.completed_date)}</span>
                        <span>· Progress: {completed}/{total}</span>
                      </div>
                      {part.remarks && (
                        <p className="text-sm text-text-secondary mt-2 bg-app-bg rounded-[10px] px-3 py-2">
                          &ldquo;{part.remarks}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {rejectId === part.name ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            rows={2}
                            className="w-48 rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (rejectReason.trim()) {
                                  rejectMutation.mutate({ id: part.name, reason: rejectReason });
                                }
                              }}
                              disabled={!rejectReason.trim() || rejectMutation.isPending}
                              className="flex-1 px-3 py-1.5 bg-error text-white text-xs rounded-[10px] font-medium disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectReason(""); }}
                              className="px-3 py-1.5 bg-surface border border-border-light text-xs rounded-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setActioningId(part.name);
                              approveMutation.mutate(part.name);
                            }}
                            disabled={actioningId === part.name}
                            className="flex items-center gap-1.5 px-3 py-2 bg-success text-white text-sm rounded-[10px] font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                          >
                            {actioningId === part.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectId(part.name)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-error text-error text-sm rounded-[10px] font-medium hover:bg-error/5 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Configuration Section ───────────────────────────────────────
function ConfigSection({ configs, branchCourses, coursePrograms, isLoading, company }: {
  configs: SyllabusConfig[];
  branchCourses: string[];
  coursePrograms: Record<string, string[]>;
  isLoading: boolean;
  company: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editConfig, setEditConfig] = useState<SyllabusConfig | null>(null);
  const [preselectedCourse, setPreselectedCourse] = useState<string | null>(null);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSyllabusConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-configs"] });
      queryClient.invalidateQueries({ queryKey: ["syllabus-parts"] });
      setConfirmDeleteId(null);
    },
  });

  // Build grade → courses hierarchy from branchCourses + configs
  const grades = useMemo(() => {
    const allCourses = new Set([...branchCourses, ...configs.map((c) => c.course)]);
    const gradeMap = new Map<string, { courses: string[]; configuredCount: number; totalCount: number }>();

    for (const course of allCourses) {
      const grade = course.match(/^(\d+\w*)/)?.[1] || "Other";
      if (!gradeMap.has(grade)) gradeMap.set(grade, { courses: [], configuredCount: 0, totalCount: 0 });
      const entry = gradeMap.get(grade)!;
      entry.courses.push(course);
      entry.totalCount++;
      // Check if ANY config exists for this course (any program)
      if (configs.some((c) => c.course === course)) {
        entry.configuredCount++;
      }
    }

    // Sort grades numerically, courses alphabetically
    return [...gradeMap.entries()]
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([grade, data]) => ({
        grade,
        courses: data.courses.sort(),
        configuredCount: data.configuredCount,
        totalCount: data.totalCount,
      }));
  }, [branchCourses, configs]);

  // Build a map: course → configs for that course
  const configByCourse = useMemo(() => {
    const map = new Map<string, SyllabusConfig[]>();
    for (const c of configs) {
      if (!map.has(c.course)) map.set(c.course, []);
      map.get(c.course)!.push(c);
    }
    return map;
  }, [configs]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[14px] bg-surface border border-border-light animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Configure Form */}
      {(showForm || editConfig) && (
        <ConfigureForm
          config={editConfig}
          branchCourses={branchCourses}
          coursePrograms={coursePrograms}
          company={company}
          preselectedCourse={preselectedCourse}
          onClose={() => { setShowForm(false); setEditConfig(null); setPreselectedCourse(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["syllabus-configs"] });
            queryClient.invalidateQueries({ queryKey: ["syllabus-parts"] });
            setShowForm(false);
            setEditConfig(null);
            setPreselectedCourse(null);
          }}
        />
      )}

      {/* Grade drill-down */}
      <div className="space-y-3">
        {grades.map(({ grade, courses, configuredCount, totalCount }) => {
          const isOpen = expandedGrade === grade;

          return (
            <Card key={grade}>
              {/* Grade header */}
              <button
                onClick={() => setExpandedGrade(isOpen ? null : grade)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{grade}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Class {grade}</h3>
                    <p className="text-xs text-text-tertiary">
                      {courses.length} subject{courses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {configuredCount > 0 && (
                    <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md">
                      {configuredCount} configured
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>
              </button>

              {/* Expanded: courses under this grade */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border-light divide-y divide-border-light/50">
                      {courses.map((course) => {
                        const courseConfigs = configByCourse.get(course) ?? [];
                        // Strip grade prefix for display (e.g., "10th Mathematics" → "Mathematics")
                        const displayName = course.replace(/^\d+\w*\s+/, "");

                        return (
                          <div key={course} className="px-5 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-medium text-text-primary">{displayName}</p>
                              <button
                                onClick={() => { setEditConfig(null); setPreselectedCourse(course); setShowForm(true); }}
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            </div>
                            {/* Show configured programs for this course */}
                            {courseConfigs.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {courseConfigs
                                  .sort((a, b) => a.program.localeCompare(b.program))
                                  .map((cfg) => (
                                  <div
                                    key={cfg.name}
                                    className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-app-bg/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="success" className="text-[10px]">
                                        {cfg.program}
                                      </Badge>
                                      <span className="text-xs text-text-tertiary">
                                        {cfg.total_parts} parts
                                      </span>
                                    </div>
                                    {confirmDeleteId === cfg.name ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-text-secondary">Delete?</span>
                                        <button
                                          onClick={() => deleteMutation.mutate(cfg.name)}
                                          disabled={deleteMutation.isPending}
                                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                        >
                                          {deleteMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            "Yes"
                                          )}
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(null)}
                                          disabled={deleteMutation.isPending}
                                          className="text-xs font-medium text-text-secondary hover:underline disabled:opacity-50"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => setEditConfig(cfg)}
                                          className="text-xs text-primary hover:underline font-medium"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(cfg.name)}
                                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                                          title="Delete this configuration"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}

        {grades.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No courses found for this branch</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Configure Form (Create / Edit) ─────────────────────────────
function ConfigureForm({ config, branchCourses, coursePrograms, company, preselectedCourse, onClose, onSuccess }: {
  config: SyllabusConfig | null;
  branchCourses: string[];
  coursePrograms: Record<string, string[]>;
  company: string;
  preselectedCourse?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!config;
  const [course, setCourse] = useState(config?.course || preselectedCourse || "");
  const [program, setProgram] = useState(config?.program || "");
  const [totalParts, setTotalParts] = useState(config?.total_parts || 4);
  const [parts, setParts] = useState<{ part_number: number; part_title: string }[]>(
    config?.parts?.map((p) => ({ part_number: p.part_number, part_title: p.part_title })) ||
    Array.from({ length: 4 }, (_, i) => ({ part_number: i + 1, part_title: "" })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Derive available programs instantly from the map (no fetch needed)
  const programs = useMemo(() => coursePrograms[course] ?? [], [coursePrograms, course]);

  // Auto-select if only one option
  useEffect(() => {
    if (!isEdit && programs.length === 1) setProgram(programs[0]);
    if (!isEdit && programs.length > 1) setProgram("");
  }, [programs, isEdit]);

  // Sync parts array with totalParts
  function handleTotalPartsChange(n: number) {
    if (n < 1 || n > 50) return;
    setTotalParts(n);
    if (n > parts.length) {
      setParts([
        ...parts,
        ...Array.from({ length: n - parts.length }, (_, i) => ({
          part_number: parts.length + i + 1,
          part_title: "",
        })),
      ]);
    } else {
      setParts(parts.slice(0, n));
    }
  }

  function updatePartTitle(index: number, title: string) {
    const updated = [...parts];
    updated[index] = { ...updated[index], part_title: title };
    setParts(updated);
  }

  async function handleSave() {
    if (!course && !isEdit) {
      setError("Please select a course");
      return;
    }
    if (!program && !isEdit) {
      setError("Please select a program (board)");
      return;
    }
    if (parts.some((p) => !p.part_title.trim())) {
      setError("All parts must have a title");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isEdit && config) {
        await updateSyllabusConfig(config.name, { total_parts: totalParts, parts });
      } else {
        // Get current academic year
        const ayRes = await fetch(
          `/api/proxy/resource/Academic Year?${new URLSearchParams({
            filters: JSON.stringify([["name", "like", "%"]]),
            fields: JSON.stringify(["name"]),
            order_by: "name desc",
            limit_page_length: "1",
          })}`,
          { credentials: "include" },
        );
        let academicYear = "2025-2026";
        if (ayRes.ok) {
          const ayData = await ayRes.json();
          if (ayData.data?.[0]) academicYear = ayData.data[0].name;
        }

        await createSyllabusConfig({
          course,
          program,
          company,
          academic_year: academicYear,
          total_parts: totalParts,
          parts,
        });
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              {isEdit ? `Edit: ${config?.course}` : "Configure Syllabus Parts"}
            </h3>
            <button onClick={onClose} className="text-sm text-text-tertiary hover:text-text-primary">
              Cancel
            </button>
          </div>

          {/* Course select (only for new, hidden when preselected) */}
          {!isEdit && !preselectedCourse && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
              >
                <option value="">Select a course</option>
                {branchCourses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          {!isEdit && preselectedCourse && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <p className="h-10 flex items-center rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary">{preselectedCourse}</p>
            </div>
          )}

          {/* Program (board) select (only for new, shown after course is picked) */}
          {!isEdit && course && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Program (Board)</label>
              {programs.length === 0 ? (
                <p className="text-sm text-text-tertiary px-1">No programs found for this course</p>
              ) : (
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                >
                  <option value="">Select program</option>
                  {programs.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Total parts */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Number of Parts</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTotalPartsChange(totalParts - 1)}
                disabled={totalParts <= 1}
                className="h-10 w-10 rounded-[10px] border border-border-input bg-surface text-lg font-medium disabled:opacity-30 hover:bg-app-bg"
              >
                −
              </button>
              <span className="text-lg font-semibold text-text-primary w-8 text-center">{totalParts}</span>
              <button
                onClick={() => handleTotalPartsChange(totalParts + 1)}
                disabled={totalParts >= 50}
                className="h-10 w-10 rounded-[10px] border border-border-input bg-surface text-lg font-medium disabled:opacity-30 hover:bg-app-bg"
              >
                +
              </button>
            </div>
          </div>

          {/* Part titles */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {parts.map((part, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-tertiary w-12 shrink-0">
                  Part {part.part_number}
                </span>
                <input
                  type="text"
                  value={part.part_title}
                  onChange={(e) => updatePartTitle(idx, e.target.value)}
                  placeholder={`Title for Part ${part.part_number}`}
                  className="flex-1 h-9 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary"
                />
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-error bg-error/5 rounded-[10px] px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isEdit ? "Update Configuration" : "Save Configuration"}
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Progress Section ────────────────────────────────────────────
function ProgressSection({ allParts, configs, isLoading }: {
  allParts: SyllabusPartCompletion[];
  configs: SyllabusConfig[];
  isLoading: boolean;
}) {
  const [expandedInstructor, setExpandedInstructor] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[14px] bg-surface border border-border-light animate-pulse" />
        ))}
      </div>
    );
  }

  // Group by instructor → then by course+program
  const instructors = useMemo(() => {
    const instMap = new Map<string, { name: string; displayName: string; courses: { key: string; course: string; program: string; studentGroup?: string; total: number; completed: number; pending: number; rejected: number; pct: number; parts: SyllabusPartCompletion[] }[] }>();

    // First group by instructor+course+program
    const courseMap = new Map<string, SyllabusPartCompletion[]>();
    for (const p of allParts) {
      const key = `${p.instructor}::${p.course}::${p.program}`;
      if (!courseMap.has(key)) courseMap.set(key, []);
      courseMap.get(key)!.push(p);
    }

    for (const [key, parts] of courseMap) {
      const first = parts[0];
      const instKey = first.instructor;
      const displayName = first.instructor_name || first.instructor;
      const total = first.total_parts;
      const completed = parts.filter((p) => p.status === "Completed").length;
      const pending = parts.filter((p) => p.status === "Pending Approval").length;
      const rejected = parts.filter((p) => p.status === "Rejected").length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      if (!instMap.has(instKey)) {
        instMap.set(instKey, { name: instKey, displayName, courses: [] });
      }
      instMap.get(instKey)!.courses.push({
        key, course: first.course, program: first.program,
        studentGroup: first.student_group, total, completed, pending, rejected, pct,
        parts: parts.sort((a, b) => a.part_number - b.part_number),
      });
    }

    // Sort instructors by name, courses by course name
    return [...instMap.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((inst) => ({
        ...inst,
        courses: inst.courses.sort((a, b) => a.course.localeCompare(b.course)),
        totalCompleted: inst.courses.reduce((s, c) => s + c.completed, 0),
        totalParts: inst.courses.reduce((s, c) => s + c.total, 0),
        totalPending: inst.courses.reduce((s, c) => s + c.pending, 0),
      }));
  }, [allParts]);

  if (instructors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">No progress data yet</p>
          <p className="text-sm text-text-tertiary mt-1">Configure syllabus parts for courses first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {instructors.map((inst) => {
        const isOpen = expandedInstructor === inst.name;
        const overallPct = inst.totalParts > 0 ? Math.round((inst.totalCompleted / inst.totalParts) * 100) : 0;

        return (
          <motion.div
            key={inst.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              {/* Instructor header — clickable */}
              <button
                onClick={() => {
                  setExpandedInstructor(isOpen ? null : inst.name);
                  if (isOpen) setExpandedCourse(null);
                }}
                className="w-full p-5 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {inst.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary">{inst.displayName}</h3>
                    <p className="text-xs text-text-tertiary">
                      {inst.courses.length} course{inst.courses.length !== 1 ? "s" : ""} · {inst.totalCompleted}/{inst.totalParts} parts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Overall progress */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-border-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary font-medium w-8">{overallPct}%</span>
                  </div>
                  {inst.totalPending > 0 && (
                    <Badge variant="warning">{inst.totalPending}</Badge>
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>
              </button>

              {/* Expanded courses */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border-light px-5 pb-4 pt-3 space-y-2">
                      {inst.courses.map((c) => {
                        const isCourseOpen = expandedCourse === c.key;
                        return (
                          <div key={c.key} className="rounded-[10px] bg-app-bg/50 overflow-hidden">
                            {/* Course row — clickable */}
                            <button
                              onClick={() => setExpandedCourse(isCourseOpen ? null : c.key)}
                              className="w-full flex items-center gap-4 py-2.5 px-3 hover:bg-app-bg transition-colors text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary">{c.course}</p>
                                <p className="text-xs text-text-tertiary">
                                  {c.program}
                                  {c.studentGroup && ` · ${c.studentGroup}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-border-light rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${c.pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-text-secondary font-medium">{c.completed}/{c.total}</span>
                                </div>
                                <div className="flex gap-1">
                                  {c.pending > 0 && <Badge variant="warning">{c.pending} pending</Badge>}
                                  {c.rejected > 0 && <Badge variant="error">{c.rejected} rejected</Badge>}
                                  {c.completed === c.total && c.total > 0 && <Badge variant="success">Done</Badge>}
                                </div>
                                {isCourseOpen ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
                                )}
                              </div>
                            </button>

                            {/* Part-wise detail */}
                            <AnimatePresence>
                              {isCourseOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-border-light/50 px-3 pb-3 pt-2 space-y-1">
                                    {c.parts.map((part) => (
                                      <div
                                        key={part.name}
                                        className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-xs font-medium text-text-tertiary w-6 shrink-0">#{part.part_number}</span>
                                          <span className="text-sm text-text-primary truncate">{part.part_title}</span>
                                        </div>
                                        <div className="shrink-0">
                                          {part.status === "Not Started" && <Badge variant="outline">Not Started</Badge>}
                                          {part.status === "Pending Approval" && <Badge variant="warning">Pending</Badge>}
                                          {part.status === "Completed" && <Badge variant="success">Completed</Badge>}
                                          {part.status === "Rejected" && <Badge variant="error">Rejected</Badge>}
                                        </div>
                                      </div>
                                    ))}
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
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
