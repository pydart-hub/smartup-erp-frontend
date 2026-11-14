"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { School, RefreshCw, ArrowRight } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { getClasses, getBatchCountsByProgram } from "@/lib/api/batches";
import type { ClassLevel } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";

export default function ClassesPage() {
  const { defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();

  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([
      getClasses({ limit_page_length: 100 }),
      getBatchCountsByProgram(defaultCompany || undefined, selectedYear),
    ])
      .then(([classesRes, counts]) => {
        // Only show programs that have at least one batch for this branch + year
        const filtered = classesRes.data.filter((c) => (counts[c.name] ?? 0) > 0);
        setClasses(filtered);
        setBatchCounts(counts);
      })
      .catch(() => setError("Failed to load classes."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [defaultCompany, selectedYear]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Classes</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            View class levels and their batches
            {defaultCompany && <span className="ml-1 text-text-tertiary">— {defaultCompany}</span>}
          </p>
        </div>
        <Button variant="outline" size="md" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <GifLoader />
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && classes.length === 0 && (
        <div className="text-center py-12 text-text-secondary text-sm">
          No classes found for this branch.
        </div>
      )}

      {/* Classes Grid */}
      {!loading && !error && classes.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {classes.map((cls, index) => {
            const count = batchCounts[cls.name] ?? 0;
            return (
              <motion.div
                key={cls.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ y: -3 }} className="h-full"
              >
                <Link href={`/dashboard/branch-manager/batches?program=${encodeURIComponent(cls.name)}`} className="block h-full">
                  <Card hover className="h-full cursor-pointer flex flex-col justify-between">
                    <CardHeader className="p-3 pb-2 sm:p-5 sm:pb-3">
                      <div className="flex items-start sm:items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-light rounded-[8px] sm:rounded-[10px] flex items-center justify-center shrink-0">
                            <School className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm sm:text-lg truncate">{cls.program_name || cls.name}</CardTitle>
                            {cls.program_abbreviation && (
                              <p className="text-[11px] sm:text-xs text-text-tertiary mt-0.5 truncate">{cls.program_abbreviation}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 shrink-0">{count} {count === 1 ? "batch" : "batches"}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-text-secondary">View batches</span>
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-tertiary" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
