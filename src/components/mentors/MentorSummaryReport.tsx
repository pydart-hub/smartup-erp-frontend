"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import { Users, GraduationCap, AlertCircle, Clock, Building2, UserX, ArrowLeft, ClipboardList } from "lucide-react";
import { SystemMentorSummary, MentorFeedback } from "@/lib/types/mentor";

interface MentorSummaryReportProps {
  title: string;
  fetchFn: (branch?: string) => Promise<SystemMentorSummary>;
  hideBranchFilters?: boolean;
  lockedBranch?: string;
  backHref?: string;
  feedbackHref?: (mentorName: string, branchName: string) => string;
  showRecentFeedback?: boolean;
  feedbackEndpoint?: string;
}

export function MentorSummaryReport({
  title,
  fetchFn,
  hideBranchFilters = false,
  lockedBranch,
  backHref,
  feedbackHref,
  showRecentFeedback = false,
  feedbackEndpoint,
}: MentorSummaryReportProps) {
  const [branchFilter, setBranchFilter] = useState("");

  const activeBranch = hideBranchFilters ? lockedBranch : branchFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mentor-summary-report", activeBranch],
    queryFn: () => fetchFn(activeBranch || undefined),
    staleTime: 60_000,
    enabled: hideBranchFilters ? !!lockedBranch : true,
  });

  const { data: feedbacks, isLoading: loadingFeedbacks } = useQuery<MentorFeedback[]>({
    queryKey: ["mentor-summary-recent-feedbacks", feedbackEndpoint, activeBranch],
    queryFn: async () => {
      if (!feedbackEndpoint) return [];
      const url = new URL(feedbackEndpoint, window.location.origin);
      if (activeBranch) {
        url.searchParams.set("branch", activeBranch);
      }
      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: showRecentFeedback && !!feedbackEndpoint,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          {backHref && (
            <Link href={backHref} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2">
              <ArrowLeft className="h-3 w-3" /> Back to Mentors Portal
            </Link>
          )}
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {hideBranchFilters ? "Branch mentor load and performance" : "Cross-branch mentor load and performance"}
          </p>
        </div>
      </div>

      {!hideBranchFilters && (
        <Card>
          <CardContent className="p-4 flex items-end gap-4 flex-wrap">
            <div className="w-full max-w-xs">
              <Input
                label="Filter by Branch"
                placeholder="e.g. Smart Up Jayanagar"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isError ? (
        <Card className="border-error/20 bg-error/5">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm font-medium text-error">Failed to load mentor summary.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Mentors</p>
                  <p className="text-2xl font-bold text-text-primary leading-none mt-1">
                    {isLoading ? "..." : <AnimatedNumber value={data?.totalMentors ?? 0} />}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Assigned</p>
                  <p className="text-2xl font-bold text-info leading-none mt-1">
                    {isLoading ? "..." : <AnimatedNumber value={data?.totalAssignedStudents ?? 0} />}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Avg Load</p>
                  <p className="text-2xl font-bold text-purple-600 leading-none mt-1">
                    {isLoading ? "..." : <AnimatedNumber value={data?.averageStudentsPerMentor ?? 0} />}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Pending Tasks</p>
                  <p className="text-2xl font-bold text-warning leading-none mt-1">
                    {isLoading ? "..." : <AnimatedNumber value={data?.pendingFollowUps ?? 0} />}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Coverage Gap</p>
                  <p className="text-2xl font-bold text-error leading-none mt-1">
                    {isLoading ? "..." : <AnimatedNumber value={data?.studentsWithoutMentor ?? 0} />}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Students unassigned</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {!hideBranchFilters && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Branch Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-sm text-text-secondary">Loading...</p>
                  ) : (data?.branchWiseSummary.length ?? 0) === 0 ? (
                    <p className="text-sm text-text-secondary">No branch data available.</p>
                  ) : (
                    <div className="space-y-4">
                      {data?.branchWiseSummary.map((b) => (
                        <div key={b.branch} className="flex flex-col gap-2 border-b border-border-light pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-text-primary">{b.branch}</p>
                            <Badge variant={b.mentorCount >= 4 ? "success" : "warning"}>{b.mentorCount} mentors</Badge>
                          </div>
                          <div className="flex justify-between text-xs text-text-secondary">
                            <span>Assigned: {b.assignedCount}</span>
                            <span>Avg Load: {b.averageLoad}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className={`${(hideBranchFilters && !showRecentFeedback) ? "lg:col-span-3" : "lg:col-span-2"} overflow-hidden`}>
              <CardHeader>
                <CardTitle>Mentor Load & Performance</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-surface/50">
                      <th className="text-left px-4 py-3 font-medium text-text-secondary">Mentor</th>
                      <th className="text-left px-4 py-3 font-medium text-text-secondary">Branch</th>
                      <th className="text-left px-4 py-3 font-medium text-text-secondary">Load Capacity</th>
                      <th className="text-left px-4 py-3 font-medium text-text-secondary">Pending Tasks</th>
                      <th className="text-left px-4 py-3 font-medium text-text-secondary">Total Feedbacks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                          Loading mentor data...
                        </td>
                      </tr>
                    ) : (data?.mentorLoadComparison.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                          No mentors found.
                        </td>
                      </tr>
                    ) : (
                      data?.mentorLoadComparison.map((m) => {
                        const isOverloaded = m.assignedStudents > m.capacity;
                        const hasHighPending = m.pendingFollowUps > 15;
                        return (
                          <tr key={m.mentorName + m.branch} className="border-b border-border-light last:border-0 hover:bg-surface/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-text-primary">{m.mentorName}</td>
                            <td className="px-4 py-3 text-text-secondary">{m.branch}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`${isOverloaded ? "text-error font-semibold" : "text-text-primary"}`}>
                                  {m.assignedStudents} / {m.capacity}
                                </span>
                                {isOverloaded && <AlertCircle className="h-3 w-3 text-error" />}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={hasHighPending ? "error" : "default"}>
                                {m.pendingFollowUps} pending
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-text-secondary font-medium">
                              {feedbackHref ? (
                                <Link 
                                  href={feedbackHref(m.mentorName, m.branch)}
                                  className="text-primary hover:underline font-semibold"
                                >
                                  {m.feedbackCount} logs
                                </Link>
                              ) : (
                                <span>{m.feedbackCount} logs</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {showRecentFeedback && hideBranchFilters && (
              <Card className="lg:col-span-1 flex flex-col justify-between overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-light/60">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Recent Feedback
                  </CardTitle>
                  {feedbackHref && (
                    <Link
                      href={feedbackHref("", "")}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      View All
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between p-4">
                  {loadingFeedbacks ? (
                    <div className="space-y-4 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex flex-col gap-2">
                          <div className="h-4 bg-border-light rounded w-3/4" />
                          <div className="h-3 bg-border-light rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : (feedbacks ?? []).length === 0 ? (
                    <p className="text-sm text-text-secondary py-8 text-center">No feedback logs recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(feedbacks ?? []).slice(0, 4).map((f) => (
                        <div key={f.name} className="border-b border-border-light/40 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-text-primary text-xs truncate max-w-[120px]" title={f.student_name}>
                              {f.student_name}
                            </span>
                            {f.action_required ? (
                              <Badge variant="warning" className="text-[9px] py-0 px-1 font-semibold shrink-0">Action</Badge>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            Mentor: <span className="font-medium text-text-secondary">{f.mentor_user}</span>
                          </p>
                          {f.overall_feedback && (
                            <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 italic leading-relaxed">
                              &ldquo;{f.overall_feedback}&rdquo;
                            </p>
                          )}
                          <div className="flex justify-between items-center text-[9px] text-text-tertiary mt-1.5">
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border-light/60">{f.discussion_category}</span>
                            <span>{f.call_datetime?.split("T")[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {showRecentFeedback && !hideBranchFilters && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-light/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Recent Student Feedback Logs
                </CardTitle>
                {feedbackHref && (
                  <Link
                    href={feedbackHref("", "")}
                    className="text-sm text-primary hover:underline font-semibold"
                  >
                    View All Feedback Logs
                  </Link>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {loadingFeedbacks ? (
                  <p className="text-sm text-text-secondary py-4 animate-pulse">Loading feedback...</p>
                ) : (feedbacks ?? []).length === 0 ? (
                  <p className="text-sm text-text-secondary py-4 text-center">No feedback logs found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(feedbacks ?? []).slice(0, 6).map((f) => (
                      <div key={f.name} className="border border-border-light rounded-xl p-4 bg-surface/50 hover:bg-surface transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-text-primary text-sm">{f.student_name}</span>
                            {f.action_required ? (
                              <Badge variant="warning" className="text-[10px]">Action</Badge>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-text-secondary mt-1 flex justify-between">
                            <span>Mentor: {f.mentor_user}</span>
                            <span className="font-mono text-text-tertiary">{f.branch}</span>
                          </div>
                          {f.overall_feedback && (
                            <p className="text-xs text-text-secondary mt-2 line-clamp-3 italic leading-relaxed">
                              &ldquo;{f.overall_feedback}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-text-tertiary mt-3 pt-2 border-t border-border-light/40">
                          <span className="bg-surface px-1.5 py-0.5 rounded border border-border-light/60">{f.discussion_category}</span>
                          <span>{f.call_datetime?.replace("T", " ").slice(0, 16)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
