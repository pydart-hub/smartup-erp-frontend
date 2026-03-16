"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAllBranches, getActiveStudentCountForBranch, getDiscontinuedStudentCountForBranch } from "@/lib/api/director";

function BranchStudentRow({
  branch,
}: {
  branch: { name: string; abbr: string };
}) {
  const { data: activeCount, isLoading: loadingActive } = useQuery({
    queryKey: ["director-branch-active-students", branch.name],
    queryFn: () => getActiveStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const { data: discontinuedCount, isLoading: loadingDiscontinued } = useQuery({
    queryKey: ["director-branch-discontinued-students", branch.name],
    queryFn: () => getDiscontinuedStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  const loading = loadingActive || loadingDiscontinued;

  return (
    <Link
      href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/students`}
    >
      <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-surface">
        <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{shortName}</p>
          <p className="text-xs text-text-tertiary">{branch.abbr}</p>
        </div>
        {loading ? (
          <div className="flex gap-4 shrink-0">
            <span className="inline-block w-12 h-8 bg-border-light rounded animate-pulse" />
            <span className="inline-block w-12 h-8 bg-border-light rounded animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-lg font-bold text-success">{activeCount ?? 0}</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Active</p>
            </div>
            {(discontinuedCount ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-error">{discontinuedCount}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Disc.</p>
              </div>
            )}
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
      </div>
    </Link>
  );
}

export default function DirectorStudentsPage() {
  const {
    data: branches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const [search, setSearch] = useState("");

  const activeBranches = (branches ?? []).filter(
    (b) => b.name !== "Smart Up"
  );

  const filtered = search
    ? activeBranches.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      )
    : activeBranches;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div>
        <h1 className="text-2xl font-bold text-text-primary">Students</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Select a branch to view its students
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load branches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((branch) => (
            <BranchStudentRow key={branch.name} branch={branch} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
