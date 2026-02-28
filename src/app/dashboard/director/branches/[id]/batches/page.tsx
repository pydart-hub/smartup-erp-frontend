"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  School,
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBranchBatches } from "@/lib/api/director";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function BranchBatchesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: batchesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-batches-list", branchName],
    queryFn: () => getBranchBatches(branchName),
    staleTime: 120_000,
  });

  const batches = batchesRes?.data ?? [];
  const activeBatches = batches.filter((b) => !b.disabled);

  // Group by program
  const grouped = activeBatches.reduce(
    (acc, b) => {
      const key = b.program || "Uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    },
    {} as Record<string, typeof activeBatches>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href={`/dashboard/director/branches/${encodedBranch}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {shortName}
      </Link>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Batches — {shortName}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {activeBatches.length} active batches across {Object.keys(grouped).length} programs
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">
            {branchName}
          </Badge>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load batches</p>
        </div>
      ) : activeBatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <p className="text-sm text-text-tertiary">No batches found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([program, groups]) => (
              <motion.div key={program} variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <School className="h-5 w-5 text-primary" />
                      <CardTitle>{program}</CardTitle>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {groups.length} batch{groups.length !== 1 ? "es" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groups.map((batch) => (
                        <Link
                          key={batch.name}
                          href={`/dashboard/director/branches/${encodedBranch}/batches/${encodeURIComponent(batch.name)}`}
                        >
                          <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-surface">
                            <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {batch.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                                <span>{batch.academic_year}</span>
                                {batch.max_strength && (
                                  <>
                                    <span>·</span>
                                    <span>Max {batch.max_strength}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
