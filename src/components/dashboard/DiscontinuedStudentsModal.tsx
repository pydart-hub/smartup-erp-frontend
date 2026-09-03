"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  GraduationCap,
  Building2,
  Calendar,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
  ChevronsUpDown,
  Phone,
  User,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getDiscontinuedStudents, type DiscontinuedStudent } from "@/lib/api/director";

interface DiscontinuedStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
}

export function DiscontinuedStudentsModal({
  isOpen,
  onClose,
  totalCount,
}: DiscontinuedStudentsModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [openBranches, setOpenBranches] = useState<Set<string>>(new Set());
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Fetch all discontinued students with limit 1000 so no students are truncated
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["discontinued-students-all"],
    queryFn: () => getDiscontinuedStudents({ limit_page_length: 1000 }),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const students = data?.data ?? [];
  const trueTotalCount = data?.count ?? totalCount ?? students.length;

  // Compute all unique branches with counts
  const branchList = useMemo(() => {
    const counts: Record<string, { count: number; abbr: string }> = {};
    for (const s of students) {
      const b = s.custom_branch || "Other / Unassigned";
      if (!counts[b]) {
        counts[b] = {
          count: 0,
          abbr: s.custom_branch_abbr || b.replace("Smart Up ", "").slice(0, 3).toUpperCase(),
        };
      }
      counts[b].count += 1;
      if (s.custom_branch_abbr) {
        counts[b].abbr = s.custom_branch_abbr;
      }
    }
    return Object.entries(counts)
      .map(([name, { count, abbr }]) => ({ name, count, abbr }))
      .sort((a, b) => b.count - a.count);
  }, [students]);

  // Group and filter students by search input and branch
  const query = searchInput.toLowerCase().trim();

  const filteredGroups = useMemo(() => {
    const temp: Record<
      string,
      { abbr: string; list: DiscontinuedStudent[] }
    > = {};

    for (const student of students) {
      // Branch filter
      if (selectedBranch !== "all" && student.custom_branch !== selectedBranch) {
        continue;
      }

      // Search filter
      if (query) {
        const matchesName = student.student_name?.toLowerCase().includes(query);
        const matchesId = student.name?.toLowerCase().includes(query);
        const matchesMobile = student.student_mobile_number?.includes(query);
        const matchesParentMobile = student.parent_mobile?.includes(query);
        const matchesParentName = student.parent_name?.toLowerCase().includes(query);
        const matchesBatch = student.student_batch_name?.toLowerCase().includes(query);
        const matchesBranch = student.custom_branch?.toLowerCase().includes(query);
        const matchesReason = student.custom_discontinuation_reason?.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesId &&
          !matchesMobile &&
          !matchesParentMobile &&
          !matchesParentName &&
          !matchesBatch &&
          !matchesBranch &&
          !matchesReason
        ) {
          continue;
        }
      }

      const branchName = student.custom_branch || "Other / Unassigned";
      if (!temp[branchName]) {
        temp[branchName] = {
          abbr: student.custom_branch_abbr || branchName.replace("Smart Up ", "").slice(0, 3).toUpperCase(),
          list: [],
        };
      }
      temp[branchName].list.push(student);
    }

    return Object.entries(temp)
      .map(([branch, { abbr, list }]) => ({ branch, abbr, students: list }))
      .sort((a, b) => b.students.length - a.students.length);
  }, [students, query, selectedBranch]);

  const totalFilteredCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.students.length, 0);
  }, [filteredGroups]);

  // Auto-expand branches when searching or selecting a specific branch
  useEffect(() => {
    if (query) {
      setOpenBranches(new Set(filteredGroups.map((g) => g.branch)));
    } else if (selectedBranch !== "all") {
      setOpenBranches(new Set([selectedBranch]));
    }
  }, [query, selectedBranch, filteredGroups]);

  // Toggle individual branch
  const toggleBranch = (branchName: string) => {
    setOpenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchName)) {
        next.delete(branchName);
      } else {
        next.add(branchName);
      }
      return next;
    });
  };

  // Expand / collapse all branches
  const areAllOpen =
    filteredGroups.length > 0 &&
    filteredGroups.every((g) => openBranches.has(g.branch));

  const toggleExpandAll = () => {
    if (areAllOpen) {
      setOpenBranches(new Set());
    } else {
      setOpenBranches(new Set(filteredGroups.map((g) => g.branch)));
    }
  };

  const handleClose = () => {
    setSearchInput("");
    setSelectedBranch("all");
    setOpenBranches(new Set());
    setExpandedStudentId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm dark:bg-black/60"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-border-light dark:border-cyan-900/40 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border-light dark:border-cyan-900/50 bg-surface dark:bg-slate-900">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-error/10 dark:bg-red-500/15 flex items-center justify-center shrink-0 ring-1 ring-error/20">
                    <AlertCircle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary">
                        Discontinued Students
                      </h2>
                      <Badge variant="outline" className="text-xs bg-error/5 text-error border-error/20 font-semibold">
                        {trueTotalCount} Total
                      </Badge>
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5 font-medium">
                      Branch-wise classification across {branchList.length} branches
                      {selectedBranch !== "all" ? ` · Filtered by ${selectedBranch.replace("Smart Up ", "")}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  aria-label="Close modal"
                  className="p-2 hover:bg-border-light dark:hover:bg-slate-800 rounded-xl transition-colors text-text-secondary hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Controls Bar: Search + Branch Filter + Expand All */}
              <div className="p-4 border-b border-border-light dark:border-cyan-900/40 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search by student name, roll number, mobile..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 text-sm"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch selector dropdown */}
                <div className="relative shrink-0 sm:w-56">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-lg border border-border-light dark:border-cyan-900/50 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    <option value="all">All Branches ({students.length})</option>
                    {branchList.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name.replace("Smart Up ", "")} ({b.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                </div>

                {/* Expand / Collapse All */}
                {filteredGroups.length > 0 && (
                  <button
                    onClick={toggleExpandAll}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-border-light dark:border-cyan-900/50 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    title={areAllOpen ? "Collapse All Branches" : "Expand All Branches"}
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span>{areAllOpen ? "Collapse All" : "Expand All"}</span>
                  </button>
                )}
              </div>

              {/* Status Banner when searching or filtering */}
              {(query || selectedBranch !== "all") && !isLoading && (
                <div className="px-6 py-2 bg-primary/5 dark:bg-cyan-500/10 border-b border-primary/10 dark:border-cyan-500/20 flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">
                    Showing <strong className="text-text-primary">{totalFilteredCount}</strong> students across{" "}
                    <strong className="text-text-primary">{filteredGroups.length}</strong> branch{filteredGroups.length === 1 ? "" : "es"}
                  </span>
                  {(query || selectedBranch !== "all") && (
                    <button
                      onClick={() => {
                        setSearchInput("");
                        setSelectedBranch("all");
                      }}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Filters
                    </button>
                  )}
                </div>
              )}

              {/* Modal Content: Branch Accordions */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/40 dark:bg-slate-900/30">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-72 gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm font-medium text-text-secondary">Loading discontinued students...</p>
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center h-72 gap-3 p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Failed to load discontinued students</p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-72 gap-3 p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-tertiary">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">
                      {query || selectedBranch !== "all" ? "No matching students found" : "No discontinued students"}
                    </p>
                    <p className="text-xs text-text-tertiary max-w-sm">
                      {query
                        ? `No discontinued students match "${searchInput}". Try adjusting your search query.`
                        : "There are currently no discontinued students recorded."}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const isOpen = openBranches.has(group.branch);
                    const cleanBranchName = group.branch.replace("Smart Up ", "").replace("Smart Up", "HQ");

                    return (
                      <div
                        key={group.branch}
                        className="rounded-xl border border-border-light dark:border-cyan-900/40 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden transition-all duration-200"
                      >
                        {/* Branch Dropdown / Accordion Header */}
                        <button
                          type="button"
                          onClick={() => toggleBranch(group.branch)}
                          className={`w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left transition-colors ${
                            isOpen
                              ? "bg-slate-50/80 dark:bg-slate-800/95 border-b border-border-light dark:border-cyan-900/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-cyan-400/15 flex items-center justify-center shrink-0 ring-1 ring-primary/15">
                              <Building2 className="h-4 w-4 text-primary dark:text-cyan-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-text-primary truncate">
                                  {cleanBranchName}
                                </span>
                                {group.abbr && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-text-tertiary">
                                    {group.abbr}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-tertiary mt-0.5 font-medium">
                                {group.students.length} discontinued student{group.students.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-error/10 text-error ring-1 ring-error/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-error" />
                              {group.students.length}
                            </span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary bg-slate-100 dark:bg-slate-700/50 transition-transform">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-primary" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Branch Students List (Drill-down) */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="divide-y divide-border-light/70 dark:divide-cyan-900/30">
                                {group.students.map((student) => (
                                  <StudentRow
                                    key={student.name}
                                    student={student}
                                    isExpanded={expandedStudentId === student.name}
                                    onToggle={() =>
                                      setExpandedStudentId(
                                        expandedStudentId === student.name ? null : student.name
                                      )
                                    }
                                  />
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

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-border-light dark:border-cyan-900/50 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <div className="text-xs text-text-secondary font-medium">
                  Showing <span className="font-semibold text-text-primary">{totalFilteredCount}</span> of{" "}
                  <span className="font-semibold text-text-primary">{students.length}</span> students
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-text-primary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface StudentRowProps {
  student: DiscontinuedStudent;
  isExpanded: boolean;
  onToggle: () => void;
}

function StudentRow({ student, isExpanded, onToggle }: StudentRowProps) {
  const discontinuationDate = student.custom_discontinuation_date
    ? new Date(student.custom_discontinuation_date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  const joiningDate = student.joining_date
    ? new Date(student.joining_date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  const initials = student.student_name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "ST";

  const detailItems = [
    { label: "Parent Name", value: student.parent_name || "N/A", icon: User },
    { label: "Parent Mobile", value: student.parent_mobile || "N/A", icon: Phone },
    { label: "Student Mobile", value: student.student_mobile_number || "N/A", icon: Phone },
    { label: "Joining Date", value: joiningDate, icon: Calendar },
  ];

  return (
    <div className="bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left transition-colors"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-cyan-400/15 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
            <span className="text-xs font-bold text-primary dark:text-cyan-300">
              {initials}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-text-primary truncate">
                {student.student_name}
              </p>
              <span className="text-[11px] text-text-tertiary font-mono">
                {student.name}
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-text-tertiary flex-wrap">
              {student.student_batch_name ? (
                <span className="inline-flex items-center gap-1 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  {student.student_batch_name}
                </span>
              ) : student.program ? (
                <span className="inline-flex items-center gap-1 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  {student.program}
                </span>
              ) : null}
              {student.custom_branch && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {student.custom_branch_abbr || student.custom_branch.replace("Smart Up ", "")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Discontinuation Date and Chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error/10 text-error">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{discontinuationDate}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border-light dark:border-cyan-900/30 bg-slate-50/70 dark:bg-slate-800/40 px-5 py-4"
          >
            <div className="rounded-xl border border-border-light/80 dark:border-cyan-900/30 bg-white/95 dark:bg-slate-900/60 shadow-sm overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[1.3fr_0.9fr]">
                {/* Left side details */}
                <div className="p-4 border-b md:border-b-0 md:border-r border-border-light/80 dark:border-cyan-900/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {detailItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="rounded-lg border border-border-light/70 dark:border-cyan-900/30 bg-slate-50/80 dark:bg-slate-800/50 p-2.5"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                            <IconComponent className="h-3 w-3 text-text-tertiary" />
                            {item.label}
                          </div>
                          <p className="text-xs font-semibold text-text-primary mt-1 truncate">
                            {item.value}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-lg border border-border-light/70 dark:border-cyan-900/30 bg-slate-50/80 dark:bg-slate-800/50 p-2.5">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                        Student Type
                      </p>
                      <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900/60 font-semibold">
                        {student.custom_student_type || "Regular"}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-border-light/70 dark:border-cyan-900/30 bg-slate-50/80 dark:bg-slate-800/50 p-2.5">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                        Program / Class
                      </p>
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {student.program || student.student_batch_name || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side discontinuation card */}
                <div className="p-4 bg-gradient-to-b from-error/5 to-error/10 dark:from-red-950/20 dark:to-red-900/10 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-error" />
                      <span className="text-xs font-bold text-error uppercase tracking-wider">
                        Discontinuation Info
                      </span>
                    </div>

                    <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-error/20 p-3">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide">
                        Discontinuation Date
                      </p>
                      <p className="text-sm font-bold text-error mt-0.5">
                        {discontinuationDate}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-error/20 p-3">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide">
                        Reason for Discontinuation
                      </p>
                      <p className="text-xs font-semibold text-text-primary mt-1 leading-relaxed">
                        {student.custom_discontinuation_reason || "No reason specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
