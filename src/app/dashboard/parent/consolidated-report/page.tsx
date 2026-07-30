"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  ChevronDown, 
  GraduationCap, 
  Award, 
  Percent, 
  CheckCircle2, 
  XCircle,
  Printer,
  Calendar,
  School,
  User,
  Hash
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParentData, getLatestEnrollment } from "../page";

// Simple grade calculation based on overall percentage
function calculateOverallGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  return "D";
}

export default function ParentConsolidatedReportPage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>("");

  const children = data?.children ?? [];

  // 1. Set default child
  React.useEffect(() => {
    if (children.length > 0 && selectedChild === "all") {
      setSelectedChild(children[0].name);
    }
  }, [children, selectedChild]);

  // 2. Get all unique exam groups (assessment groups) for the selected child
  const allExamGroups = useMemo(() => {
    if (selectedChild === "all") return [];
    const results = data?.examResults?.[selectedChild] ?? [];
    const groups = new Set<string>();
    results.forEach((r) => {
      if (r.assessment_group) {
        groups.add(r.assessment_group);
      }
    });
    return Array.from(groups);
  }, [selectedChild, data]);

  // Set default exam group if not selected
  React.useEffect(() => {
    if (allExamGroups.length > 0 && !selectedExamGroup) {
      setSelectedExamGroup(allExamGroups[0]);
    }
  }, [allExamGroups, selectedExamGroup]);

  // Handle child select change
  const handleChildChange = (childId: string) => {
    setSelectedChild(childId);
    setSelectedExamGroup(""); // Reset to default for new child
  };

  // 3. Get child and enrollment info
  const activeChild = useMemo(() => {
    return children.find((c) => c.name === selectedChild);
  }, [children, selectedChild]);

  const activeEnrollment = useMemo(() => {
    if (!selectedChild) return null;
    return getLatestEnrollment(data, selectedChild);
  }, [selectedChild, data]);

  // 4. Calculate consolidated subjects and marks for active child & exam group
  const reportData = useMemo(() => {
    if (!selectedChild || !selectedExamGroup) return null;

    const results = data?.examResults?.[selectedChild] ?? [];
    const examResultsRaw = results.filter((r) => r.assessment_group === selectedExamGroup);

    if (examResultsRaw.length === 0) return null;

    // Group by course (subject) to find duplicates
    const courseMap = new Map<string, typeof examResultsRaw>();
    examResultsRaw.forEach((r) => {
      if (!courseMap.has(r.course)) {
        courseMap.set(r.course, []);
      }
      courseMap.get(r.course)!.push(r);
    });

    // Deduplicate: Keep final entered result for each course
    const examResults: typeof examResultsRaw = [];
    courseMap.forEach((list) => {
      // Sort to prefer non-zero score (marks entered) and latest schedule date
      list.sort((a, b) => {
        const aHasScore = a.total_score > 0 ? 1 : 0;
        const bHasScore = b.total_score > 0 ? 1 : 0;
        if (aHasScore !== bHasScore) {
          return bHasScore - aHasScore; // non-zero first
        }
        return b.schedule_date.localeCompare(a.schedule_date); // latest date first
      });
      examResults.push(list[0]);
    });

    let totalObtained = 0;
    let totalMax = 0;
    let passStatus = true;

    const subjects = examResults.map((r) => {
      const pct = r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0;
      const isPassed = pct >= 40;
      if (!isPassed) passStatus = false;

      totalObtained += r.total_score;
      totalMax += r.maximum_score;

      return {
        courseCode: r.course,
        courseName: r.course.replace(/^\d+\w*\s+/, ""),
        score: r.total_score,
        max: r.maximum_score,
        percentage: pct,
        grade: r.grade || "N/A",
        status: isPassed ? "Pass" : "Fail"
      };
    });

    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const overallGrade = totalMax > 0 ? calculateOverallGrade(overallPct) : "N/A";

    return {
      subjects,
      totalObtained,
      totalMax,
      overallPct,
      overallGrade,
      resultStatus: passStatus ? "Pass" : "Fail"
    };
  }, [selectedChild, selectedExamGroup, data]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="py-32 flex items-center justify-center">
        <GifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-5.5 w-5.5 text-primary" />
            Consolidated Report Card
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            View child's overall marks list, subject grades, and result status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs font-semibold bg-surface border border-border-input hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[8px] flex items-center gap-1.5 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>

          {/* Child Selector */}
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild}
                onChange={(e) => handleChildChange(e.target.value)}
                className="h-9 rounded-[8px] border border-border-input bg-surface px-3 pr-8 text-xs text-text-primary focus:outline-none appearance-none"
              >
                {children.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.student_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Exam Selector */}
          {allExamGroups.length > 0 && (
            <div className="relative">
              <select
                value={selectedExamGroup}
                onChange={(e) => setSelectedExamGroup(e.target.value)}
                className="h-9 rounded-[8px] border border-border-input bg-surface px-3 pr-8 text-xs text-text-primary focus:outline-none appearance-none font-medium"
              >
                {allExamGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Main Consolidated Report Card */}
      {!reportData || !activeChild ? (
        <Card className="p-12 text-center border-dashed">
          <h3 className="text-base font-semibold text-text-primary">No report data found</h3>
          <p className="text-sm text-text-secondary mt-1">
            No entered exam marks are available for the selected parameters.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Printable Report Header */}
          <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface relative">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none z-0">
              <img 
                src="/smartup-logo-v2.png" 
                alt="Watermark" 
                className="w-80 h-auto object-contain max-w-full"
              />
            </div>

            {/* Header / Watermark style */}
            <div className="bg-primary/5 dark:bg-primary/10 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <img 
                  src="/smartup-logo-v2.png" 
                  alt="Smart Up Logo" 
                  className="h-10 w-auto object-contain shrink-0"
                />
                <div>
                  <h1 className="text-[11px] font-black text-primary tracking-wider uppercase">
                    SmartUp Learning Ventures
                  </h1>
                  <h2 className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                    ACADEMIC PROGRESS REPORT
                  </h2>
                  <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">
                    Exam Session: {selectedExamGroup}
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-2.5 py-0.5">
                Official Transcript
              </Badge>
            </div>

            {/* Student Info Grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" /> Student Name
                </span>
                <p className="text-sm font-extrabold text-text-primary">{activeChild.student_name}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                  <Hash className="h-3 w-3 text-primary" /> Student ID
                </span>
                <p className="text-sm font-semibold text-text-primary font-mono">{activeChild.name}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                  <GraduationCap className="h-3 w-3 text-primary" /> Class / Program
                </span>
                <p className="text-sm font-semibold text-text-primary">
                  {activeEnrollment?.program || "N/A"}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                  <School className="h-3 w-3 text-primary" /> Branch & Batch
                </span>
                <p className="text-sm font-semibold text-text-primary">
                  {activeChild.custom_branch?.replace("Smart Up ", "")}
                  {activeEnrollment?.student_batch_name && ` · ${activeEnrollment.student_batch_name}`}
                </p>
              </div>
            </div>

            {/* Vertical Subject Report Table */}
            <div className="p-0">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                    <th className="px-6 py-3">Subject / Course</th>
                    <th className="px-6 py-3 text-center">Marks Obtained</th>
                    <th className="px-6 py-3 text-center">Maximum Marks</th>
                    <th className="px-6 py-3 text-center">Percentage</th>
                    <th className="px-6 py-3 text-center">Grade</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {reportData.subjects.map((sub, index) => (
                    <tr key={`${sub.courseCode}-${index}`} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-text-primary">
                        {sub.courseName}
                        <span className="block text-[9px] font-normal text-text-tertiary font-mono mt-0.5">
                          {sub.courseCode}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-extrabold text-text-primary text-sm">
                        {sub.score}
                      </td>
                      <td className="px-6 py-3.5 text-center font-semibold text-text-secondary">
                        {sub.max}
                      </td>
                      <td className="px-6 py-3.5 text-center font-semibold text-text-primary">
                        {sub.percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center font-bold text-primary px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-md">
                          {sub.grade}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === "Pass" 
                            ? "bg-success/10 text-success" 
                            : "bg-error/10 text-error"
                        }`}>
                          {sub.status === "Pass" ? (
                            <><CheckCircle2 className="h-2.5 w-2.5" /> PASS</>
                          ) : (
                            <><XCircle className="h-2.5 w-2.5" /> FAIL</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Calculation Summary Card Footer */}
            <div className="p-6 bg-slate-50/40 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[9px] font-bold text-text-tertiary uppercase">Total Marks</span>
                <p className="text-lg font-black text-text-primary mt-0.5">
                  {reportData.totalObtained} <span className="text-xs font-normal text-text-tertiary">/ {reportData.totalMax}</span>
                </p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[9px] font-bold text-text-tertiary uppercase">Overall Percentage</span>
                <p className="text-lg font-black text-text-primary mt-0.5 flex items-center justify-center sm:justify-start gap-0.5">
                  <Percent className="h-4.5 w-4.5 text-primary shrink-0" />
                  {reportData.overallPct.toFixed(1)}%
                </p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[9px] font-bold text-text-tertiary uppercase">Overall Grade</span>
                <p className="text-lg font-black text-text-primary mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                  <Award className="h-4.5 w-4.5 text-primary shrink-0" />
                  {reportData.overallGrade}
                </p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[9px] font-bold text-text-tertiary uppercase block">Result Status</span>
                <div className="mt-1 flex justify-center sm:justify-start">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                    reportData.resultStatus === "Pass"
                      ? "bg-success/5 text-success border-success/15"
                      : "bg-error/5 text-error border-error/15"
                  }`}>
                    {reportData.resultStatus === "Pass" ? (
                      <><CheckCircle2 className="h-3 w-3" /> PASSED</>
                    ) : (
                      <><XCircle className="h-3 w-3" /> FAILED</>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Signature Lines (Visible on Print) */}
            <div className="hidden print:flex justify-between items-center px-12 pt-16 pb-8 text-xs text-text-tertiary">
              <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                Class Tutor
              </div>
              <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                Academic Director
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
