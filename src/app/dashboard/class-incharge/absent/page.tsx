"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Users, XCircle, Download, Phone,
  User, ChevronDown, UserX,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { GifLoader } from "@/components/ui/GifLoader";
import { getAttendance } from "@/lib/api/attendance";

import { getBatches } from "@/lib/api/batches";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import type { Batch } from "@/lib/types/batch";

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
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function AbsentDetailsPage() {
  const { defaultCompany, allowedBatches } = useAuth();
  const { selectedYear } = useAcademicYearStore();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());

  // Derive branch (same logic as attendance page)
  const firstBatchCode = allowedBatches?.[0] ?? "";
  const { data: derivedBranch } = useQuery({
    queryKey: ["ci-absent-page-branch", firstBatchCode],
    queryFn: async () => {
      const res = await getBatches({ batch: firstBatchCode, limit_page_length: 1 });
      return res.data?.[0]?.custom_branch ?? "";
    },
    enabled: !defaultCompany && !!firstBatchCode,
    staleTime: 60 * 60_000,
  });
  const effectiveBranch = defaultCompany || derivedBranch || "";

  // Batches (for display names)
  const { data: batchesRes } = useQuery({
    queryKey: ["ci-absent-page-batches", effectiveBranch, selectedYear],
    queryFn: () => getBatches({ limit_page_length: 500, custom_branch: effectiveBranch, academic_year: selectedYear }),
    staleTime: 5 * 60_000,
    enabled: !!effectiveBranch,
  });
  const batches: Batch[] = (batchesRes?.data ?? []).filter((b: Batch) => !b.disabled);
  const batchMap = useMemo(() => new Map(batches.map((b) => [b.name, b])), [batches]);

  // â”€â”€ Query 1: attendance for selected date â”€â”€
  const { data: attendanceRes, isLoading: attendanceLoading } = useQuery({
    queryKey: ["ci-absent-page-att", effectiveBranch, selectedDate],
    queryFn: () => getAttendance(selectedDate, { custom_branch: effectiveBranch || undefined }),
    staleTime: 60_000,
    enabled: !!effectiveBranch,
  });

  const absentRecords = useMemo<AttRec[]>(
    () => (attendanceRes?.data ?? []).filter((r: AttRec) => r.status === "Absent"),
    [attendanceRes],
  );

  const totalRecords = attendanceRes?.data?.length ?? 0; // 0 = attendance not marked yet

  const absentStudentIds = useMemo(
    () => [...new Set(absentRecords.map((r: AttRec) => r.student as string))],
    [absentRecords],
  );

  // â”€â”€ Query 2: fetch full student docs (includes guardians child table) â”€â”€
  const { data: studentDocs, isLoading: studentsLoading } = useQuery({
    queryKey: ["ci-absent-page-full-students", absentStudentIds],
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
    enabled: absentStudentIds.length > 0,
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

  // â”€â”€ Query 3: bulk fetch Guardian phones via REST â”€â”€
  const { data: guardiansData, isLoading: guardiansLoading } = useQuery({
    queryKey: ["ci-absent-page-gphones", guardianIds],
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
    enabled: guardianIds.length > 0,
  });
  const guardianPhoneMap = useMemo(
    () => new Map<string, GuardianInfo>((guardiansData ?? []).map((g) => [g.name, g])),
    [guardiansData],
  );

  const isLoading = attendanceLoading || studentsLoading || guardiansLoading;

  // â”€â”€ Build merged rows grouped by batch â”€â”€
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
    const entries = [...groupedAbsent.entries()].sort(([, a], [, b]) =>
      a[0].batchDisplayName.localeCompare(b[0].batchDisplayName),
    );
    if (batchFilter === "all") return entries;
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
      ["Date", "Batch", "Student ID", "Student Name", "Student Mobile", "Parent/Guardian", "Guardian Mobile", "Relation"],
    ];
    for (const [, students] of filteredGroups) {
      for (const s of students) {
        rows.push([
          selectedDate,
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
    a.download = `absent-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 4 brand-palette slots â€” all CSS vars â†’ auto dark/light mode
  const colorSlots = [
    { from: "var(--color-primary)",   to: "var(--color-primary-hover)",   light: "var(--color-primary-light)",   text: "var(--color-primary)" },
    { from: "var(--color-secondary)", to: "var(--color-secondary-hover)", light: "var(--color-secondary-light)", text: "var(--color-secondary)" },
    { from: "var(--color-error)",     to: "#b91c1c",                      light: "var(--color-error-light)",     text: "var(--color-error)" },
    { from: "var(--color-info)",      to: "#1d4ed8",                      light: "var(--color-info-light)",      text: "var(--color-info)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen"
    >
      {/* Ambient orbs â€” brand palette, theme-aware */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-48 w-96 h-96 bg-secondary/4 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-primary/3 rounded-full blur-[70px]" />
      </div>

      <div className="relative z-10 space-y-5">
        <BreadcrumbNav />

        {/* â”€â”€ Hero Header â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 18 }}
          className="relative overflow-hidden rounded-2xl border border-border-light bg-surface"
          style={{ boxShadow: "var(--shadow-card-hover)" }}
        >
          {/* Brand gradient top accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
          />
          {/* Decorative orbs */}
          <div className="absolute -right-16 -top-8 w-48 h-48 bg-primary/8 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-secondary/6 rounded-full blur-2xl pointer-events-none" />

          <div className="relative px-6 pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              {/* Icon + title */}
              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
                  className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
                    boxShadow: "0 8px 24px -4px color-mix(in srgb, var(--color-primary) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <UserX className="h-7 w-7 text-white" />
                </motion.div>
                <div>
                  <h1
                    className="text-2xl font-extrabold tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Absent Details
                  </h1>
                  <p className="text-[11px] font-bold tracking-widest text-text-tertiary uppercase mt-0.5">
                    Daily Attendance Tracker
                  </p>
                  <p className="text-sm text-text-secondary mt-1.5">
                    {isLoading
                      ? "Fetching recordsâ€¦"
                      : totalRecords === 0
                      ? `Not marked Â· ${formatDateDisplay(selectedDate)}`
                      : `${totalAbsent} student${totalAbsent !== 1 ? "s" : ""} absent Â· ${formatDateDisplay(selectedDate)}`}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-end gap-2.5 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" /> Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setBatchFilter("all"); setCollapsedBatches(new Set()); }}
                    className="h-9 rounded-xl border border-border-input bg-surface px-3 text-sm font-medium text-text-primary shadow-card outline-none transition-all focus:border-primary"
                  />
                </div>

                {batchOptions.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" /> Class
                    </label>
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="h-9 rounded-xl border border-border-input bg-surface px-3 text-sm font-medium text-text-primary shadow-card outline-none transition-all focus:border-primary"
                    >
                      <option value="all">All Classes</option>
                      {batchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                {totalAbsent > 0 && !isLoading && (
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={exportCsv}
                    className="h-9 flex items-center gap-1.5 px-4 rounded-xl border border-border-input bg-surface text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-app-bg transition-all shadow-card"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </motion.button>
                )}
              </div>
            </div>

            {/* Stat badges */}
            {!isLoading && totalRecords > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-2.5 mt-5 flex-wrap"
              >
                <motion.div
                  whileHover={{ scale: 1.04, y: -1 }}
                  className="flex items-center gap-2 text-sm font-bold text-white px-4 py-1.5 rounded-full cursor-default"
                  style={{
                    background: "linear-gradient(135deg, var(--color-error), #b91c1c)",
                    boxShadow: "0 4px 14px -2px color-mix(in srgb, var(--color-error) 45%, transparent)",
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {totalAbsent} Absent
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.04, y: -1 }}
                  className="flex items-center gap-2 text-sm font-semibold text-text-secondary px-4 py-1.5 rounded-full cursor-default border border-border-input bg-surface shadow-card"
                >
                  <Users className="h-3.5 w-3.5 text-text-tertiary" />
                  {groupedAbsent.size} Class{groupedAbsent.size !== 1 ? "es" : ""}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* â”€â”€ Content â”€â”€ */}
        {isLoading ? (
          <GifLoader />
        ) : totalRecords === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 bg-app-bg border border-border-light"
              style={{ boxShadow: "var(--shadow-card-hover)" }}
            >
              <Calendar className="h-11 w-11 text-text-tertiary" />
            </motion.div>
            <p className="text-xl font-bold text-text-primary">Not Marked</p>
            <p className="text-sm text-text-secondary mt-2">
              Attendance has not been marked on<br />{formatDateDisplay(selectedDate)}
            </p>
          </motion.div>
        ) : totalAbsent === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 border border-border-light"
              style={{
                background: "var(--color-secondary-light)",
                boxShadow: "0 16px 40px -8px color-mix(in srgb, var(--color-secondary) 25%, transparent)",
              }}
            >
              <Users className="h-11 w-11 text-secondary" />
            </motion.div>
            <p className="text-xl font-bold text-text-primary">Full Attendance!</p>
            <p className="text-sm text-text-secondary mt-2">
              Everyone showed up on<br />{formatDateDisplay(selectedDate)} ðŸŽ‰
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {filteredGroups.map(([batchId, rows], idx) => {
              const isExpanded = !collapsedBatches.has(batchId);
              const c = colorSlots[idx % colorSlots.length];

              return (
                <motion.div
                  key={batchId}
                  variants={{
                    hidden: { opacity: 0, y: 28, scale: 0.97 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 22 } },
                  }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="rounded-2xl overflow-hidden bg-surface border border-border-light"
                  style={{ boxShadow: "var(--shadow-card)", transition: "box-shadow 0.2s" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      `0 16px 40px -8px color-mix(in srgb, ${c.from} 20%, transparent), var(--shadow-card)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
                  }}
                >
                  {/* Brand accent top bar */}
                  <div
                    className="h-0.5 w-full"
                    style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }}
                  />

                  {/* Batch header */}
                  <button
                    type="button"
                    onClick={() => toggleBatch(batchId)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-app-bg/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                          boxShadow: `0 4px 12px -2px color-mix(in srgb, ${c.from} 35%, transparent)`,
                        }}
                      >
                        <UserX className="h-[18px] w-[18px] text-white" />
                      </motion.div>
                      <span className="font-bold text-text-primary text-[15px] truncate">
                        {rows[0].batchDisplayName}
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 border"
                        style={{
                          color: c.text,
                          background: c.light,
                          borderColor: `color-mix(in srgb, ${c.from} 25%, transparent)`,
                        }}
                      >
                        {rows.length} absent
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <ChevronDown className="h-4 w-4 text-text-tertiary" />
                    </motion.div>
                  </button>

                  {/* Student cards */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 space-y-3 bg-app-bg/40">
                          {rows.map((row, rowIdx) => {
                            const initials = row.studentName
                              .split(" ")
                              .slice(0, 2)
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase();
                            return (
                              <motion.div
                                key={row.studentId}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: rowIdx * 0.05, type: "spring", stiffness: 240, damping: 24 }}
                                whileHover={{ y: -2, transition: { duration: 0.18 } }}
                                className="rounded-xl p-4 bg-surface border border-border-light"
                                style={{ boxShadow: "var(--shadow-card)", transition: "box-shadow 0.18s" }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.boxShadow =
                                    `0 8px 24px -4px color-mix(in srgb, ${c.from} 16%, transparent), var(--shadow-card)`;
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
                                }}
                              >
                                {/* Avatar + name */}
                                <div className="flex items-center gap-3 mb-3.5">
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                                    style={{
                                      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                                      boxShadow: `0 4px 10px -2px color-mix(in srgb, ${c.from} 35%, transparent)`,
                                      fontSize: 13,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-bold text-text-primary leading-tight truncate">
                                      {row.studentName}
                                    </p>
                                    <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                                      {row.studentId}
                                    </p>
                                  </div>
                                </div>

                                {/* Contact chips */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Student mobile */}
                                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-app-bg border border-border-light">
                                    <div className="w-5 h-5 rounded-md bg-info-light flex items-center justify-center shrink-0">
                                      <Phone className="h-2.5 w-2.5 text-info" />
                                    </div>
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide shrink-0">Student</span>
                                    {row.studentMobile ? (
                                      <a href={`tel:${row.studentMobile}`} className="text-xs text-info font-semibold hover:underline truncate ml-auto flex items-center gap-1">
                                        <span>📞</span>{row.studentMobile}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-text-tertiary ml-auto">—</span>
                                    )}
                                  </div>

                                  {/* Parent name */}
                                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-app-bg border border-border-light min-w-0">
                                    <div
                                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                      style={{ background: `color-mix(in srgb, ${c.from} 12%, transparent)` }}
                                    >
                                      <User className="h-2.5 w-2.5" style={{ color: c.text }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide shrink-0">Parent</span>
                                    {row.parentName ? (
                                      <span className="text-xs text-text-primary font-semibold truncate ml-auto">
                                        {row.parentName}
                                        {row.guardianRelation && (
                                          <span className="text-text-tertiary font-normal"> &middot; {row.guardianRelation}</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-text-tertiary ml-auto">—</span>
                                    )}
                                  </div>

                                  {/* Parent phone */}
                                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-app-bg border border-border-light sm:col-span-2">
                                    <div
                                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                      style={{ background: `color-mix(in srgb, ${c.from} 12%, transparent)` }}
                                    >
                                      <Phone className="h-2.5 w-2.5" style={{ color: c.text }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide shrink-0">Parent No.</span>
                                    {row.guardianMobile ? (
                                      <a
                                        href={`tel:${row.guardianMobile}`}
                                        className="text-xs font-bold hover:underline ml-auto flex items-center gap-1"
                                        style={{ color: c.text }}
                                      >
                                        <span>📞</span>{row.guardianMobile}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-text-tertiary ml-auto">—</span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
