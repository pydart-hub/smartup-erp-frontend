"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  CalendarClock,
  GraduationCap,
  IndianRupee,
  MessageSquareMore,
  PhoneCall,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { getMentorStudents } from "@/lib/api/mentors";

type SortOption = "az" | "attendance" | "score" | "followup";
type SortDirection = "asc" | "desc";

export default function MentorDashboardPage() {
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("az");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data, isLoading } = useQuery({
    queryKey: ["mentor-dashboard-students"],
    queryFn: getMentorStudents,
    staleTime: 60_000,
  });

  const assigned = useMemo(() => data ?? [], [data]);
  const today = new Date().toISOString().slice(0, 10);
  const followupsToday = assigned.filter((row) => row.latest_feedback?.next_followup_date === today).length;
  const noFeedback = assigned.filter((row) => !row.latest_feedback).length;
  const healthyStudents = assigned.filter((row) => row.fees.outstanding <= 0 && row.latest_feedback).length;

  const programOptions = useMemo(() => {
    return Array.from(
      new Set(
        assigned
          .map((row) => row.academic.program?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [assigned]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = assigned.filter((row) => {
      if (programFilter !== "all" && (row.academic.program || "") !== programFilter) {
        return false;
      }

      if (feeFilter === "clear" && row.fees.outstanding > 0) {
        return false;
      }
      if (feeFilter === "outstanding" && row.fees.outstanding <= 0) {
        return false;
      }

      if (feedbackFilter === "feedback-active" && !row.latest_feedback) {
        return false;
      }
      if (feedbackFilter === "awaiting-call" && row.latest_feedback) {
        return false;
      }
      if (feedbackFilter === "followup-today" && row.latest_feedback?.next_followup_date !== today) {
        return false;
      }

      if (!query) return true;

      return [
        row.student.name,
        row.student.id,
        row.student.parent_name,
        row.student.parent_mobile,
        row.student.mobile,
        row.academic.program,
        row.academic.batch,
        row.latest_feedback?.call_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "attendance") {
        const result =
          (a.academic.attendance_pct ?? -1) - (b.academic.attendance_pct ?? -1) ||
          a.student.name.localeCompare(b.student.name);
        return sortDirection === "asc" ? result : -result;
      }

      if (sortBy === "score") {
        const result =
          (a.academic.average_score ?? -1) - (b.academic.average_score ?? -1) ||
          a.student.name.localeCompare(b.student.name);
        return sortDirection === "asc" ? result : -result;
      }

      if (sortBy === "followup") {
        const aValue = a.latest_feedback?.next_followup_date || "9999-12-31";
        const bValue = b.latest_feedback?.next_followup_date || "9999-12-31";
        const result = aValue.localeCompare(bValue) || a.student.name.localeCompare(b.student.name);
        return sortDirection === "asc" ? result : -result;
      }

      const result = a.student.name.localeCompare(b.student.name);
      return sortDirection === "asc" ? result : -result;
    });
  }, [assigned, feedbackFilter, feeFilter, programFilter, search, sortBy, sortDirection, today]);

  const hasActiveControls = useMemo(() => {
    return (
      search.trim().length > 0 ||
      programFilter !== "all" ||
      feeFilter !== "all" ||
      feedbackFilter !== "all" ||
      sortBy !== "az" ||
      sortDirection !== "asc"
    );
  }, [feedbackFilter, feeFilter, programFilter, search, sortBy, sortDirection]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(130,195,91,0.28),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(103,58,183,0.22),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,246,250,0.96)_48%,rgba(230,247,239,0.96))] p-6 shadow-[0_30px_70px_-30px_rgba(13,61,89,0.42)] lg:p-8">
        <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-[#7E57C2]/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#673AB7]/14 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#673AB7,#7E57C2)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_18px_34px_-16px_rgba(103,58,183,0.9)]">
                <Users className="h-9 w-9" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mentor Command Center
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">Mentor Dashboard</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Track assigned students, academic momentum, and follow-up readiness from one polished workspace built around the Smart Up color palette.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DashboardMetric
                label="Assigned Students"
                value={isLoading ? "..." : String(assigned.length)}
                tone="default"
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <DashboardMetric
                label="Today Follow-Ups"
                value={isLoading ? "..." : String(followupsToday)}
                tone="teal"
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <DashboardMetric
                label="No Feedback Yet"
                value={isLoading ? "..." : String(noFeedback)}
                tone="slate"
                icon={<MessageSquareMore className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/75 bg-white/74 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_20px_42px_-28px_rgba(13,61,89,0.38)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <PhoneCall className="h-4 w-4 text-primary" />
              Mentor Focus
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(237,248,243,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_28px_-24px_rgba(103,58,183,0.4)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Student Health Snapshot</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? "..." : healthyStudents}</p>
                <p className="mt-2 text-sm text-slate-600">Students with recent feedback and no outstanding fee risk.</p>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(236,249,245,0.95),rgba(229,245,238,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Next best action</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {followupsToday > 0
                        ? `${followupsToday} follow-up ${followupsToday === 1 ? "is" : "are"} due today.`
                        : "No follow-ups are due today."}
                    </p>
                  </div>
                  <Link href="/dashboard/mentor/students">
                    <Button className="rounded-full bg-[linear-gradient(135deg,#673AB7,#7E57C2)] px-5 shadow-[0_18px_28px_-18px_rgba(103,58,183,0.72)] hover:opacity-95">
                      Open Students
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,250,0.95))] shadow-[0_28px_52px_-32px_rgba(15,23,42,0.38)]">
        <div className="border-b border-slate-200/70 px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recent Assigned Students</h2>
              <p className="mt-2 text-sm text-slate-600">Filter and sort your student queue by program, call readiness, attendance, and academic performance.</p>
            </div>
            <Badge variant="outline" className="rounded-full border-primary/15 bg-primary/5 px-3 py-1 text-slate-700">
              {filteredStudents.length} shown
            </Badge>
          </div>
        </div>

        <div className="border-b border-slate-200/70 p-5 lg:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student, parent, batch, status..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] outline-none transition focus:border-primary/40"
                />
              </div>
            </div>

            <ControlSelect
              label="Program"
              value={programFilter}
              onChange={setProgramFilter}
              options={[
                { label: "All Programs", value: "all" },
                ...programOptions.map((program) => ({ label: program, value: program })),
              ]}
            />

            <ControlSelect
              label="Fee Status"
              value={feeFilter}
              onChange={setFeeFilter}
              options={[
                { label: "All Fee Status", value: "all" },
                { label: "Outstanding Only", value: "outstanding" },
                { label: "Clear Only", value: "clear" },
              ]}
            />

            <ControlSelect
              label="Feedback"
              value={feedbackFilter}
              onChange={setFeedbackFilter}
              options={[
                { label: "All Feedback States", value: "all" },
                { label: "Feedback Active", value: "feedback-active" },
                { label: "Awaiting First Call", value: "awaiting-call" },
                { label: "Follow-Up Today", value: "followup-today" },
              ]}
            />

            <ControlSelect
              label="Sort By"
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              options={[
                { label: "A - Z", value: "az" },
                { label: "Attendance Rate", value: "attendance" },
                { label: "Academic Score", value: "score" },
                { label: "Follow-Up Date", value: "followup" },
              ]}
            />

            <ControlSelect
              label="Direction"
              value={sortDirection}
              onChange={(value) => setSortDirection(value as SortDirection)}
              options={[
                { label: sortBy === "az" ? "A to Z" : "Ascending", value: "asc" },
                { label: sortBy === "az" ? "Z to A" : "Descending", value: "desc" },
              ]}
            />
          </div>

          {hasActiveControls ? (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-slate-500">
                Showing mentor students using your current filters and sorting preferences.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setProgramFilter("all");
                  setFeeFilter("all");
                  setFeedbackFilter("all");
                  setSortBy("az");
                  setSortDirection("asc");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Clear Filters
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-5 lg:p-6">
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[28px] border border-slate-200/70 bg-white/80" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300/80 bg-white/70 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-lg font-semibold text-slate-800">No students match the current filters.</p>
              <p className="mt-2 text-sm text-slate-500">Try clearing filters or broadening the search to see more assigned students.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredStudents.map((row) => (
                <article
                  key={row.assignment.name}
                  className="group overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(130,195,91,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,250,0.95))] p-5 shadow-[0_20px_34px_-24px_rgba(15,23,42,0.42)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_28px_44px_-24px_rgba(103,58,183,0.34)]"
                >
                  <div className="flex items-start justify-between gap-5 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">{row.student.name}</h3>
                        {row.fees.outstanding > 0 ? (
                          <Badge variant="warning" className="rounded-full">Outstanding Fees</Badge>
                        ) : (
                          <Badge variant="success" className="rounded-full">Fees OK</Badge>
                        )}
                        {row.latest_feedback ? (
                          <Badge variant="outline" className="rounded-full border-emerald-200/60 bg-emerald-50/80 text-emerald-700">Feedback Active</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full border-slate-200/80 bg-white/80 text-slate-600">Awaiting First Call</Badge>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                          {row.academic.program || "Program not set"}
                        </span>
                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                          {row.academic.batch || "Batch not set"}
                        </span>
                        {row.student.parent_mobile ? (
                          <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            {row.student.parent_mobile}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <InfoPill
                          icon={<IndianRupee className="h-3.5 w-3.5" />}
                          label="Outstanding"
                          value={row.fees.outstanding.toLocaleString("en-IN")}
                          tone={row.fees.outstanding > 0 ? "amber" : "teal"}
                        />
                        <InfoPill
                          icon={<CalendarClock className="h-3.5 w-3.5" />}
                          label="Follow-up"
                          value={row.latest_feedback?.next_followup_date || "Not scheduled"}
                          tone="slate"
                        />
                        <InfoPill
                          icon={<TrendingUp className="h-3.5 w-3.5" />}
                          label="Academic Score"
                          value={row.academic.average_score != null ? `${row.academic.average_score}%` : "No exams"}
                          tone="teal"
                        />
                        <InfoPill
                          icon={<MessageSquareMore className="h-3.5 w-3.5" />}
                          label="Attendance"
                          value={row.academic.attendance_pct != null ? `${row.academic.attendance_pct}%` : "No logs"}
                          tone="slate"
                        />
                      </div>
                    </div>

                    <Link href={`/dashboard/mentor/students/${encodeURIComponent(row.student.id)}`}>
                      <Button
                        variant="outline"
                        className="rounded-full border-primary/20 bg-white/80 px-5 shadow-[0_14px_22px_-18px_rgba(103,58,183,0.45)] hover:bg-primary/5"
                      >
                        Open Record
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "default" | "teal" | "slate";
}) {
  const toneClass = {
    default: "from-white/95 to-slate-50/92",
    teal: "from-[#E8F8F4] to-[#F2FCF9]",
    slate: "from-[#F7FAFC] to-[#F1F5F9]",
  }[tone];

  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${toneClass} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_30px_-24px_rgba(15,23,42,0.4)]`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "teal" | "amber" | "slate";
}) {
  const toneClass = {
    teal: "bg-[linear-gradient(180deg,rgba(236,249,245,0.95),rgba(229,245,238,0.95))]",
    amber: "bg-[linear-gradient(180deg,rgba(255,246,232,0.95),rgba(255,239,213,0.95))]",
    slate: "bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,248,250,0.95))]",
  }[tone];

  return (
    <div className={`rounded-[20px] border border-white/80 ${toneClass} p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ControlSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] outline-none transition focus:border-primary/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
