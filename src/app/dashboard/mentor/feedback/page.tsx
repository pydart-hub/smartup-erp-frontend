"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight } from "lucide-react";
import { getMentorFeedback } from "@/lib/api/mentors";

export default function MentorFeedbackPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mentor-feedback-list"],
    queryFn: () => getMentorFeedback(),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Feedback Logs</h1>
        <p className="text-sm text-text-secondary mt-1">All call notes recorded for your assigned students</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Mentor Feedback Timeline</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-text-secondary">Loading feedback...</p>
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary">No feedback found.</p>
          ) : (
            <div className="space-y-3">
              {(data ?? []).map((row) => (
                <div key={row.name} className="rounded-xl border border-border-light p-4 bg-surface">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-text-primary">{row.student_name}</p>
                        <Badge variant="outline">{row.discussion_category}</Badge>
                        <Badge variant="default">{row.call_status}</Badge>
                      </div>
                      <p className="text-xs text-text-tertiary mt-1">{row.call_datetime?.replace("T", " ").slice(0, 16)}</p>
                    </div>
                    <Link
                      href={`/dashboard/mentor/students/${encodeURIComponent(row.student)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      Full Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {row.overall_feedback ? <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{row.overall_feedback}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
