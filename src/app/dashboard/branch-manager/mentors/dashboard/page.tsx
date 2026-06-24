"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  AlertCircle,
  Clock,
  Building2,
  UserCheck,
  ArrowLeft,
  Search,
  Mail,
  User,
  ClipboardList,
  ChevronRight,
  PhoneCall,
  Calendar,
  Sparkles,
  Plus,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBranchMentors, getMentorAssignments, createMentorProfile } from "@/lib/api/mentors";
import { getStudents } from "@/lib/api/students";
import { getEmployees } from "@/lib/api/employees";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import type { MentorProfile, MentorStudentAssignment, MentorFeedback } from "@/lib/types/mentor";
import apiClient from "@/lib/api/client";

// Fetch program enrollment map for a list of student IDs
async function fetchEnrollmentMap(studentIds: string[]): Promise<Record<string, { program: string }>> {
  if (!studentIds.length) return {};
  const { data } = await apiClient.get("/resource/Program Enrollment", {
    params: {
      filters: JSON.stringify([
        ["student", "in", studentIds],
        ["docstatus", "=", 1],
      ]),
      fields: JSON.stringify(["student", "program"]),
      order_by: "enrollment_date desc",
      limit_page_length: studentIds.length * 3,
    },
  });
  const map: Record<string, { program: string }> = {};
  for (const row of (data.data ?? [])) {
    if (!map[row.student]) {
      map[row.student] = { program: row.program };
    }
  }
  return map;
}

export default function BranchManagerMentorsDashboardPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailTab, setDetailTab] = useState<"students" | "feedback">("students");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  // Mentor Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMentorName, setNewMentorName] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");

  // 1. Fetch Mentors List
  const mentorsQuery = useQuery({
    queryKey: ["branch-mentors", defaultCompany],
    queryFn: () => getBranchMentors(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  // 2. Fetch Assignments
  const assignmentsQuery = useQuery({
    queryKey: ["branch-mentor-assignments", defaultCompany],
    queryFn: () => getMentorAssignments(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  // 3. Fetch Students list (to resolve names)
  const studentsQuery = useQuery({
    queryKey: ["mentor-assignable-students", defaultCompany],
    queryFn: () => getStudents({ custom_branch: defaultCompany || undefined, enabled: 1, limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  // 4. Fetch Feedback logs for branch
  const feedbackQuery = useQuery<MentorFeedback[]>({
    queryKey: ["branch-mentor-feedback", defaultCompany],
    queryFn: async () => {
      const res = await fetch(`/api/branch-manager/mentor-feedback?branch=${encodeURIComponent(defaultCompany || "")}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch mentor feedback");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  // 5. Fetch Active Employees for Creation dropdown
  const employeesQuery = useQuery({
    queryKey: ["mentor-employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active", limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  // Mutation to create new profile
  const createMentorMutation = useMutation({
    mutationFn: async () => {
      const employee = (employeesQuery.data?.data ?? []).find((row) => row.name === newEmployeeId);
      if (!employee?.user_id) throw new Error("Selected employee has no linked user account");
      return createMentorProfile({
        mentor_name: newMentorName || employee.employee_name,
        employee: employee.name,
        user_id: employee.user_id,
        branch: defaultCompany || undefined,
      });
    },
    onSuccess: () => {
      setNewMentorName("");
      setNewEmployeeId("");
      setIsCreateModalOpen(false);
      createMentorMutation.reset();
      queryClient.invalidateQueries({ queryKey: ["branch-mentors", defaultCompany] });
    },
  });

  const mentors = mentorsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const feedbacks = feedbackQuery.data ?? [];

  const assignmentStudentIds = useMemo(() => {
    return Array.from(new Set(assignments.map((a) => a.student)));
  }, [assignments]);

  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["assignments-enrollment-map", assignmentStudentIds],
    queryFn: () => fetchEnrollmentMap(assignmentStudentIds),
    enabled: assignmentStudentIds.length > 0,
    staleTime: 60_000,
  });

  const existingMentorEmployeeIds = useMemo(() => {
    return new Set(mentors.map((m) => m.employee));
  }, [mentors]);

  const eligibleEmployees = useMemo(() => {
    return (employeesQuery.data?.data ?? []).filter(
      (row) => row.user_id && !existingMentorEmployeeIds.has(row.name)
    );
  }, [employeesQuery.data, existingMentorEmployeeIds]);

  // Create Student name mapping lookup
  const studentMap = useMemo(() => {
    const map = new Map<string, { name: string; student_type?: string }>();
    students.forEach((s) => {
      map.set(s.name, {
        name: s.student_name,
        student_type: s.custom_student_type || "Fresher",
      });
    });
    return map;
  }, [students]);

  // Derive Feedback Count per Mentor mapping
  const mentorFeedbackMetrics = useMemo(() => {
    const map = new Map<string, { total: number; actionNeeded: number }>();
    feedbacks.forEach((f) => {
      const m = f.mentor_user;
      if (!map.has(m)) {
        map.set(m, { total: 0, actionNeeded: 0 });
      }
      const current = map.get(m)!;
      current.total++;
      if (f.action_required) {
        current.actionNeeded++;
      }
    });
    return map;
  }, [feedbacks]);

  // Filtered Mentors List
  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter(
      (m) =>
        m.mentor_name.toLowerCase().includes(q) ||
        m.employee.toLowerCase().includes(q) ||
        m.user_id.toLowerCase().includes(q)
    );
  }, [mentors, searchQuery]);

  // Selected Mentor details
  const selectedMentor = useMemo(() => {
    if (!selectedMentorId) return null;
    return mentors.find((m) => m.name === selectedMentorId) || null;
  }, [mentors, selectedMentorId]);

  // Assigned students of selected mentor
  const selectedMentorStudents = useMemo(() => {
    if (!selectedMentor) return [];
    return assignments.filter(
      (a) => a.mentor_profile === selectedMentor.name && a.status === "Active"
    );
  }, [assignments, selectedMentor]);

  // Feedbacks of selected mentor
  const selectedMentorFeedbacks = useMemo(() => {
    if (!selectedMentor) return [];
    const raw = feedbacks.filter((f) => f.mentor_profile === selectedMentor.name);
    const q = feedbackSearch.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (f) =>
        f.student_name.toLowerCase().includes(q) ||
        f.student.toLowerCase().includes(q) ||
        f.overall_feedback?.toLowerCase().includes(q) ||
        f.discussion_category.toLowerCase().includes(q) ||
        f.academic_notes?.toLowerCase().includes(q) ||
        f.fee_notes?.toLowerCase().includes(q)
    );
  }, [feedbacks, selectedMentor, feedbackSearch]);

  const activeMentorsCount = mentors.filter((m) => m.status === "Active").length;
  const assignedStudentsCount = assignments.filter((a) => a.status === "Active").length;
  const totalActionNeeded = feedbacks.filter((f) => f.action_required).length;

  const avgLoad = useMemo(() => {
    if (activeMentorsCount === 0) return 0;
    return parseFloat((assignedStudentsCount / activeMentorsCount).toFixed(1));
  }, [assignedStudentsCount, activeMentorsCount]);

  const isLoading =
    mentorsQuery.isLoading ||
    assignmentsQuery.isLoading ||
    studentsQuery.isLoading ||
    feedbackQuery.isLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Main Layout Switcher */}
      <AnimatePresence mode="wait">
        {!selectedMentor ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header */}
            <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(130,195,91,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(103,58,183,0.18),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(236,246,250,0.95)_48%,rgba(229,245,238,0.96))] shadow-[0_30px_60px_-28px_rgba(13,61,89,0.34)]">
              <CardContent className="relative p-0">
                <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-[#7E57C2]/20 blur-2xl" />
                <div className="absolute right-6 top-0 h-36 w-36 rounded-full bg-[#673AB7]/14 blur-3xl" />

                <div className="relative grid gap-6 p-6 lg:grid-cols-[1.45fr_0.95fr] lg:p-8">
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#673AB7,#7E57C2)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_32px_-16px_rgba(103,58,183,0.88)]">
                        <Users className="h-9 w-9" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mentors Dashboard</h1>
                          {defaultCompany ? (
                            <Badge variant="outline" className="bg-white/75 text-[11px] shadow-sm backdrop-blur">
                              {defaultCompany}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                          A modern branch workspace for mentor visibility, student coverage, follow-up load, and intervention tracking.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricHeroCard label="Active Mentors" value={activeMentorsCount} icon={<Users className="h-4 w-4" />} isLoading={isLoading} />
                      <MetricHeroCard label="Assigned Students" value={assignedStudentsCount} icon={<GraduationCap className="h-4 w-4" />} tone="cyan" isLoading={isLoading} />
                      <MetricHeroCard label="Average Load" value={avgLoad} icon={<Building2 className="h-4 w-4" />} tone="lime" isLoading={isLoading} />
                      <MetricHeroCard label="Action Required" value={totalActionNeeded} icon={<Clock className="h-4 w-4" />} tone="amber" isLoading={isLoading} />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/70 bg-white/74 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_20px_40px_-26px_rgba(13,61,89,0.35)] backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Quick Actions
                    </div>
                    <div className="mt-4 space-y-3">
                      <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full justify-between rounded-2xl bg-[linear-gradient(135deg,#7E57C2,#673AB7)] py-6 text-white shadow-[0_18px_28px_-18px_rgba(103,58,183,0.85)] hover:opacity-95"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" /> Register Mentor
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => window.history.back()}
                        className="w-full justify-between rounded-2xl bg-white/80 py-6"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4" /> Back to Portal
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,252,255,0.92),rgba(242,247,250,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Branch Snapshot</p>
                        <div className="mt-3 space-y-3 text-sm">
                          <QuickStat label="Mentor coverage" value={isLoading ? "..." : `${assignedStudentsCount} students`} />
                          <QuickStat label="Average load" value={isLoading ? "..." : `${avgLoad} per mentor`} />
                          <QuickStat label="Open action items" value={isLoading ? "..." : `${totalActionNeeded}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filter control */}
            <Card className="border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,248,250,0.95))] shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="w-full max-w-sm">
                  <Input
                    placeholder="Search mentor by name, employee code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mentors list table */}
            <Card className="overflow-hidden border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,250,0.95))] shadow-[0_28px_50px_-32px_rgba(15,23,42,0.38)]">
              <CardHeader className="border-b border-border-light pb-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,248,247,0.9))]">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Branch Mentors list
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-slate-50/80">
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Mentor</th>
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Employee ID</th>
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Load Capacity</th>
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Total logs</th>
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Pending Action</th>
                      <th className="text-left px-5 py-3 font-semibold text-text-secondary">Status</th>
                      <th className="text-right px-5 py-3 font-semibold text-text-secondary">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">
                          Loading branch mentors data...
                        </td>
                      </tr>
                    ) : filteredMentors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">
                          No mentors matching search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMentors.map((m) => {
                        const feedbackMetrics = mentorFeedbackMetrics.get(m.user_id) || { total: 0, actionNeeded: 0 };
                        const loadPercentage = m.max_student_limit > 0
                          ? Math.min(((m.current_student_count ?? 0) / m.max_student_limit) * 100, 100)
                          : 0;
                        const isOverloaded = (m.current_student_count ?? 0) > m.max_student_limit;

                        return (
                          <tr
                            key={m.name}
                            className="border-b border-border-light last:border-0 hover:bg-[linear-gradient(90deg,rgba(130,195,91,0.05),rgba(103,58,183,0.04))] transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#673AB7,#7E57C2)] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_24px_-18px_rgba(103,58,183,0.8)]">
                                  {m.mentor_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-semibold text-text-primary text-sm block">
                                    {m.mentor_name}
                                  </span>
                                  <span className="text-xs text-text-tertiary font-mono">{m.user_id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono text-text-secondary text-xs">{m.employee}</td>
                            <td className="px-5 py-4 min-w-[150px]">
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-text-secondary">
                                  <span className={isOverloaded ? "text-error font-bold" : "font-medium"}>
                                    {m.current_student_count ?? 0} / {m.max_student_limit} students
                                  </span>
                                  <span>{Math.round(loadPercentage)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    style={{ width: `${loadPercentage}%` }}
                                    className={`h-full rounded-full ${
                                      isOverloaded
                                        ? "bg-error"
                                        : loadPercentage > 85
                                        ? "bg-warning"
                                        : "bg-gradient-to-r from-[#7E57C2] to-[#673AB7]"
                                    }`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-text-secondary font-medium">
                              {feedbackMetrics.total} logs
                            </td>
                            <td className="px-5 py-4">
                              {feedbackMetrics.actionNeeded > 0 ? (
                                <Badge variant="warning" className="font-semibold shadow-sm">
                                  {feedbackMetrics.actionNeeded} Action Required
                                </Badge>
                              ) : (
                                <span className="text-xs text-text-tertiary">None</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <Badge variant={m.status === "Active" ? "success" : "default"} className="shadow-sm">
                                {m.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedMentorId(m.name)}
                                className="group rounded-2xl bg-white/80 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.45)] hover:border-primary"
                              >
                                <span>Details & logs</span>
                                <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5 text-text-tertiary group-hover:text-primary" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Detail View Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => {
                  setSelectedMentorId(null);
                  setDetailTab("students");
                  setFeedbackSearch("");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Mentors List
              </button>
              <Badge variant="outline" className="self-start px-2 py-0.5 text-xs text-text-tertiary bg-surface">
                Mentor workspace
              </Badge>
            </div>

            {/* Mentor Details Summary Card */}
            <Card className="relative overflow-hidden bg-gradient-to-r from-[#673AB7]/5 via-transparent to-[#7E57C2]/5">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Left info column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7E57C2] to-[#673AB7] flex items-center justify-center shadow-md">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-text-primary">{selectedMentor.mentor_name}</h2>
                        <div className="flex items-center gap-2 text-xs text-text-secondary mt-1 flex-wrap font-medium">
                          <span className="font-mono">{selectedMentor.employee}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedMentor.user_id}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {selectedMentor.branch.replace("Smart Up ", "")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedMentor.remarks && (
                      <div className="text-sm text-text-secondary leading-relaxed bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-border-light max-w-xl">
                        <span className="font-semibold text-text-primary block text-xs uppercase tracking-wider mb-1">Remarks</span>
                        {selectedMentor.remarks}
                      </div>
                    )}
                  </div>

                  {/* Right metrics column */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="bg-surface border border-border-light rounded-xl p-4 text-center min-w-[120px] shadow-sm">
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider block">Assigned</span>
                      <span className="text-2xl font-bold text-info mt-1 block">
                        {selectedMentorStudents.length}
                      </span>
                    </div>

                    <div className="bg-surface border border-border-light rounded-xl p-4 text-center min-w-[120px] shadow-sm">
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider block">Total Logs</span>
                      <span className="text-2xl font-bold text-primary mt-1 block">
                        {mentorFeedbackMetrics.get(selectedMentor.user_id)?.total || 0}
                      </span>
                    </div>

                    <div className="bg-surface border border-border-light rounded-xl p-4 text-center min-w-[120px] shadow-sm">
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider block">Action needed</span>
                      <span className={`text-2xl font-bold mt-1 block ${
                        (mentorFeedbackMetrics.get(selectedMentor.user_id)?.actionNeeded || 0) > 0 ? "text-warning" : "text-text-primary"
                      }`}>
                        {mentorFeedbackMetrics.get(selectedMentor.user_id)?.actionNeeded || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detail workspaces tabs */}
            <div className="space-y-4">
              {/* Tab selector */}
              <div className="flex gap-2 p-1 bg-app-bg border border-border-light rounded-xl max-w-fit">
                <button
                  onClick={() => setDetailTab("students")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    detailTab === "students"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-primary hover:bg-surface-hover"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Assigned Students ({selectedMentorStudents.length})</span>
                </button>
                <button
                  onClick={() => setDetailTab("feedback")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    detailTab === "feedback"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-primary hover:bg-surface-hover"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Call Logs & Feedback ({selectedMentorFeedbacks.length})</span>
                </button>
              </div>

              {/* Tab content panels */}
              <AnimatePresence mode="wait">
                {detailTab === "students" ? (
                  <motion.div
                    key="students-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card>
                      <CardHeader className="border-b border-border-light pb-4">
                        <CardTitle className="text-base font-semibold">Active student roster</CardTitle>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-light bg-surface/50">
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Student ID</th>
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Student Name</th>
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Program / Class</th>
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Student Type</th>
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Assigned On</th>
                              <th className="text-left px-5 py-3 font-semibold text-text-secondary">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMentorStudents.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-text-secondary">
                                  No active student allocations assigned to this mentor.
                                </td>
                              </tr>
                            ) : (
                              selectedMentorStudents.map((assignment) => {
                                const details = studentMap.get(assignment.student);
                                const studentProgram = enrollmentMap[assignment.student]?.program || "N/A";
                                return (
                                  <tr key={assignment.name} className="border-b border-border-light last:border-0 hover:bg-surface/50 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-text-secondary text-xs">{assignment.student}</td>
                                    <td className="px-5 py-3.5 font-semibold text-text-primary">
                                      <Link
                                        href={`/dashboard/branch-manager/mentors/students/${encodeURIComponent(assignment.student)}`}
                                        className="hover:text-primary hover:underline"
                                      >
                                        {details?.name || assignment.student}
                                      </Link>
                                    </td>
                                    <td className="px-5 py-3.5 text-text-secondary">{studentProgram}</td>
                                    <td className="px-5 py-3.5">
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-surface font-medium border-border-light">
                                        {details?.student_type || "Fresher"}
                                      </Badge>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-text-tertiary">
                                      {assignment.assigned_on?.split(" ")[0] || assignment.creation?.split("T")[0]}
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-text-secondary leading-relaxed max-w-xs truncate" title={assignment.notes}>
                                      {assignment.notes || <span className="text-text-tertiary italic">None</span>}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="feedback-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Feedback search filter */}
                    <Card>
                      <CardContent className="p-4">
                        <Input
                          placeholder="Search logs by student, feedback, notes, or category..."
                          value={feedbackSearch}
                          onChange={(e) => setFeedbackSearch(e.target.value)}
                          leftIcon={<Search className="h-4 w-4" />}
                        />
                      </CardContent>
                    </Card>

                    {/* Timeline of logs */}
                    <div className="space-y-4">
                      {selectedMentorFeedbacks.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center text-text-secondary">
                            No matching feedback logs found for this mentor.
                          </CardContent>
                        </Card>
                      ) : (
                        selectedMentorFeedbacks.map((row) => (
                          <FeedbackLogCard key={row.name} row={row} />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mentor Registration Modal Overlay */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!createMentorMutation.isPending) {
                  setIsCreateModalOpen(false);
                  setNewEmployeeId("");
                  setNewMentorName("");
                  createMentorMutation.reset();
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-white/40 dark:border-white/[0.06] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 shadow-2xl z-10 flex flex-col justify-between"
              style={{
                boxShadow: "0 25px 50px -12px rgba(26, 158, 143, 0.15), 0 0 15px -3px var(--color-primary)",
              }}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-text-primary tracking-tight">Register Mentor Profile</h3>
                  <p className="text-xs text-text-secondary mt-1">Assign an existing active branch employee as a mentor.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Employee</label>
                    {employeesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading employees...</span>
                      </div>
                    ) : eligibleEmployees.length === 0 ? (
                      <div className="rounded-xl bg-warning/10 border border-warning/20 p-3.5 text-xs text-warning leading-relaxed font-medium">
                        No active employees with user accounts are available to be registered. Please ensure employees have linked user accounts and are not already mentors.
                      </div>
                    ) : (
                      <select
                        className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#673AB7] focus:border-[#673AB7] transition-all"
                        value={newEmployeeId}
                        onChange={(e) => setNewEmployeeId(e.target.value)}
                        disabled={createMentorMutation.isPending}
                      >
                        <option value="">Choose an employee...</option>
                        {eligibleEmployees.map((row) => (
                          <option key={row.name} value={row.name}>
                            {row.employee_name} ({row.name})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Input
                      label="Custom Display Name"
                      placeholder="Optional display name (defaults to employee name)"
                      value={newMentorName}
                      onChange={(e) => setNewMentorName(e.target.value)}
                      disabled={createMentorMutation.isPending}
                      className="rounded-[10px] focus:ring-2 focus:ring-[#673AB7] focus:border-[#673AB7]"
                    />
                  </div>

                  {createMentorMutation.isError && (
                    <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error font-medium">
                      {(createMentorMutation.error as Error)?.message || "Failed to create mentor profile"}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border-light/60 dark:border-border-light/10">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setNewEmployeeId("");
                      setNewMentorName("");
                      createMentorMutation.reset();
                    }}
                    disabled={createMentorMutation.isPending}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMentorMutation.mutate()}
                    disabled={createMentorMutation.isPending || !newEmployeeId}
                    className="bg-gradient-to-r from-[#7E57C2] to-[#673AB7] text-white hover:opacity-95 rounded-xl min-w-[100px]"
                  >
                    {createMentorMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackLogCard({ row }: { row: MentorFeedback }) {
  const getStudentTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "fresher": return "bg-purple-500/10 text-purple-600 border-purple-200/50";
      case "existing": return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
      case "rejoining": return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
      case "demo": return "bg-blue-500/10 text-blue-600 border-blue-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  const getPlanColor = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "advanced": return "bg-indigo-500/10 text-indigo-600 border-indigo-200/50";
      case "intermediate": return "bg-sky-500/10 text-sky-600 border-sky-200/50";
      case "basic": return "bg-teal-500/10 text-teal-600 border-teal-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  return (
    <Card className="hover:shadow-xs transition-shadow border-border-light/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-text-primary text-sm">{row.student_name}</p>
              {row.student_type && (
                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium border ${getStudentTypeColor(row.student_type)}`}>
                  {row.student_type}
                </Badge>
              )}
              {row.custom_plan && (
                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium border ${getPlanColor(row.custom_plan)}`}>
                  {row.custom_plan}
                </Badge>
              )}
              {row.program && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-text-secondary bg-surface/50 border border-border-light">
                  {row.program}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-text-tertiary bg-surface/50 border border-border-light">{row.discussion_category}</Badge>
              {row.action_required ? <Badge variant="warning" className="text-[10px] py-0 px-1.5">Action Needed</Badge> : null}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary mt-1.5 flex-wrap font-medium">
              <span className="font-mono text-text-tertiary text-[11px]">{row.student}</span>
              <span className="inline-flex items-center gap-1 text-[11px]"><PhoneCall className="h-3 w-3 text-text-tertiary" />{row.call_status}</span>
            </div>
          </div>
          <span className="text-[11px] text-text-tertiary font-mono inline-flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
            {row.call_datetime?.replace("T", " ").slice(0, 16)}
          </span>
        </div>

        {(row.academic_notes || row.fee_notes || row.contact_notes || row.overall_feedback) ? (
          <div className="mt-4 pt-3.5 border-t border-border-light/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            {row.academic_notes && (
              <div className="bg-surface/30 p-2.5 rounded-lg border border-border-light/30">
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Academic Notes</p>
                <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.academic_notes}</p>
              </div>
            )}
            {row.fee_notes && (
              <div className="bg-surface/30 p-2.5 rounded-lg border border-border-light/30">
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Fee Notes</p>
                <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.fee_notes}</p>
              </div>
            )}
            {row.contact_notes && (
              <div className="bg-surface/30 p-2.5 rounded-lg border border-border-light/30">
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Contact Notes</p>
                <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.contact_notes}</p>
              </div>
            )}
            {row.overall_feedback && (
              <div className="bg-surface/30 p-2.5 rounded-lg border border-border-light/30 md:col-span-2">
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Overall Feedback</p>
                <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed italic">&ldquo;{row.overall_feedback}&rdquo;</p>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricHeroCard({
  label,
  value,
  icon,
  tone = "default",
  isLoading = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "cyan" | "lime" | "amber";
  isLoading?: boolean;
}) {
  const tones = {
    default: "from-white/95 to-slate-50/92",
    cyan: "from-cyan-50/95 to-sky-50/92",
    lime: "from-lime-50/95 to-emerald-50/92",
    amber: "from-amber-50/95 to-orange-50/92",
  };

  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${tones[tone]} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_30px_-24px_rgba(15,23,42,0.42)]`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">
        {isLoading ? "..." : <AnimatedNumber value={value} />}
      </p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}
