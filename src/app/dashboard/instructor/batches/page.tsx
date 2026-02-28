"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  School,
  Users,
  Loader2,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";

export default function InstructorBatchesPage() {
  const { allowedBatches } = useAuth();
  const { batches, isLoading: loading, isError: hasError, refetch } = useInstructorBatches();

  // Group by program
  const groupedBatches = batches.reduce(
    (acc, batch) => {
      const key = batch.program || "Uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(batch);
      return acc;
    },
    {} as Record<string, typeof batches>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Batches</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Student groups assigned to you
            {allowedBatches.length > 0 && (
              <span className="ml-2">
                ({allowedBatches.join(", ")})
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="md" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {hasError && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">Failed to load batches from server.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !hasError && batches.length === 0 && (
        <div className="text-center py-12 text-text-secondary text-sm">
          No batches assigned to you yet.
        </div>
      )}

      {/* Batch Grid by Program */}
      {!loading && !hasError && Object.entries(groupedBatches).map(([programName, programBatches]) => (
        <Card key={programName}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              <CardTitle>{programName}</CardTitle>
              <Badge variant="outline" className="ml-2">
                {programBatches.length} batch{programBatches.length > 1 ? "es" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programBatches.map((batch, index) => {
                const max = batch.max_strength ?? 60;
                const enrolled = batch.students?.filter((s) => s.active !== 0).length ?? 0;
                const percentage = max > 0 ? (enrolled / max) * 100 : 0;

                return (
                  <motion.div
                    key={batch.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Link href={`/dashboard/instructor/batches/${encodeURIComponent(batch.name)}`}>
                      <div className="bg-app-bg rounded-[12px] p-4 border border-border-light hover:border-primary/20 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-text-primary">{batch.student_group_name}</h4>
                          <Badge variant={batch.disabled ? "error" : "success"}>
                            {batch.disabled ? "Disabled" : "Active"}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <GraduationCap className="h-3.5 w-3.5 text-text-tertiary" />
                            <span>{enrolled} / {max} students</span>
                          </div>
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Users className="h-3.5 w-3.5 text-text-tertiary" />
                            <span>{batch.batch}</span>
                          </div>
                        </div>

                        {/* Capacity bar */}
                        <div className="mt-3 pt-3 border-t border-border-light">
                          <div className="w-full bg-border-light rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                percentage > 90
                                  ? "bg-error"
                                  : percentage > 70
                                    ? "bg-warning"
                                    : "bg-success"
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-xs text-text-tertiary">{batch.academic_year}</p>
                            <p className="text-xs text-text-tertiary">{Math.round(percentage)}% full</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
