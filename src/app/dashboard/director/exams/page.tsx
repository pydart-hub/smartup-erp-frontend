"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Building2,
  ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getAssessmentPlans } from "@/lib/api/assessment";
import { getAllBranches } from "@/lib/api/director";

export default function DirectorExamsPage() {
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
  });

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["director-all-exams"],
    queryFn: () => getAssessmentPlans(),
    staleTime: 30_000,
  });

  const branchStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return branches.map((b) => {
      const branchExams = allExams.filter((e) => e.custom_branch === b.name);
      return {
        branch: b.name,
        branchLabel: b.company_name,
        total: branchExams.length,
        upcoming: branchExams.filter((e) => e.schedule_date >= today).length,
        completed: branchExams.filter((e) => e.schedule_date < today).length,
      };
    });
  }, [allExams, branches]);

  const isLoading = branchesLoading || examsLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <div>
        <h1 className="text-2xl font-bold text-text-primary">Exam Analytics</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Select a branch to view exams and student marks
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1.5">
            <Building2 className="h-4 w-4" /> Branches
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchStats.map((bs) => (
              <Link
                key={bs.branch}
                href={`/dashboard/director/exams/${encodeURIComponent(bs.branch)}`}
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-text-primary text-sm truncate">
                        {bs.branchLabel}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-text-primary">{bs.total}</p>
                        <p className="text-xs text-text-secondary">Total</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary">{bs.upcoming}</p>
                        <p className="text-xs text-primary">Upcoming</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-success">{bs.completed}</p>
                        <p className="text-xs text-success">Done</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
