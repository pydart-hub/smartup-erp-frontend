"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  X, Calendar, Users, XCircle, Download,
  Phone, User, ChevronDown, ChevronRight,
} from "lucide-react";
import { getAttendance } from "@/lib/api/attendance";

import apiClient from "@/lib/api/client";
import type { Batch } from "@/lib/types/batch";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  effectiveBranch: string;
  batchMap: Map<string, Batch>;
  initialDate?: string;
}

interface FullStudentDoc {
  name: string;
  student_name: string;
  student_mobile_number?: string;
  custom_parent_name?: string;
  guardians?: Array<{ guardian: string; guardian_name: string; relation?: string }>;
}

interface GuardianInfo {
  name: string;
  guardian_name: string;
  mobile_number?: string;
  alternate_number?: string;
}

interface AbsentRow {
  studentId: string;
  studentName: string;
  studentMobile?: string;
  parentName?: string;
  guardianMobile?: string;
  guardianRelation?: string;
  batchId: string;
  batchDisplayName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttRec = Record<string, any>;

function formatDateDisplay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

export function AbsentDetailPanel({
  isOpen, onClose, effectiveBranch, batchMap, initialDate,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [panelDate, setPanelDate] = useState(initialDate ?? today);
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());

  // ── Query 1: attendance for panel date ──
  const { data: attendanceRes, isLoading: attendanceLoading } = useQuery({
    queryKey: ["panel-absent-att", effectiveBranch, panelDate],
    queryFn: () => getAttendance(panelDate, { custom_branch: effectiveBranch || undefined }),
    staleTime: 60_000,
    enabled: isOpen && !!effectiveBranch,
  });

  const absentRecords = useMemo<AttRec[]>(
    () => (attendanceRes?.data ?? []).filter((r: AttRec) => r.status === "Absent"),
    [attendanceRes],
  );

  const totalRecords = attendanceRes?.data?.length ?? 0; // 0 = not marked yet

  const absentStudentIds = useMemo(
    () => [...new Set(absentRecords.map((r: AttRec) => r.student as string))],
    [absentRecords],
  );

  // ── Query 2: fetch full student docs (includes guardians child table) ──
  const { data: studentDocs, isLoading: studentsLoading } = useQuery({
    queryKey: ["panel-absent-full-students", absentStudentIds],
    queryFn: async () => {
      const docs = await Promise.all(
        absentStudentIds.map((id) =>
          apiClient.get(`/resource/Student/${encodeURIComponent(id)}`)
            .then((r) => r.data.data as FullStudentDoc)
            .catch(() => null),
        ),
      );
      return docs.filter(Boolean) as FullStudentDoc[];
    },
    staleTime: 5 * 60_000,
    enabled: isOpen && absentStudentIds.length > 0,
  });

  const studentMap = useMemo(
    () => new Map<string, FullStudentDoc>((studentDocs ?? []).map((s) => [s.name, s])),
    [studentDocs],
  );

  const guardianIds = useMemo(() => {
    const ids = new Set<string>();
    for (const doc of studentDocs ?? []) {
      for (const g of doc.guardians ?? []) {
        if (g.guardian) ids.add(g.guardian);
      }
    }
    return [...ids];
  }, [studentDocs]);

  // ── Query 3: bulk fetch Guardian phones via REST ──
  const { data: guardiansData, isLoading: guardiansLoading } = useQuery({
    queryKey: ["panel-guardian-phones", guardianIds],
    queryFn: async () => {
      const params = new URLSearchParams({
        fields: JSON.stringify(["name", "guardian_name", "mobile_number", "alternate_number"]),
        filters: JSON.stringify([["name", "in", guardianIds]]),
        limit_page_length: String(guardianIds.length),
      });
      const { data } = await apiClient.get(`/resource/Guardian?${params}`);
      return (data.data ?? []) as GuardianInfo[];
    },
    staleTime: 5 * 60_000,
    enabled: isOpen && guardianIds.length > 0,
  });
  const guardianPhoneMap = useMemo(
    () => new Map<string, GuardianInfo>((guardiansData ?? []).map((g) => [g.name, g])),
    [guardiansData],
  );

  const isLoading = attendanceLoading || studentsLoading || guardiansLoading;

  // ── Build merged rows grouped by batch ──
  const groupedAbsent = useMemo<Map<string, AbsentRow[]>>(() => {
    const map = new Map<string, AbsentRow[]>();
    for (const rec of absentRecords) {
      const student = studentMap.get(rec.student);
      const guardianLink = student?.guardians?.[0];
      const guardian = guardianLink ? guardianPhoneMap.get(guardianLink.guardian) : undefined;
      const row: AbsentRow = {
        studentId: rec.student,
        studentName: student?.student_name ?? rec.student_name ?? rec.student,
        studentMobile: student?.student_mobile_number,
        parentName: student?.custom_parent_name ?? guardianLink?.guardian_name,
        guardianMobile: guardian?.mobile_number ?? guardian?.alternate_number,
        guardianRelation: guardianLink?.relation,
        batchId: rec.student_group,
        batchDisplayName: batchMap.get(rec.student_group)?.student_group_name ?? rec.student_group,
      };
      const existing = map.get(rec.student_group) ?? [];
      existing.push(row);
      map.set(rec.student_group, existing);
    }
    return map;
  }, [absentRecords, studentMap, guardianPhoneMap, batchMap]);

  const batchOptions = useMemo(
    () =>
      [...groupedAbsent.keys()]
        .map((id) => ({ id, name: batchMap.get(id)?.student_group_name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [groupedAbsent, batchMap],
  );

  const filteredGroups = useMemo<[string, AbsentRow[]][]>(() => {
    if (batchFilter === "all") return [...groupedAbsent.entries()].sort(([, a], [, b]) => a[0].batchDisplayName.localeCompare(b[0].batchDisplayName));
    const rows = groupedAbsent.get(batchFilter);
    return rows ? [[batchFilter, rows]] : [];
  }, [groupedAbsent, batchFilter]);

  const totalAbsent = absentRecords.length;

  function toggleBatch(batchId: string) {
    setCollapsedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  function exportCsv() {
    const rows: string[][] = [
      ["Date", "Batch", "Student ID", "Student Name", "Student Mobile", "Parent/Guardian Name", "Guardian Mobile", "Relation"],
    ];
    for (const [, students] of filteredGroups) {
      for (const s of students) {
        rows.push([
          panelDate,
          s.batchDisplayName,
          s.studentId,
          s.studentName,
          s.studentMobile ?? "",
          s.parentName ?? "",
          s.guardianMobile ?? "",
          s.guardianRelation ?? "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absent-${panelDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-surface shadow-xl z-50 flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-error" />
                <h2 className="font-semibold text-text-primary text-base">Absent Students</h2>
                {!isLoading && totalAbsent > 0 && (
                  <span className="text-xs bg-error/10 text-error font-medium px-2 py-0.5 rounded-full">
                    {totalAbsent}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-app-bg transition-colors"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>

            {/* Controls: date picker + batch filter */}
            <div className="px-5 py-3 border-b border-border bg-app-bg/50 shrink-0 space-y-2.5">
              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <label className="text-xs font-medium text-text-secondary w-8 shrink-0">Date</label>
                <input
                  type="date"
                  value={panelDate}
                  onChange={(e) => {
                    setPanelDate(e.target.value);
                    setBatchFilter("all");
                    setCollapsedBatches(new Set());
                  }}
                  className="flex-1 h-8 rounded-[8px] border border-border-input bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Batch filter */}
              {batchOptions.length > 1 && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                  <label className="text-xs font-medium text-text-secondary w-8 shrink-0">Class</label>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="flex-1 h-8 rounded-[8px] border border-border-input bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">All Classes ({batchOptions.length})</option>
                    {batchOptions.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary line */}
              {!isLoading && (
                <p className="text-[11px] text-text-tertiary">
                  {formatDateDisplay(panelDate)} &bull;{" "}
                  {totalRecords === 0
                    ? "Attendance not marked"
                    : totalAbsent > 0
                    ? `${totalAbsent} absent across ${groupedAbsent.size} class${groupedAbsent.size !== 1 ? "es" : ""}`
                    : "Full attendance — no absences"}
                </p>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-[10px]" />
                      <Skeleton className="h-16 w-full rounded-[10px]" />
                      <Skeleton className="h-16 w-full rounded-[10px]" />
                    </div>
                  ))}
                </div>
              ) : totalRecords === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-text-tertiary/10 flex items-center justify-center mb-4">
                    <Calendar className="h-7 w-7 text-text-tertiary" />
                  </div>
                  <p className="font-semibold text-text-primary text-sm">Not Marked</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Attendance not marked on {formatDateDisplay(panelDate)}
                  </p>
                </div>
              ) : totalAbsent === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-success" />
                  </div>
                  <p className="font-semibold text-text-primary text-sm">Full Attendance!</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Everyone was present on {formatDateDisplay(panelDate)}
                  </p>
                </div>
              ) : (
                filteredGroups.map(([batchId, rows]) => {
                  const isExpanded = !collapsedBatches.has(batchId);
                  return (
                    <div key={batchId} className="border border-border rounded-[12px] overflow-hidden">
                      {/* Batch header */}
                      <button
                        type="button"
                        onClick={() => toggleBatch(batchId)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-app-bg hover:bg-brand-wash/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm text-text-primary truncate">
                            {rows[0].batchDisplayName}
                          </span>
                          <span className="text-[11px] bg-error/10 text-error font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                            {rows.length} absent
                          </span>
                        </div>
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />}
                      </button>

                      {/* Student rows */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-border/50">
                              {rows.map((row) => (
                                <div
                                  key={row.studentId}
                                  className="px-4 py-3 hover:bg-app-bg/60 transition-colors"
                                >
                                  {/* Student name + mobile */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-text-primary leading-tight">
                                        {row.studentName}
                                      </p>
                                      <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                                        {row.studentId}
                                      </p>
                                    </div>
                                    {row.studentMobile && (
                                      <a
                                        href={`tel:${row.studentMobile}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline shrink-0 mt-0.5"
                                      >
                                        <Phone className="h-3 w-3" />
                                        {row.studentMobile}
                                      </a>
                                    )}
                                  </div>

                                  {/* Parent / guardian row */}
                                  {(row.parentName || row.guardianMobile) && (
                                    <div className="mt-2 flex items-center justify-between gap-2 bg-app-bg rounded-[8px] px-3 py-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <User className="h-3 w-3 text-text-tertiary shrink-0" />
                                        <span className="text-xs text-text-secondary truncate">
                                          {row.parentName}
                                          {row.guardianRelation && (
                                            <span className="text-text-tertiary ml-1">
                                              ({row.guardianRelation})
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      {row.guardianMobile && (
                                        <a
                                          href={`tel:${row.guardianMobile}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline shrink-0"
                                        >
                                          <Phone className="h-3 w-3" />
                                          {row.guardianMobile}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: export */}
            {totalAbsent > 0 && !isLoading && (
              <div className="px-5 py-3 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-[10px] border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-app-bg hover:text-text-primary transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
