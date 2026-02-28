"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { getAllBranches, getBatchCountForBranch } from "@/lib/api/director";

function BranchBatchRow({ branch }: { branch: { name: string; abbr: string } }) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["director-branch-batches", branch.name],
    queryFn: () => getBatchCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/batches`}>
      <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-surface">
        <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{shortName}</p>
          <p className="text-xs text-text-tertiary">{branch.abbr}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-text-primary">
            {isLoading ? (
              <span className="inline-block w-8 h-5 bg-border-light rounded animate-pulse" />
            ) : (
              count ?? 0
            )}
          </p>
          <p className="text-[10px] text-text-tertiary">batches</p>
        </div>
        <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
      </div>
    </Link>
  );
}

export default function DirectorBatchesPage() {
  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const [search, setSearch] = useState("");
  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Batches</h1>
        <p className="text-sm text-text-secondary mt-0.5">Select a branch to view its batches and classes</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input placeholder="Search branches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

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
            <BranchBatchRow key={branch.name} branch={branch} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
