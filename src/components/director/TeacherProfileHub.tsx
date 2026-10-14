"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Search,
  ChevronRight,
  UserCheck,
  Briefcase,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  Award,
  TrendingUp,
  AlertCircle,
  Filter,
  BarChart3,
  Phone,
  Mail,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllBranches, getBranchInstructors } from "@/lib/api/director";
import { GifLoader } from "@/components/ui/GifLoader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function TeacherProfileHub() {
  const [selectedBranch, setSelectedBranch] = useState<string>("Smart Up Edappally");
  const [branchSearch, setBranchSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"weekly" | "attendance" | "cwc" | "work">("weekly");

  // 1. Fetch Branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const activeBranches = branches.filter((b) => b.name !== "Smart Up");
  const filteredBranches = activeBranches.filter((b) =>
    b.name.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Set default branch when branches load if not set
  React.useEffect(() => {
    if (!selectedBranch && activeBranches.length > 0) {
      setSelectedBranch(activeBranches[0].name);
    }
  }, [activeBranches, selectedBranch]);

  // 2. Fetch Staff for Selected Branch
  const {
    data: staffList = [],
    isLoading: staffLoading,
  } = useQuery({
    queryKey: ["director-branch-instructors-list", selectedBranch],
    queryFn: () => getBranchInstructors(selectedBranch),
    enabled: !!selectedBranch,
    staleTime: 120_000,
  });

  const filteredStaff = staffList.filter((s) =>
    (s.instructor_name || s.name).toLowerCase().includes(staffSearch.toLowerCase()) ||
    (s.designation || "").toLowerCase().includes(staffSearch.toLowerCase())
  );

  // Auto-select first staff when list changes
  React.useEffect(() => {
    if (filteredStaff.length > 0) {
      // If current selectedStaffId is not in this branch list, select the first one
      const exists = filteredStaff.some((s) => s.name === selectedStaffId);
      if (!exists) {
        setSelectedStaffId(filteredStaff[0].name);
      }
    } else {
      setSelectedStaffId(null);
    }
  }, [filteredStaff, selectedBranch, selectedStaffId]);

  // 3. Fetch Selected Teacher's Full Profile Analytics
  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["teacher-profile-analytics", selectedStaffId],
    queryFn: async () => {
      if (!selectedStaffId) return null;
      const res = await fetch(
        `/api/director/teachers/${encodeURIComponent(selectedStaffId)}/profile-analytics`
      );
      if (!res.ok) {
        throw new Error("Failed to load teacher analytics");
      }
      return res.json();
    },
    enabled: !!selectedStaffId,
    staleTime: 60_000,
  });

  const selectedTeacher = profileData?.instructor;
  const summary = profileData?.summary;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] gap-4 bg-app-bg">
      {/* ────────────────────────────────────────────────────────── */}
      {/* LEFT PANE: DRILL DOWN (BRANCHES & BRANCH STAFF)           */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 bg-surface border border-border-light rounded-2xl p-3 shadow-sm">
        {/* Branch Selector Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Branches
            </span>
            <span className="text-[11px] font-mono text-text-tertiary">
              {activeBranches.length} locations
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Filter branch..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-app-bg focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Branch Pill List */}
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {branchesLoading ? (
              <div className="space-y-1.5 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 bg-app-bg rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredBranches.map((b) => {
              const isSelected = selectedBranch === b.name;
              const short = b.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
              return (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelectedBranch(b.name);
                    setStaffSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-sm font-semibold"
                      : "text-text-secondary hover:bg-brand-wash hover:text-text-primary"
                  }`}
                >
                  <span className="truncate">{short}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-app-bg text-text-tertiary"
                    }`}
                  >
                    {b.abbr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border-light" />

        {/* Branch Staff List Header */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Staff / Instructors
            </span>
            <span className="text-[11px] font-mono text-text-tertiary">
              {filteredStaff.length} found
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search teacher..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-app-bg focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Staff Item List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[220px]">
            {staffLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-app-bg rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-tertiary">
                No instructors in this branch
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaffId === staff.name;
                const displayName = staff.instructor_name || staff.name;
                return (
                  <button
                    key={staff.name}
                    onClick={() => setSelectedStaffId(staff.name)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? "border-primary bg-brand-wash shadow-sm"
                        : "border-border-light hover:border-primary/40 bg-surface hover:bg-app-bg"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-primary" : "text-text-primary"
                        }`}
                      >
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-text-tertiary truncate">
                          {staff.designation || "Instructor"}
                        </span>
                        {staff.subjects && staff.subjects.length > 0 && (
                          <span className="text-[10px] text-primary/70 font-mono truncate">
                            · {staff.subjects[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isSelected ? "text-primary translate-x-0.5" : "text-text-tertiary opacity-40"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* RIGHT MAIN PANE: TEACHER PROFILE & MULTI-TAB ANALYTICS     */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedStaffId ? (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-surface border border-border-light rounded-2xl p-8 text-center">
            <UserCheck className="w-12 h-12 text-text-tertiary mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-text-primary">Select a Teacher</h3>
            <p className="text-xs text-text-tertiary max-w-sm mt-1">
              Choose a branch on the left and select any teacher to view their Weekly Exam data,
              attendance log, CWC performance, and work assignments.
            </p>
          </div>
        ) : profileLoading ? (
          <div className="h-full min-h-[400px] flex items-center justify-center bg-surface border border-border-light rounded-2xl p-12">
            <GifLoader />
          </div>
        ) : profileError || !selectedTeacher ? (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-surface border border-border-light rounded-2xl p-8 text-center text-error">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p className="font-medium text-sm">Failed to load teacher analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-surface border border-border-light rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {selectedTeacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-text-primary">
                        {selectedTeacher.name}
                      </h2>
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-brand-wash">
                        {selectedTeacher.designation || "Instructor"}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] text-text-secondary">
                        {selectedTeacher.branch ? selectedTeacher.branch.replace("Smart Up ", "") : "Branch Staff"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-tertiary mt-1.5 flex-wrap">
                      {selectedTeacher.employee_id && (
                        <span className="flex items-center gap-1 font-mono">
                          <Briefcase className="w-3.5 h-3.5" /> {selectedTeacher.employee_id}
                        </span>
                      )}
                      {selectedTeacher.department && (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> {selectedTeacher.department}
                        </span>
                      )}
                      {selectedTeacher.cell_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {selectedTeacher.cell_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assigned Courses Badges */}
                <div className="flex flex-wrap items-center gap-1.5 max-w-md md:justify-end">
                  {selectedTeacher.assigned_courses?.map((c: string) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand-wash text-primary border border-primary/10 flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 opacity-70" /> {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* KPI Stat Ribbons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border-light">
                <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                  <div className="flex items-center justify-between text-text-tertiary text-[11px] mb-1">
                    <span>Weekly Exam Pass Rate</span>
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                  </div>
                  <p className="text-xl font-extrabold text-text-primary">
                    {summary?.weekly_avg_pass_rate ?? 0}%
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {summary?.weekly_exams_count ?? 0} weekly exams conducted
                  </p>
                </div>

                <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                  <div className="flex items-center justify-between text-text-tertiary text-[11px] mb-1">
                    <span>Teacher Attendance</span>
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xl font-extrabold text-text-primary">
                    {summary?.attendance?.attendance_rate ?? 0}%
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {summary?.attendance?.present_days ?? 0} of {summary?.attendance?.total_days ?? 0} logged days
                  </p>
                </div>

                <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                  <div className="flex items-center justify-between text-text-tertiary text-[11px] mb-1">
                    <span>CWC Pass Rate</span>
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-xl font-extrabold text-text-primary">
                    {summary?.cwc_avg_pass_rate ?? 0}%
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {summary?.cwc_exams_count ?? 0} CWC tests evaluated
                  </p>
                </div>

                <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                  <div className="flex items-center justify-between text-text-tertiary text-[11px] mb-1">
                    <span>Work Assignments</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-info" />
                  </div>
                  <p className="text-xl font-extrabold text-text-primary">
                    {summary?.work_assignments?.completion_rate ?? 100}%
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {summary?.work_assignments?.completed ?? 0} submitted · {summary?.work_assignments?.pending ?? 0} pending
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border-light pb-2">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "weekly"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Weekly Exams ({profileData?.weekly_exams?.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "attendance"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Attendance Log ({profileData?.teacher_attendance?.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("cwc")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "cwc"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                CWC Exam Performance ({profileData?.cwc_exams?.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("work")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "work"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Work Assignments ({profileData?.work_assignments?.length ?? 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[300px]">
              {/* TAB 1: WEEKLY EXAM DATA */}
              {activeTab === "weekly" && (
                <div className="space-y-3">
                  {profileData?.weekly_exams?.length === 0 ? (
                    <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No Weekly Exams scheduled for this instructor</p>
                      <p className="text-xs mt-1">Exams categorized under &apos;Weekly Exam&apos; will display week-wise metrics here.</p>
                    </div>
                  ) : (
                    <div className="bg-surface border border-border-light rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-app-bg border-b border-border-light text-text-tertiary uppercase font-semibold text-[10px]">
                            <tr>
                              <th className="p-3">Exam Date & Title</th>
                              <th className="p-3">Course / Batch</th>
                              <th className="p-3 text-center">Attended Students</th>
                              <th className="p-3 text-center">Absent Students</th>
                              <th className="p-3 text-center">Pass Rate</th>
                              <th className="p-3 text-center">Average Score</th>
                              <th className="p-3 text-right">Top Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-light">
                            {profileData?.weekly_exams?.map((exam: any) => {
                              const passRateColor =
                                exam.pass_rate >= 75
                                  ? "text-success bg-success/10"
                                  : exam.pass_rate >= 50
                                  ? "text-warning bg-warning/10"
                                  : "text-error bg-error/10";
                              return (
                                <tr key={exam.id} className="hover:bg-app-bg transition-colors">
                                  <td className="p-3">
                                    <p className="font-semibold text-text-primary">{exam.name}</p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary mt-0.5 font-mono">
                                      <Calendar className="w-3 h-3" />
                                      {exam.schedule_date || "No date"}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="font-medium text-text-primary">{exam.course}</span>
                                    <p className="text-[11px] text-text-tertiary truncate">
                                      {exam.student_group}
                                    </p>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                                      {exam.attended_count}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs ${
                                        exam.absent_count > 0 ? "bg-error/10 text-error" : "text-text-tertiary"
                                      }`}
                                    >
                                      {exam.absent_count}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs ${passRateColor}`}
                                    >
                                      {exam.pass_rate}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-text-primary">
                                    {exam.avg_score_pct}%
                                  </td>
                                  <td className="p-3 text-right">
                                    <p className="font-bold text-text-primary">
                                      {exam.top_score} / {exam.maximum_score}
                                    </p>
                                    {exam.topper_name && (
                                      <p className="text-[10px] text-text-tertiary truncate max-w-[120px] ml-auto">
                                        {exam.topper_name}
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TEACHER ATTENDANCE */}
              {activeTab === "attendance" && (
                <div className="space-y-3">
                  {profileData?.teacher_attendance?.length === 0 ? (
                    <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No attendance logs found for this employee</p>
                    </div>
                  ) : (
                    <div className="bg-surface border border-border-light rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-app-bg border-b border-border-light text-text-tertiary uppercase font-semibold text-[10px]">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Punch In</th>
                              <th className="p-3 text-center">Punch Out</th>
                              <th className="p-3 text-center">Working Hours</th>
                              <th className="p-3 text-right">Remarks / ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-light">
                            {profileData?.teacher_attendance?.slice(0, 45).map((att: any) => {
                              const isPresent = att.status === "Present" || att.status === "Work From Home";
                              const isAbsent = att.status === "Absent";
                              return (
                                <tr key={att.name} className="hover:bg-app-bg transition-colors">
                                  <td className="p-3 font-mono font-medium text-text-primary">
                                    {att.attendance_date}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        isPresent
                                          ? "bg-success/10 text-success"
                                          : isAbsent
                                          ? "bg-error/10 text-error"
                                          : "bg-warning/10 text-warning"
                                      }`}
                                    >
                                      {att.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono text-text-secondary">
                                    {att.in_time ? att.in_time.slice(11, 16) : "—"}
                                  </td>
                                  <td className="p-3 text-center font-mono text-text-secondary">
                                    {att.out_time ? att.out_time.slice(11, 16) : "—"}
                                  </td>
                                  <td className="p-3 text-center font-mono text-text-primary">
                                    {att.working_hours ? `${Number(att.working_hours).toFixed(1)} hrs` : "—"}
                                  </td>
                                  <td className="p-3 text-right text-text-tertiary font-mono text-[11px]">
                                    {att.name}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CWC EXAM PERFORMANCE */}
              {activeTab === "cwc" && (
                <div className="space-y-3">
                  {profileData?.cwc_exams?.length === 0 ? (
                    <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                      <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No CWC Exam records available for this instructor</p>
                      <p className="text-xs mt-1">
                        CWC examinations mapped to this teacher&apos;s courses or batches will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profileData?.cwc_exams?.map((cwc: any) => (
                        <Card key={cwc.id} className="border-border-light hover:border-primary/20 transition-all shadow-sm">
                          <CardHeader className="pb-2.5">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs font-bold bg-amber-500/10 text-amber-600 border-amber-200">
                                {cwc.group || "CWC Exam"}
                              </Badge>
                              <span className="text-[11px] font-mono text-text-tertiary">
                                {cwc.schedule_date}
                              </span>
                            </div>
                            <CardTitle className="text-sm font-bold text-text-primary mt-2">
                              {cwc.name}
                            </CardTitle>
                            <p className="text-xs text-text-tertiary">
                              {cwc.course} · {cwc.student_group}
                            </p>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-app-bg border border-border-light/60 text-center">
                              <div>
                                <span className="text-[10px] text-text-tertiary">Attended</span>
                                <p className="text-sm font-bold text-text-primary mt-0.5">{cwc.attended_count}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-tertiary">Pass Rate</span>
                                <p className="text-sm font-bold text-success mt-0.5">{cwc.pass_rate}%</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-tertiary">Avg Score</span>
                                <p className="text-sm font-bold text-text-primary mt-0.5">{cwc.avg_score_pct}%</p>
                              </div>
                            </div>
                            {cwc.topper_name && (
                              <div className="mt-2.5 flex items-center justify-between text-xs text-text-secondary px-1">
                                <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                                  <Award className="w-3 h-3 text-amber-500" /> Class Topper:
                                </span>
                                <span className="font-semibold text-text-primary truncate max-w-[150px]">
                                  {cwc.topper_name} ({cwc.top_score}/{cwc.maximum_score})
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WORK ASSIGNMENTS */}
              {activeTab === "work" && (
                <div className="space-y-3">
                  {profileData?.work_assignments?.length === 0 ? (
                    <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No Work Assignments assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {profileData?.work_assignments?.map((wa: any) => {
                        const isDone = wa.submission_status === "Submitted" || wa.approval_status === "Approved";
                        return (
                          <div
                            key={wa.name}
                            className="bg-surface border border-border-light hover:border-primary/30 rounded-xl p-3.5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-text-primary truncate">
                                  {wa.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    isDone
                                      ? "bg-success/10 text-success border-success/20"
                                      : "bg-warning/10 text-warning border-warning/20"
                                  }`}
                                >
                                  {wa.submission_status}
                                </Badge>
                                {wa.approval_status !== "Pending" && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${
                                      wa.approval_status === "Approved"
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : "bg-error/10 text-error border-error/20"
                                    }`}
                                  >
                                    {wa.approval_status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary truncate">{wa.description || wa.topic || "Assigned task"}</p>
                              <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                                <span className="font-mono">ID: {wa.name}</span>
                                <span>Deadline: {wa.deadline || "No deadline"}</span>
                              </div>
                            </div>

                            {/* Drive link / view button */}
                            <div className="flex items-center gap-2 shrink-0">
                              {wa.google_drive_link && (
                                <a
                                  href={wa.google_drive_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-brand-wash text-primary hover:bg-primary hover:text-white transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Drive Link
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
