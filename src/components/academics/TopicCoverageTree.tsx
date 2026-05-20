"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopicCoverageDetail } from "@/lib/api/analytics";
import type { TopicDrillClass, TopicDrillBatch, TopicDrillSubject } from "@/lib/types/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, Users, GraduationCap, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";

// ── helpers ────────────────────────────────────────────────────────────────

function CoverageBadge({ pct }: { pct: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${pctBadgeColor(pct, 70, 50)}`}>
      {pct}%
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-error";
  return (
    <div className="h-1 rounded-full bg-border-light overflow-hidden flex-1 min-w-[40px]">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Subject row ────────────────────────────────────────────────────────────

function SubjectRow({ subject, open, onToggle }: {
  subject: TopicDrillSubject;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-app-bg transition-colors group"
      >
        <div className="w-7 h-7 rounded-[6px] bg-primary/5 flex items-center justify-center shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-primary/60" />
        </div>
        <span className="flex-1 text-sm font-medium text-primary truncate">{subject.course}</span>
        <ProgressBar pct={subject.coverage_pct} />
        <CoverageBadge pct={subject.coverage_pct} />
        <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-10 mt-1 mb-2 space-y-1 border-l-2 border-border-light pl-3">
              {subject.topics.length === 0 ? (
                <p className="text-xs text-text-tertiary py-2 px-1">No topics assigned</p>
              ) : (
                subject.topics.map((t) => (
                  <div key={t.schedule} className="flex items-center gap-2 py-1 px-1">
                    {t.covered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    )}
                    <span className={`text-xs flex-1 truncate ${t.covered ? "text-primary" : "text-text-secondary"}`}>
                      {t.topic}
                    </span>
                    <span className="text-[10px] text-text-tertiary shrink-0">{t.date}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Batch row ──────────────────────────────────────────────────────────────

function BatchRow({ batch, batchKey, isOpen, onToggle, openSubjects, onToggleSubject }: {
  batch: TopicDrillBatch;
  batchKey: string;
  isOpen: boolean;
  onToggle: () => void;
  openSubjects: Set<string>;
  onToggleSubject: (key: string) => void;
}) {
  return (
    <div className="bg-app-bg rounded-[8px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 p-3 hover:bg-border-light/30 transition-colors group"
      >
        <div className={`w-8 h-8 rounded-[7px] flex items-center justify-center text-xs font-bold shrink-0 ${pctBadgeColor(batch.coverage_pct, 70, 50)}`}>
          {batch.coverage_pct}%
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{batch.student_group}</p>
          <p className="text-[11px] text-text-tertiary">
            {batch.covered}/{batch.total_with_topic} topics covered · {batch.subjects.length} subjects
          </p>
        </div>
        <ProgressBar pct={batch.coverage_pct} />
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-0.5">
              {batch.subjects.map((sub) => {
                const subKey = `${batchKey}|||${sub.course}`;
                return (
                  <SubjectRow
                    key={sub.course}
                    subject={sub}
                    open={openSubjects.has(subKey)}
                    onToggle={() => onToggleSubject(subKey)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Class row ──────────────────────────────────────────────────────────────

function ClassRow({ cls, openBatches, onToggleBatch, openSubjects, onToggleSubject }: {
  cls: TopicDrillClass;
  openBatches: Set<string>;
  onToggleBatch: (key: string) => void;
  openSubjects: Set<string>;
  onToggleSubject: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface rounded-[10px] border border-border-light overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-3 p-4 hover:bg-app-bg transition-colors group"
      >
        <div className={`w-10 h-10 rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0 ${pctBadgeColor(cls.coverage_pct, 70, 50)}`}>
          {cls.coverage_pct}%
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <p className="text-sm font-semibold text-primary truncate">{cls.program}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <ProgressBar pct={cls.coverage_pct} />
            <span className="text-[11px] text-text-tertiary whitespace-nowrap">
              {cls.covered}/{cls.total_with_topic} · {cls.batches.length} batches
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light px-3 py-2 space-y-2">
              {cls.batches.map((batch) => {
                const batchKey = `${cls.program}|||${batch.student_group}`;
                return (
                  <BatchRow
                    key={batch.student_group}
                    batch={batch}
                    batchKey={batchKey}
                    isOpen={openBatches.has(batchKey)}
                    onToggle={() => onToggleBatch(batchKey)}
                    openSubjects={openSubjects}
                    onToggleSubject={onToggleSubject}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function TopicCoverageTree({ branch }: { branch: string }) {
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["topic-coverage-detail", branch],
    queryFn: () => getTopicCoverageDetail(branch),
    staleTime: 120_000,
  });

  function toggleBatch(key: string) {
    setOpenBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSubject(key: string) {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 px-2 text-text-tertiary text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading class breakdown…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-error py-3 px-2">Failed to load topic coverage data.</p>
    );
  }

  if (data.classes.length === 0) {
    return (
      <p className="text-xs text-text-tertiary py-3 px-2">No topic data available for this branch.</p>
    );
  }

  return (
    <div className="mt-2 mb-1 space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1">
        <Users className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          {data.classes.length} class{data.classes.length !== 1 ? "es" : ""}
        </span>
      </div>
      {data.classes.map((cls) => (
        <ClassRow
          key={cls.program}
          cls={cls}
          openBatches={openBatches}
          onToggleBatch={toggleBatch}
          openSubjects={openSubjects}
          onToggleSubject={toggleSubject}
        />
      ))}
    </div>
  );
}
