"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Download,
  Search,
  Building2,
  Phone,
  ArrowLeft,
  Activity,
  Award,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  type AttemptWithPublishing,
  getAttemptLevelBreakdown,
  getOrdinalSuffix,
} from "@/lib/public-exam/diagnostics";

interface DiagnosisExamsReportProps {
  attempts: AttemptWithPublishing[];
  title: string;
}

export function DiagnosisExamsReport({ attempts, title }: DiagnosisExamsReportProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Group attempts by classLevel
  const classGroupsMap = new Map<string, AttemptWithPublishing[]>();
  attempts.forEach((a) => {
    const group = classGroupsMap.get(a.classLevel) || [];
    group.push(a);
    classGroupsMap.set(a.classLevel, group);
  });

  // Unique sorted list of available classes
  const availableClasses = Array.from(classGroupsMap.keys())
    .map((lvl) => parseInt(lvl, 10))
    .filter((lvl) => !isNaN(lvl))
    .sort((a, b) => a - b)
    .map((lvl) => String(lvl));

  // Determine current class stats (unique students and total attempts)
  const getClassStats = (classLevel: string) => {
    const group = classGroupsMap.get(classLevel) || [];
    const uniqueStudents = new Set(group.map((a) => `${a.studentName}-${a.studentPhone || ""}`));
    return {
      attemptsCount: group.length,
      studentsCount: uniqueStudents.size,
    };
  };

  // Get data for selected class
  const classAttempts = selectedClass ? (classGroupsMap.get(selectedClass) || []) : [];

  // Identify all unique subjects assessed in this class
  const classSubjects = Array.from(
    new Set(classAttempts.map((a) => a.publishing.subject.name))
  ).sort();

  // Unique branches for the branch filter dropdown
  const uniqueBranches = Array.from(
    new Set(classAttempts.map((a) => a.studentBranch).filter((b): b is string => !!b))
  ).sort();

  // Group student attempts inside selected class
  interface StudentRow {
    key: string;
    studentName: string;
    studentPhone: string | null;
    studentBranch: string | null;
    attemptsBySubject: Record<string, AttemptWithPublishing>;
  }

  const studentRowsMap = new Map<string, StudentRow>();
  classAttempts.forEach((attempt) => {
    const studentKey = `${attempt.studentName}-${attempt.studentPhone || ""}`;
    const row = studentRowsMap.get(studentKey) || {
      key: studentKey,
      studentName: attempt.studentName,
      studentPhone: attempt.studentPhone,
      studentBranch: attempt.studentBranch,
      attemptsBySubject: {},
    };

    // Keep the latest attempt for each subject
    const subjectName = attempt.publishing.subject.name;
    const existingAttempt = row.attemptsBySubject[subjectName];
    if (!existingAttempt || new Date(attempt.startedAt) > new Date(existingAttempt.startedAt)) {
      row.attemptsBySubject[subjectName] = attempt;
    }
    studentRowsMap.set(studentKey, row);
  });

  const studentsList = Array.from(studentRowsMap.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName)
  );

  // Filter students based on search query and selected branch
  const filteredStudents = studentsList.filter(
    (s) =>
      (s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.studentPhone && s.studentPhone.includes(searchQuery)) ||
        (s.studentBranch && s.studentBranch.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (selectedBranch === "all" || s.studentBranch === selectedBranch)
  );

  // Export report to CSV
  const handleDownloadCSV = () => {
    if (!selectedClass) return;

    const headers = ["Student Name", "Phone", "Branch", "Class", ...classSubjects];
    const rows = filteredStudents.map((student) => {
      const rowData = [
        student.studentName,
        student.studentPhone || "—",
        student.studentBranch || "—",
        `Class ${selectedClass}`,
      ];

      classSubjects.forEach((subName) => {
        const attempt = student.attemptsBySubject[subName];
        if (!attempt) {
          rowData.push("Not Attempted");
        } else {
          const { diagnosedLevel } = getAttemptLevelBreakdown(attempt);
          const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";
          rowData.push(diagnosedLevel ? `${diagnosedLevel}${isSubmitted ? "" : " (Live)"}` : "—");
        }
      });

      return rowData;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Class_${selectedClass}_Diagnosis_Report.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header Banner */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest text-[#5f2ea8] bg-[#5f2ea8]/10 px-3 py-1 rounded-full w-fit">
          Diagnostic Reports
        </span>
        <h2 className="text-2xl font-black tracking-tight text-text-primary mt-1">
          {title}
        </h2>
        <p className="text-sm text-text-secondary">
          Analyze and download diagnostic report sheets class wise.
        </p>
      </div>

      {/* Class Selector Grid */}
      {!selectedClass ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
            Choose Class Level to Generate Report:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {availableClasses.map((classLvl) => {
              const { studentsCount, attemptsCount } = getClassStats(classLvl);
              return (
                <button
                  key={classLvl}
                  onClick={() => setSelectedClass(classLvl)}
                  className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl hover:border-[#5f2ea8] hover:shadow-lg hover:shadow-[#5f2ea8]/5 transition-all text-left flex items-start gap-4 cursor-pointer group"
                >
                  <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/30 p-4 text-[#5f2ea8] transition-all group-hover:scale-105">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-text-primary">
                      Class {classLvl}
                    </h4>
                    <p className="text-xs text-text-secondary font-semibold">
                      {studentsCount} {studentsCount === 1 ? "student" : "students"} assessed
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {attemptsCount} total attempts recorded
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Class Detailed Report Table View */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedClass(null);
                setSearchQuery("");
                setSelectedBranch("all");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-text-secondary hover:text-text-primary bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Classes</span>
            </button>

            {/* Actions / Search */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl md:justify-end">
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search students, phone, branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 text-xs text-text-primary focus:ring-1 focus:ring-[#5f2ea8] outline-none transition-all placeholder:text-text-tertiary"
                />
              </div>

              {/* Branch Filter */}
              <div className="relative shrink-0">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full sm:w-auto pl-4 pr-10 py-2.5 rounded-2xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-text-secondary focus:ring-1 focus:ring-[#5f2ea8] outline-none transition-all cursor-pointer appearance-none min-w-[150px] h-[38px] leading-tight"
                >
                  <option value="all">All Branches</option>
                  {uniqueBranches.map((br) => (
                    <option key={br} value={br}>
                      {br.replace("Smart Up ", "").replace("SmartUp ", "")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              </div>

              {/* Export Button */}
              <Button
                onClick={handleDownloadCSV}
                className="rounded-2xl font-bold bg-[#5f2ea8] hover:bg-[#4d238c] text-white flex items-center gap-1.5 shadow-sm px-4 py-2 h-[38px]"
              >
                <Download className="w-4 h-4" />
                <span>Download Report (CSV)</span>
              </Button>
            </div>
          </div>

          {/* Stats Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 flex flex-col sm:flex-row gap-6 text-xs font-semibold text-text-secondary">
            <div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Target Class</span>
              <span className="text-text-primary text-sm font-bold">Class {selectedClass}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Total Assessed Students</span>
              <span className="text-text-primary text-sm font-bold">{studentsList.length} students</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Active Subjects</span>
              <span className="text-text-primary text-sm font-bold">{classSubjects.length} subjects</span>
            </div>
          </div>

          {/* Student Report Table */}
          <div className="bg-white dark:bg-[#0E1526]/85 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-text-tertiary font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Student Info</th>
                    <th className="py-4 px-6">Branch</th>
                    {classSubjects.map((subName) => (
                      <th key={subName} className="py-4 px-6 text-center">
                        {subName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-semibold text-text-secondary">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={2 + classSubjects.length} className="py-12 text-center text-text-tertiary italic">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.key} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/20 transition-all">
                        {/* Student Info */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span className="font-black text-text-primary text-sm block">
                              {student.studentName}
                            </span>
                            {student.studentPhone && (
                              <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {student.studentPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-4 px-6 text-xs">
                          {student.studentBranch ? (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                              {student.studentBranch}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>

                        {/* Subject Diagnostics Columns */}
                        {classSubjects.map((subName) => {
                          const attempt = student.attemptsBySubject[subName];
                          if (!attempt) {
                            return (
                              <td key={subName} className="py-4 px-6 text-center text-red-500/60 dark:text-red-400/50 text-[10px] uppercase font-bold tracking-wide italic">
                                Not Attended
                              </td>
                            );
                          }

                          const { diagnosedLevel, diagnosedCorrect, diagnosedTotal } = getAttemptLevelBreakdown(attempt);
                          const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";

                          // Styling depending on diagnosed status
                          let badgeClass = "bg-slate-50 text-slate-500 border border-slate-200/50";
                          if (diagnosedLevel) {
                            const isAtTargetOrAbove = parseInt(diagnosedLevel, 10) >= parseInt(selectedClass, 10);
                            badgeClass = isAtTargetOrAbove
                              ? "bg-success-light text-success border border-success/15"
                              : "bg-warning-light text-warning border border-warning/15";
                          }

                          return (
                            <td key={subName} className="py-4 px-6 text-center">
                              <div className="flex flex-col items-center gap-1 justify-center">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-black ${badgeClass}`}
                                  title={isSubmitted ? "Final Diagnosed Level" : "In Progress Live Level"}
                                >
                                  {diagnosedLevel || "N/A"}{!isSubmitted && <span className="text-[9px] font-normal opacity-70"> (Live)</span>}
                                </span>
                                {diagnosedCorrect !== undefined && diagnosedTotal !== undefined && diagnosedCorrect !== null && diagnosedTotal !== null && (
                                  <span className="text-[10px] text-text-tertiary font-bold tracking-tight">
                                    {diagnosedCorrect}/{diagnosedTotal} marks
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
