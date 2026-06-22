"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Mail,
  Phone,
  PhoneCall,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getBranchManagerMentorStudentDetail } from "@/lib/api/mentors";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function BranchManagerMentorStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = decodeURIComponent(id);
  const [attendanceMode, setAttendanceMode] = useState<"summary" | "absent">("summary");

  const { data, isLoading, error } = useQuery({
    queryKey: ["branch-manager-mentor-student-detail", studentId],
    queryFn: () => getBranchManagerMentorStudentDetail(studentId),
    staleTime: 30_000,
  });

  const attendanceStats = useMemo(() => {
    const records = data?.attendance || [];
    const total = records.length;
    const present = records.filter((row) => row.status === "Present").length;
    const late = records.filter((row) => row.status === "Late").length;
    const absentRows = records.filter((row) => row.status === "Absent");
    const absent = absentRows.length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, pct, absentRows };
  }, [data]);

  if (isLoading) {
    return <div className="space-y-6"><BreadcrumbNav /><p className="text-sm text-text-secondary">Loading student details...</p></div>;
  }

  if (!data) {
    return <div className="space-y-6"><BreadcrumbNav /><p className="text-sm text-error">{(error as Error)?.message || "Failed to load student details"}</p></div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <BreadcrumbNav />

      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(130,195,91,0.25),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(231,245,255,0.92)_45%,rgba(215,240,236,0.96))] shadow-[0_28px_60px_-28px_rgba(13,61,89,0.35)]">
        <CardContent className="relative p-0">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#1A9E8F]/15 blur-3xl" />
          <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-[#82C35B]/20 blur-2xl" />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <div>
                <Link href="/dashboard/branch-manager/mentors/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-3">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Mentors Dashboard
                </Link>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#1A9E8F,#82C35B)] text-2xl font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_30px_-16px_rgba(26,158,143,0.9)]">
                    {data.student.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{data.student.name}</h1>
                      <Badge variant="outline" className="font-mono text-[11px] bg-white/70 backdrop-blur">{data.student.id}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {data.student.student_type ? <Badge className="bg-white/85 text-slate-700 shadow-sm">{data.student.student_type}</Badge> : null}
                      {data.fees.custom_plan ? <Badge variant="info" className="shadow-sm">{data.fees.custom_plan}</Badge> : null}
                      {data.academic.program ? <Badge variant="outline" className="bg-white/70 shadow-sm">{data.academic.program}</Badge> : null}
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      A polished student overview for quick mentor follow-up, academic tracking, fee visibility, and parent coordination.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroMetric label="Program" value={data.academic.program || "N/A"} icon={<GraduationCap className="h-4 w-4" />} />
                <HeroMetric label="Attendance Rate" value={`${attendanceStats.pct}%`} icon={<TrendingUp className="h-4 w-4" />} tone="mint" />
                <HeroMetric label="Outstanding Fees" value={currency(data.fees.outstanding)} icon={<CreditCard className="h-4 w-4" />} tone="amber" />
                <HeroMetric label="Parent Contact" value={data.student.parent_mobile || data.student.mobile || "N/A"} icon={<Phone className="h-4 w-4" />} />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_40px_-26px_rgba(13,61,89,0.38)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </div>
              <div className="mt-4 space-y-3">
                <Link href={`/dashboard/branch-manager/students/${encodeURIComponent(data.student.id)}`}>
                  <Button variant="outline" className="w-full justify-between rounded-2xl bg-white/80 py-6">
                    Open Full Student Record
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,252,255,0.9),rgba(241,247,250,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Snapshot</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <MiniRow label="Academic Year" value={data.academic.academic_year || "N/A"} />
                    <MiniRow label="Batch" value={data.academic.batch || "N/A"} />
                    <MiniRow label="Average Score" value={data.academic.average_score != null ? `${data.academic.average_score}%` : "N/A"} />
                    <MiniRow label="Joining Date" value={data.student.joining_date || "N/A"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PanelCard title="Academic Details" icon={<GraduationCap className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Program / Class" value={data.academic.program} />
            <InfoTile label="Academic Year" value={data.academic.academic_year} />
            <InfoTile label="Batch" value={data.academic.batch} />
            <InfoTile label="Average Score" value={data.academic.average_score != null ? `${data.academic.average_score}%` : "N/A"} />
            <InfoTile label="Overall Attendance" value={data.academic.attendance_pct != null ? `${data.academic.attendance_pct}%` : "N/A"} />
            <InfoTile label="Joining Date" value={data.student.joining_date} />
          </div>
        </PanelCard>

        <PanelCard title="Parent Details" icon={<Users className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Parent Name" value={data.student.parent_name} icon={<UserCheck className="h-4 w-4" />} />
            <InfoTile label="Parent Mobile" value={data.student.parent_mobile} icon={<Phone className="h-4 w-4" />} />
            <InfoTile label="Student Mobile" value={data.student.mobile} icon={<Phone className="h-4 w-4" />} />
            <InfoTile label="Email" value={data.student.email} icon={<Mail className="h-4 w-4" />} />
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Address</p>
            <p className="text-sm font-medium text-slate-800">{data.student.address || "N/A"}</p>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Guardians</p>
            <div className="space-y-3">
              {data.guardians.length === 0 ? (
                <p className="text-sm text-text-secondary">No guardian records found.</p>
              ) : (
                data.guardians.map((row, index) => (
                  <div
                    key={`${row.guardian || row.guardian_name || index}`}
                    className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(243,249,247,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_30px_-26px_rgba(26,158,143,0.45)]"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{row.guardian_name || "Guardian"}</span>
                      <Badge variant="outline" className="bg-white/80">{row.relation || "Relation"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {row.mobile_number || "No mobile"}{row.email_address ? ` • ${row.email_address}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PanelCard
          title="Attendance"
          icon={<Calendar className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
              <button
                onClick={() => setAttendanceMode("summary")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  attendanceMode === "summary"
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setAttendanceMode("absent")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  attendanceMode === "absent"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Absent Days
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatPill label="Total" value={String(attendanceStats.total)} />
            <StatPill label="Present" value={String(attendanceStats.present)} tone="success" />
            <StatPill label="Late" value={String(attendanceStats.late)} tone="warning" />
            <button
              type="button"
              onClick={() => setAttendanceMode("absent")}
              className="text-left"
            >
              <StatPill label="Absent" value={String(attendanceStats.absent)} tone="danger" interactive />
            </button>
          </div>

          <div className="mt-5 rounded-[26px] border border-slate-200/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            {attendanceMode === "summary" ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Attendance performance</p>
                    <p className="text-xs text-slate-500">Click the `Absent` tile to focus only on missed days.</p>
                  </div>
                  <div className="rounded-2xl bg-[linear-gradient(135deg,#1A9E8F,#82C35B)] px-4 py-2 text-right text-white shadow-[0_16px_24px_-18px_rgba(26,158,143,0.9)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/75">Rate</p>
                    <p className="text-xl font-bold">{attendanceStats.pct}%</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(data.attendance || []).length === 0 ? (
                    <p className="text-sm text-text-secondary">No attendance records found.</p>
                  ) : (
                    data.attendance!.slice(0, 12).map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,248,250,0.95))] px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.55)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{row.date}</p>
                          <p className="text-xs text-slate-500">{row.student_group || "Student group not set"}</p>
                        </div>
                        <Badge variant={row.status === "Present" ? "success" : row.status === "Late" ? "warning" : "outline"}>
                          {row.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900">Absent day list</p>
                  <p className="text-xs text-slate-500">Only the missed attendance dates are shown here.</p>
                </div>
                {attendanceStats.absentRows.length === 0 ? (
                  <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-emerald-700">No absent days recorded</p>
                    <p className="text-xs text-emerald-600 mt-1">This student has no absence history in the available records.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {attendanceStats.absentRows.map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between rounded-[22px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,250,250,0.96),rgba(255,240,240,0.92))] px-4 py-3 shadow-[0_14px_28px_-24px_rgba(225,29,72,0.55)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{row.date}</p>
                          <p className="text-xs text-slate-500">{row.student_group || "Student group not set"}</p>
                        </div>
                        <Badge variant="error">Absent</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Fees" icon={<CreditCard className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Plan" value={data.fees.custom_plan} />
            <InfoTile label="Fee Structure" value={data.fees.fee_structure} />
            <InfoTile label="Total Invoiced" value={currency(data.fees.total_invoiced)} />
            <InfoTile label="Outstanding" value={currency(data.fees.outstanding)} />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Invoices</p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {data.invoices.length === 0 ? (
                <p className="text-sm text-text-secondary">No invoices found.</p>
              ) : (
                data.invoices.map((row) => (
                  <div
                    key={row.name}
                    className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.95))] p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.5)]"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-900">{row.name}</span>
                      <Badge variant="outline" className="bg-white/80">{row.status || "Unknown"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Due: {row.due_date || row.posting_date || "N/A"}</span>
                      <span className="font-semibold text-amber-600">{currency(row.outstanding_amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Mentor Feedback Log" icon={<ClipboardList className="h-4 w-4" />}>
        {!data.feedback || data.feedback.length === 0 ? (
          <p className="text-sm text-text-secondary">No mentor feedback logs recorded for this student yet.</p>
        ) : (
          <div className="space-y-4">
            {data.feedback.map((row) => (
              <div
                key={row.name}
                className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,250,0.95))] p-5 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.48)]"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-white/80">{row.discussion_category}</Badge>
                      <Badge variant={row.call_status === "Answered" ? "success" : "warning"}>{row.call_status}</Badge>
                      {row.priority ? <Badge variant="info">{row.priority}</Badge> : null}
                      {row.action_required ? <Badge variant="error">Action Required</Badge> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <PhoneCall className="h-3.5 w-3.5" />
                        {row.contact_person || "Parent"}{row.contact_number ? ` • ${row.contact_number}` : ""}
                      </span>
                      <span>{row.call_datetime?.replace("T", " ").slice(0, 16) || "No call time"}</span>
                      {row.next_followup_date ? <span>Next follow-up: {row.next_followup_date}</span> : null}
                    </div>
                  </div>
                </div>

                {(row.overall_feedback || row.academic_notes || row.fee_notes || row.contact_notes) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {row.academic_notes ? (
                      <FeedbackNote title="Academic Notes" body={row.academic_notes} />
                    ) : null}
                    {row.fee_notes ? (
                      <FeedbackNote title="Fee Notes" body={row.fee_notes} />
                    ) : null}
                    {row.contact_notes ? (
                      <FeedbackNote title="Contact Notes" body={row.contact_notes} />
                    ) : null}
                    {row.overall_feedback ? (
                      <div className="md:col-span-2">
                        <FeedbackNote title="Overall Feedback" body={row.overall_feedback} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Assessment History" icon={<GraduationCap className="h-4 w-4" />}>
        {!data.exams || data.exams.length === 0 ? (
          <p className="text-sm text-text-secondary">No assessment results found.</p>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-slate-50/80">
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Exam</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Score</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.exams.map((row) => (
                  <tr key={row.name} className="border-b border-border-light last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-900 font-medium">{row.course}</td>
                    <td className="px-4 py-3 text-slate-600">{row.assessment_name || row.assessment_group}</td>
                    <td className="px-4 py-3 text-slate-600">{row.total_score}/{row.maximum_score}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-white/80">{row.grade || "N/A"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function PanelCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,250,0.94))] shadow-[0_28px_50px_-32px_rgba(15,23,42,0.42)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(26,158,143,0.12),rgba(130,195,91,0.2))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            {icon}
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function HeroMetric({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "mint" | "amber";
}) {
  const tones = {
    default: "from-white/95 to-slate-50/90",
    mint: "from-emerald-50/95 to-teal-50/95",
    amber: "from-amber-50/95 to-orange-50/95",
  };

  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${tones[tone]} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_30px_-24px_rgba(15,23,42,0.42)]`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-lg font-bold text-slate-900 break-words">{value}</p>
    </div>
  );
}

function InfoTile({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex items-start gap-3">
        {icon ? <span className="mt-0.5 text-slate-400">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 break-words">{value || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
  interactive = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  interactive?: boolean;
}) {
  const tones = {
    default: "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f7fafc)] text-slate-900",
    success: "border-emerald-200 bg-[linear-gradient(180deg,#f1fff8,#e6fbef)] text-emerald-700",
    warning: "border-amber-200 bg-[linear-gradient(180deg,#fffaf0,#fff1d8)] text-amber-700",
    danger: "border-rose-200 bg-[linear-gradient(180deg,#fff7f7,#ffe3e6)] text-rose-700",
  };

  return (
    <div className={`rounded-[22px] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_24px_-22px_rgba(15,23,42,0.45)] transition-transform ${interactive ? "hover:-translate-y-0.5 cursor-pointer" : ""} ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function FeedbackNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}
