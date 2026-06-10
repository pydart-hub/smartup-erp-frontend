"use client";

import React, { useState, useCallback } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getDiscontinuedStudents, type DiscontinuedStudent } from "@/lib/api/director";

interface DiscontinuedStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
}

const PAGE_SIZE = 25;

export function DiscontinuedStudentsModal({
  isOpen,
  onClose,
  totalCount,
}: DiscontinuedStudentsModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["discontinued-students", currentPage, searchInput],
    queryFn: () =>
      getDiscontinuedStudents({
        limit_start: currentPage * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        search: searchInput || undefined,
      }),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const students = data?.data ?? [];
  const totalPages = Math.ceil((data?.count ?? totalCount) / PAGE_SIZE);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const handleClose = () => {
    setCurrentPage(0);
    setSearchInput("");
    setExpandedId(null);
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface dark:bg-slate-900 rounded-xl shadow-2xl dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 p-6 border-b border-border-light dark:border-cyan-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/10 dark:bg-red-500/15 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      Discontinued Students
                    </h2>
                    <p className="text-sm text-text-tertiary mt-0.5">
                      Total: {data?.count ?? totalCount} students
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-border-light dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-text-secondary" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-border-light dark:border-cyan-900/50 bg-surface/50 dark:bg-slate-900/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search by student name..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-9 py-2"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-text-secondary">Loading students...</p>
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 p-4">
                    <AlertCircle className="h-8 w-8 text-error" />
                    <p className="text-sm text-error">Failed to load students</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 p-4">
                    <GraduationCap className="h-8 w-8 text-text-tertiary" />
                    <p className="text-sm text-text-secondary">
                      {searchInput ? "No matching students found" : "No discontinued students"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-light dark:divide-cyan-900/30">
                    {students.map((student) => (
                      <StudentRow
                        key={student.name}
                        student={student}
                        isExpanded={expandedId === student.name}
                        onToggle={() =>
                          setExpandedId(expandedId === student.name ? null : student.name)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with pagination */}
              {!isLoading && students.length > 0 && totalPages > 1 && (
                <div className="p-4 border-t border-border-light dark:border-cyan-900/50 bg-surface/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div className="text-sm text-text-secondary">
                    Page {currentPage + 1} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className="px-3 py-2 rounded-lg border border-border-light dark:border-cyan-900/50 hover:bg-border-light dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Prev
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                      className="px-3 py-2 rounded-lg border border-border-light dark:border-cyan-900/50 hover:bg-border-light dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      Next
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
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

  return (
    <div className="bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">
              {student.student_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary truncate">
              {student.student_name}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-text-tertiary flex-wrap">
              {student.custom_branch && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {student.custom_branch_abbr || student.custom_branch}
                </span>
              )}
              {student.student_batch_name && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {student.student_batch_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Date and expand icon */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 dark:bg-red-500/15">
              <Calendar className="h-3.5 w-3.5 text-error" />
              <span className="text-xs font-medium text-error">{discontinuationDate}</span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-tertiary flex-shrink-0" />
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
            className="border-t border-border-light dark:border-cyan-900/20 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Student ID & Email */}
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Student ID
                </p>
                <p className="text-sm text-text-primary font-mono">{student.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Email
                </p>
                <p className="text-sm text-text-primary truncate">
                  {student.student_email_id || "N/A"}
                </p>
              </div>

              {/* Mobile & Type */}
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Mobile
                </p>
                <p className="text-sm text-text-primary">
                  {student.student_mobile_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Student Type
                </p>
                <div className="flex items-center gap-2">
                  {student.custom_student_type ? (
                    <Badge variant="outline" className="text-xs">
                      {student.custom_student_type}
                    </Badge>
                  ) : (
                    <span className="text-sm text-text-tertiary">N/A</span>
                  )}
                </div>
              </div>

              {/* Branch & Program */}
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Branch
                </p>
                <p className="text-sm text-text-primary">{student.custom_branch || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Class / Program
                </p>
                <div className="flex items-center gap-2">
                  {student.student_batch_name ? (
                    <Badge variant="outline" className="text-xs">
                      {student.student_batch_name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-text-tertiary">N/A</span>
                  )}
                </div>
                {student.program && (
                  <p className="text-xs text-text-tertiary mt-1">Program: {student.program}</p>
                )}
              </div>

              {/* Joining & Discontinuation */}
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Joining Date
                </p>
                <p className="text-sm text-text-primary">
                  {student.joining_date
                    ? new Date(student.joining_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                  Discontinuation Date
                </p>
                <p className="text-sm text-error font-semibold">{discontinuationDate}</p>
              </div>

              {/* Reason */}
              {student.custom_discontinuation_reason && (
                <div className="col-span-2">
                  <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                    Reason
                  </p>
                  <p className="text-sm text-text-primary">{student.custom_discontinuation_reason}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
