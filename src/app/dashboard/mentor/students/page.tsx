"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { GraduationCap, Search, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { getMentorStudents } from "@/lib/api/mentors";

export default function MentorStudentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["mentor-students"],
    queryFn: getMentorStudents,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.student.name,
        row.student.id,
        row.student.parent_name,
        row.student.parent_mobile,
        row.academic.program,
        row.academic.batch,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(130,195,91,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(26,158,143,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,246,250,0.95)_50%,rgba(230,247,239,0.95))] p-6 shadow-[0_28px_60px_-30px_rgba(13,61,89,0.38)]">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Users className="h-3.5 w-3.5" />
              Assigned Portfolio
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Assigned Students</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review only the students assigned to you, with academics, attendance, fees, and the latest conversation signals in one polished table.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <QuickStat label="Visible Students" value={String(filtered.length)} icon={<GraduationCap className="h-4 w-4" />} />
            <QuickStat label="Fee Alerts" value={String(filtered.filter((row) => row.fees.outstanding > 0).length)} icon={<ShieldCheck className="h-4 w-4" />} />
            <QuickStat label="Strong Academics" value={String(filtered.filter((row) => (row.academic.average_score ?? 0) >= 75).length)} icon={<TrendingUp className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <Card className="border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,248,250,0.95))] shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardContent className="p-4">
          <Input
            placeholder="Search student, parent, program, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,250,0.95))] shadow-[0_28px_50px_-32px_rgba(15,23,42,0.38)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/80" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-secondary p-8 text-center">No assigned students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[linear-gradient(180deg,rgba(244,250,248,0.96),rgba(236,246,250,0.94))]">
                  <tr>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Student</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Program</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Batch</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Parent Contact</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Academic Score</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Attendance</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Fees</th>
                    <th className="text-left px-5 py-4 font-semibold uppercase tracking-[0.16em] text-[11px] text-slate-500">Latest Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white/80">
                  {filtered.map((row) => (
                    <tr key={row.assignment.name} className="transition-colors hover:bg-[linear-gradient(90deg,rgba(26,158,143,0.05),rgba(130,195,91,0.04))]">
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/mentor/students/${encodeURIComponent(row.student.id)}`} className="font-semibold text-primary hover:underline">
                          {row.student.name}
                        </Link>
                        <p className="text-xs text-text-tertiary mt-1">{row.student.id}</p>
                      </td>
                      <td className="px-5 py-4">{row.academic.program || "Not set"}</td>
                      <td className="px-5 py-4">{row.academic.batch || "Not set"}</td>
                      <td className="px-5 py-4">
                        <p>{row.student.parent_name || "Not set"}</p>
                        <p className="text-xs text-text-tertiary mt-1">{row.student.parent_mobile || row.student.mobile || "No number"}</p>
                      </td>
                      <td className="px-5 py-4">
                        {row.academic.average_score !== null && row.academic.average_score !== undefined ? (
                          <Badge variant="outline" className={`font-semibold ${
                            row.academic.average_score >= 75
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50"
                              : row.academic.average_score >= 50
                                ? "bg-amber-500/10 text-amber-600 border-amber-200/50"
                                : "bg-rose-500/10 text-rose-600 border-rose-200/50"
                          }`}>
                            {row.academic.average_score}%
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary text-xs">No exams</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {row.academic.attendance_pct !== null && row.academic.attendance_pct !== undefined ? (
                          <Badge variant="outline" className={`font-semibold ${
                            row.academic.attendance_pct >= 85
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50"
                              : row.academic.attendance_pct >= 75
                                ? "bg-amber-500/10 text-amber-600 border-amber-200/50"
                                : "bg-rose-500/10 text-rose-600 border-rose-200/50"
                          }`}>
                            {row.academic.attendance_pct}%
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary text-xs">No logs</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {row.fees.outstanding > 0 ? (
                          <Badge variant="warning">Outstanding {row.fees.outstanding.toLocaleString("en-IN")}</Badge>
                        ) : (
                          <Badge variant="success">Clear</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-text-secondary">
                        {row.latest_feedback ? (
                          <div>
                            <p>{row.latest_feedback.call_status}</p>
                            <p className="text-text-tertiary mt-1">{row.latest_feedback.call_datetime?.replace("T", " ").slice(0, 16)}</p>
                          </div>
                        ) : "No feedback yet"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_30px_-26px_rgba(15,23,42,0.36)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1A9E8F,#82C35B)] text-white shadow-[0_16px_24px_-18px_rgba(26,158,143,0.7)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
