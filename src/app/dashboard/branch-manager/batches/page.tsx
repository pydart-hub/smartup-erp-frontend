"use client";

import React, { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { School, Users, User, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { getBatches, getBatchStudentCounts } from "@/lib/api/batches";
import type { Batch } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";

export function BatchesContent() {
  const { defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();
  const searchParams = useSearchParams();
  const programFilter = searchParams.get("program") || "";
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadBatches() {
    setLoading(true);
    setError(null);
    getBatches({
      limit_page_length: 500,
      ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      ...(programFilter ? { program: programFilter } : {}),
      academic_year: selectedYear,
    })
      .then(async (res) => {
        setBatches(res.data);
        const names = res.data.map((b) => b.name);
        const counts = await getBatchStudentCounts(names);
        setStudentCounts(counts);
      })
      .catch(() => setError("Failed to load batches from server."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBatches(); }, [defaultCompany, programFilter, selectedYear]);

  // Group by program
  const groupedBatches = batches.reduce(
    (acc, batch) => {
      const key = batch.program || "Uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(batch);
      return acc;
    },
    {} as Record<string, Batch[]>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Back link when filtered by class */}
      {programFilter && (
        <Link href="/dashboard/branch-manager/classes" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Classes
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {programFilter ? `${programFilter} — Batches` : "Batches"}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {programFilter ? "Batches under this class" : "Manage class batches and student allocation"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={loadBatches} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadBatches}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && batches.length === 0 && (
        <div className="text-center py-12 text-text-secondary text-sm">
          No batches found. Create your first batch to get started.
        </div>
      )}

      {/* Batch Grid by Program */}
      {!loading && !error && Object.entries(groupedBatches).map(([programName, programBatches]) => (
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
                const enrolled = studentCounts[batch.name] ?? 0;
                const percentage = max > 0 ? (enrolled / max) * 100 : 0;
                const isFull = enrolled >= max && max > 0;

                return (
                  <motion.div
                    key={batch.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Link href={`/dashboard/branch-manager/batches/${encodeURIComponent(batch.name)}`}>
                    <div className="bg-app-bg rounded-[12px] p-4 border border-border-light hover:border-primary/20 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-text-primary">{batch.student_group_name}</h4>
                        {batch.disabled ? (
                          <Badge variant="error">Disabled</Badge>
                        ) : isFull ? (
                          <Badge variant="error">Full</Badge>
                        ) : percentage > 80 ? (
                          <Badge variant="warning">Almost Full</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Users className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>{enrolled} / {max} students</span>
                        </div>
                        {batch.batch && (
                          <div className="flex items-center gap-2 text-text-secondary">
                            <User className="h-3.5 w-3.5 text-text-tertiary" />
                            <span>{batch.batch}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between">
                        <p className="text-xs text-text-tertiary">{batch.academic_year}</p>
                        {batch.custom_branch && (
                          <p className="text-xs text-text-tertiary truncate max-w-[120px]">{batch.custom_branch}</p>
                        )}
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

export default function BatchesPage() {
  return (
    <Suspense fallback={null}>
      <BatchesContent />
    </Suspense>
  );
}