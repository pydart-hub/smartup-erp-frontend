"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  GraduationCap,
  Calendar,
  Search,
  BookOpen,
  Filter,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getBranches } from "@/lib/api/enrollment";
import { getStudentGroups } from "@/lib/api/courseSchedule";

export default function APDBatchesPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-apd-batches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  const { data: groupRes, isLoading } = useQuery({
    queryKey: ["apd-batches-list", selectedBranch],
    queryFn: () => getStudentGroups({ branch: selectedBranch !== "all" ? selectedBranch : undefined }),
    staleTime: 60_000,
  });
  const studentGroups = groupRes?.data ?? [];

  const filtered = useMemo(() => {
    return studentGroups.filter((g) => {
      if (selectedBranch !== "all" && g.custom_branch && g.custom_branch !== selectedBranch) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const m1 = g.name.toLowerCase().includes(q);
        const m2 = g.student_group_name?.toLowerCase().includes(q);
        const m3 = g.program?.toLowerCase().includes(q);
        const m4 = g.custom_branch?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [studentGroups, selectedBranch, search]);

  return (
    <div className="space-y-6 pb-12">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Academic Batches & Class Cohorts
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Directory of active student cohorts, branch assignments, and associated academic programs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-text-tertiary" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          >
            <option value="all">All Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border border-border/80 bg-surface shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch by name, program, or branch..."
              className="pl-9 text-sm rounded-xl h-9"
            />
          </div>
          <Badge variant="outline" className="text-xs h-9 px-3 flex items-center">
            {filtered.length} Batches
          </Badge>
        </CardContent>
      </Card>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-text-tertiary">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading batches...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-text-tertiary">
          No batches found matching your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <Card
              key={g.name}
              className="border border-border/80 bg-surface hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  {g.custom_is_one_to_one === 1 ? (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
                      One-to-One
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
                      Regular Batch
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary text-base">
                    {g.student_group_name || g.name}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">{g.name}</p>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                  {g.program && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <BookOpen className="w-3.5 h-3.5 text-text-tertiary" />
                      <span className="truncate">{g.program}</span>
                    </div>
                  )}
                  {g.custom_branch && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                      <span className="truncate">{g.custom_branch}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
