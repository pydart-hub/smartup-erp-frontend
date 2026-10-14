"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  UserCheck,
  Briefcase,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  Award,
  TrendingUp,
  AlertCircle,
  Phone,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { COMMON_INSTRUCTOR_STRENGTHS, COMMON_INSTRUCTOR_WEAKNESSES } from "@/lib/types/instructorFeedback";
import { GifLoader } from "@/components/ui/GifLoader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface TeacherProfileViewProps {
  instructorId: string;
  onBack: () => void;
}

export function TeacherProfileView({ instructorId, onBack }: TeacherProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"weekly" | "attendance" | "cwc" | "work" | "reviews">("weekly");

  // Fetch full profile analytics
  const {
    data: profileData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["teacher-profile-analytics", instructorId],
    queryFn: async () => {
      if (!instructorId) return null;
      const res = await fetch(
        `/api/director/teachers/${encodeURIComponent(instructorId)}/profile-analytics`
      );
      if (!res.ok) {
        throw new Error("Failed to load teacher analytics");
      }
      return res.json();
    },
    enabled: !!instructorId,
    staleTime: 60_000,
  });

  const selectedTeacher = profileData?.instructor;
  const summary = profileData?.summary;

  return (
    <div className="space-y-4">
      {/* Navigation Top Bar */}
      <div className="bg-surface border border-border-light rounded-xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light bg-app-bg text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-primary transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Faculty List
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-text-tertiary">Faculty Analytics</span>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[400px] bg-surface border border-border-light rounded-xl flex items-center justify-center p-12">
          <GifLoader />
        </div>
      ) : isError || !selectedTeacher ? (
        <div className="min-h-[300px] bg-surface border border-border-light rounded-xl flex flex-col items-center justify-center text-center p-8 text-error">
          <AlertCircle className="w-10 h-10 mb-2 opacity-60" />
          <p className="font-semibold text-sm">Unable to load teacher profile</p>
          <p className="text-xs text-text-tertiary mt-1">Please try again or select another teacher.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Teacher Profile Card */}
          <div className="bg-surface border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                  {selectedTeacher.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-text-primary">
                      {selectedTeacher.name}
                    </h1>
                    <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-brand-wash">
                      {selectedTeacher.designation || "Instructor"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-text-secondary bg-app-bg">
                      {selectedTeacher.branch ? selectedTeacher.branch.replace("Smart Up ", "") : "Branch Staff"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-tertiary mt-2 flex-wrap font-mono">
                    {selectedTeacher.employee_id && (
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-text-secondary" /> {selectedTeacher.employee_id}
                      </span>
                    )}
                    {selectedTeacher.department && (
                      <span className="flex items-center gap-1.5 font-sans">
                        <ShieldCheck className="w-3.5 h-3.5 text-text-secondary" /> {selectedTeacher.department}
                      </span>
                    )}
                    {selectedTeacher.cell_number && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-text-secondary" /> {selectedTeacher.cell_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Badges */}
              <div className="flex flex-wrap items-center gap-1.5 md:justify-end max-w-sm">
                {selectedTeacher.assigned_courses?.map((c: string) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-wash text-primary border border-primary/10 flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3 h-3 opacity-70" /> {c}
                  </span>
                ))}
              </div>
            </div>

            {/* 5 KPI Ribbons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-border-light">
              <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                  <span>Weekly Pass Rate</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl font-black text-text-primary">
                  {summary?.weekly_avg_pass_rate ?? 0}%
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {summary?.weekly_exams_count ?? 0} exams conducted
                </p>
              </div>

              <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                  <span>Attendance Rate</span>
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-black text-text-primary">
                  {summary?.attendance?.attendance_rate ?? 0}%
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {summary?.attendance?.present_days ?? 0} of {summary?.attendance?.total_days ?? 0} logged days
                </p>
              </div>

              <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                  <span>CWC Pass Rate</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-text-primary">
                  {summary?.cwc_avg_pass_rate ?? 0}%
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {summary?.cwc_exams_count ?? 0} tests evaluated
                </p>
              </div>

              <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                  <span>Work Assignments</span>
                  <CheckCircle2 className="w-4 h-4 text-info" />
                </div>
                <p className="text-2xl font-black text-text-primary">
                  {summary?.work_assignments?.completion_rate ?? 100}%
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {summary?.work_assignments?.completed ?? 0} submitted · {summary?.work_assignments?.pending ?? 0} pending
                </p>
              </div>

              <div className="bg-app-bg rounded-xl p-3 border border-border-light/60">
                <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                  <span>Parent Rating</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-2xl font-black text-text-primary flex items-baseline gap-1">
                  {summary?.reviews?.avg_rating ? `${summary.reviews.avg_rating}` : "0"}
                  <span className="text-xs text-text-tertiary font-normal">/ 5.0</span>
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {summary?.reviews?.total_reviews ?? 0} verified reviews
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border-light pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "work"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Work Assignments ({profileData?.work_assignments?.length ?? 0})
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "reviews"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Parent Reviews & Feedback ({profileData?.instructor_reviews?.length ?? 0})
            </button>
          </div>

          {/* Tab 1: Weekly Exams */}
          {activeTab === "weekly" && (
            <div className="space-y-3">
              {profileData?.weekly_exams?.length === 0 ? (
                <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No Weekly Exams scheduled for this instructor</p>
                  <p className="text-xs mt-1">Exams categorized under &apos;Weekly Exam&apos; will display week-wise metrics here.</p>
                </div>
              ) : (
                <div className="bg-surface border border-border-light rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-app-bg border-b border-border-light text-text-tertiary uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-3">Exam Date & Title</th>
                          <th className="p-3">Course / Batch</th>
                          <th className="p-3 text-center">Batch Size</th>
                          <th className="p-3 text-center">Attended</th>
                          <th className="p-3 text-center">Absent</th>
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
                            <tr key={exam.id} className="hover:bg-app-bg/60 transition-colors">
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
                                <span className="inline-flex items-center justify-center font-mono font-medium px-2 py-0.5 rounded-md text-xs bg-app-bg text-text-secondary border border-border-light">
                                  {exam.total_enrolled}
                                </span>
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

          {/* Tab 2: Attendance Report */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              {/* Executive Attendance Report Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
                  <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                    <span>Logged Days</span>
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xl font-bold text-text-primary">
                    {summary?.attendance?.total_days ?? 0}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Total working days evaluated</p>
                </div>

                <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
                  <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                    <span>Present Days</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  </div>
                  <p className="text-xl font-bold text-success">
                    {summary?.attendance?.present_days ?? 0}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Marked present / on duty</p>
                </div>

                <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
                  <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                    <span>Absent Days</span>
                    <Clock className="w-3.5 h-3.5 text-error" />
                  </div>
                  <p className="text-xl font-bold text-error">
                    {summary?.attendance?.absent_days ?? 0}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Days without logged punch</p>
                </div>

                <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
                  <div className="flex items-center justify-between text-text-tertiary text-xs mb-1">
                    <span>Overall Attendance %</span>
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xl font-bold text-text-primary">
                    {summary?.attendance?.attendance_rate ?? 0}%
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {summary?.attendance?.attendance_rate >= 85 ? "Excellent standing" : "Below target (85%)"}
                  </p>
                </div>
              </div>

              {profileData?.teacher_attendance?.length === 0 ? (
                <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No attendance logs found for this employee</p>
                </div>
              ) : (
                <div className="bg-surface border border-border-light rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3.5 border-b border-border-light bg-app-bg/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">
                      Daily Attendance Log Report ({profileData?.teacher_attendance?.length} entries)
                    </span>
                    <span className="text-[10px] text-text-tertiary font-mono">
                      Sorted latest first · De-duplicated by date
                    </span>
                  </div>
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
                        {profileData?.teacher_attendance?.map((att: any) => {
                          const isPresent = att.status === "Present" || att.status === "Work From Home";
                          const isAbsent = att.status === "Absent";
                          return (
                            <tr key={att.name || att.attendance_date} className="hover:bg-app-bg/60 transition-colors">
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
                              <td className="p-3 text-center font-mono text-text-primary font-medium">
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

          {/* Tab 3: CWC Exams */}
          {activeTab === "cwc" && (
            <div className="space-y-3">
              {profileData?.cwc_exams?.length === 0 ? (
                <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No CWC Exam records available for this instructor</p>
                  <p className="text-xs mt-1">CWC examinations mapped to this teacher&apos;s courses or batches will appear here.</p>
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

          {/* Tab 4: Work Assignments */}
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

                        {/* Google Drive Link */}
                        <div className="flex items-center gap-2 shrink-0">
                          {wa.google_drive_link && (
                            <a
                              href={wa.google_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-wash text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
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

          {/* Tab 5: Parent Reviews, Strengths & Weaknesses */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {/* Overall Ratings & Scorecard Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rating Card */}
                <div className="bg-surface border border-border-light rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Parent Rating Score
                    </span>
                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">
                      Verified Feedback
                    </Badge>
                  </div>

                  <div className="my-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-text-primary">
                        {summary?.reviews?.avg_rating ? summary.reviews.avg_rating : "0"}
                      </span>
                      <span className="text-sm font-semibold text-text-tertiary">/ 5.0</span>
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const score = summary?.reviews?.avg_rating || 0;
                        const isFilled = star <= Math.round(score);
                        return (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              isFilled
                                ? "text-amber-500 fill-amber-500"
                                : "text-border stroke-[1.5]"
                            }`}
                          />
                        );
                      })}
                      <span className="text-xs text-text-secondary ml-2 font-medium">
                        Based on {summary?.reviews?.total_reviews ?? 0} reviews
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-tertiary">
                    Student evaluations gathered confidentially from parent logins for this academic year.
                  </p>
                </div>

                {/* Key Strengths Summary */}
                <div className="bg-surface border border-border-light rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Key Strengths</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {summary?.reviews?.top_strengths?.length ?? 0} marked
                    </span>
                  </div>

                  {summary?.reviews?.top_strengths?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {summary.reviews.top_strengths.map((item: { tag: string; count: number; pct: number }) => (
                        <span
                          key={item.tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{item.tag}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-200/60 text-[10px] font-bold text-emerald-800">
                            {item.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-text-tertiary italic">No strengths recorded yet</p>
                      <div className="flex flex-wrap gap-1 justify-center mt-3 opacity-40">
                        {COMMON_INSTRUCTOR_STRENGTHS.slice(0, 4).map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded border border-dashed border-border-light text-text-tertiary">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Areas for Growth / Weaknesses Summary */}
                <div className="bg-surface border border-border-light rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Areas for Growth</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {summary?.reviews?.top_weaknesses?.length ?? 0} flagged
                    </span>
                  </div>

                  {summary?.reviews?.top_weaknesses?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {summary.reviews.top_weaknesses.map((item: { tag: string; count: number; pct: number }) => (
                        <span
                          key={item.tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60"
                        >
                          <span>{item.tag}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-200/70 text-[10px] font-bold text-amber-900">
                            {item.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-text-tertiary italic">No growth areas flagged yet</p>
                      <div className="flex flex-wrap gap-1 justify-center mt-3 opacity-40">
                        {COMMON_INSTRUCTOR_WEAKNESSES.slice(0, 4).map((w) => (
                          <span key={w} className="text-[10px] px-2 py-0.5 rounded border border-dashed border-border-light text-text-tertiary">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Parent Reviews Feed */}
              {profileData?.instructor_reviews?.length === 0 ? (
                <div className="bg-surface border border-border-light rounded-xl p-10 text-center text-text-tertiary">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                  <p className="text-sm font-semibold text-text-secondary">No Parent Reviews Recorded Yet</p>
                  <p className="text-xs mt-1 max-w-md mx-auto">
                    When parents complete instructor reviews through the parent portal, their ratings, selected strengths, weaknesses, and detailed remarks will appear here.
                  </p>
                  <div className="mt-6 pt-5 border-t border-border-light/60 max-w-lg mx-auto text-left">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Standard Review Rubric (Evaluated by Parents):
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1 mb-1">
                          <ThumbsUp className="w-3 h-3" /> Strengths Evaluated
                        </span>
                        <ul className="text-[11px] space-y-1 text-text-tertiary list-disc list-inside">
                          {COMMON_INSTRUCTOR_STRENGTHS.slice(0, 5).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-amber-600 font-semibold flex items-center gap-1 mb-1">
                          <ThumbsDown className="w-3 h-3" /> Improvement Areas
                        </span>
                        <ul className="text-[11px] space-y-1 text-text-tertiary list-disc list-inside">
                          {COMMON_INSTRUCTOR_WEAKNESSES.slice(0, 5).map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Verified Review Ledger ({profileData.instructor_reviews.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profileData.instructor_reviews.map((rev: any) => {
                      const strengthsList = rev.strengths ? rev.strengths.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                      const weaknessesList = rev.weaknesses ? rev.weaknesses.split(",").map((w: string) => w.trim()).filter(Boolean) : [];

                      return (
                        <div
                          key={rev.name}
                          className="bg-surface border border-border-light rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all space-y-3"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-text-primary">
                                  {rev.student_name}
                                </span>
                                {rev.is_anonymous && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-app-bg text-text-tertiary">
                                    Anonymous
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-text-tertiary mt-0.5">
                                {rev.course || rev.program || "Class Review"} {rev.review_date ? `· ${rev.review_date}` : ""}
                              </p>
                            </div>

                            {/* Stars */}
                            <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-xs shrink-0">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{rev.rating}.0</span>
                            </div>
                          </div>

                          {/* Strengths Tags */}
                          {strengthsList.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" /> Strengths:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {strengthsList.map((st: string) => (
                                  <span
                                    key={st}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Weaknesses Tags */}
                          {weaknessesList.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsDown className="w-3 h-3" /> Needs Improvement:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {weaknessesList.map((wk: string) => (
                                  <span
                                    key={wk}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/50"
                                  >
                                    {wk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Detailed Feedback */}
                          {rev.detailed_feedback && (
                            <div className="bg-app-bg rounded-lg p-2.5 text-xs text-text-secondary border border-border-light/60">
                              <p className="italic">&ldquo;{rev.detailed_feedback}&rdquo;</p>
                            </div>
                          )}

                          {/* Suggestions */}
                          {rev.suggestions && (
                            <div className="text-[11px] text-text-tertiary">
                              <strong className="text-text-secondary font-medium">Suggestion:</strong> {rev.suggestions}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
