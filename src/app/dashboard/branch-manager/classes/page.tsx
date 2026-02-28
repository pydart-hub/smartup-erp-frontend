"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { School, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";
import { getClasses, getBatchCountsByProgram } from "@/lib/api/batches";
import type { ClassLevel } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ClassesPage() {
  const { flags } = useFeatureFlagsStore();
  const { defaultCompany } = useAuth();

  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([
      getClasses({ limit_page_length: 100 }),
      getBatchCountsByProgram(defaultCompany || undefined),
    ])
      .then(([classesRes, counts]) => {
        // Only show programs that have at least one batch for this branch
        const filtered = classesRes.data.filter((c) => (counts[c.name] ?? 0) > 0);
        setClasses(filtered);
        setBatchCounts(counts);
      })
      .catch(() => setError("Failed to load classes."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [defaultCompany]);

  if (!flags.classes) return null;

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
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, index) => {
            const count = batchCounts[cls.name] ?? 0;
            return (
              <motion.div
                key={cls.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ y: -3 }}
              >
                <Link href={`/dashboard/branch-manager/batches?program=${encodeURIComponent(cls.name)}`}>
                  <Card hover className="h-full cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-light rounded-[10px] flex items-center justify-center">
                            <School className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{cls.program_name || cls.name}</CardTitle>
                            {cls.program_abbreviation && (
                              <p className="text-xs text-text-tertiary mt-0.5">{cls.program_abbreviation}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{count} {count === 1 ? "batch" : "batches"}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">View batches</span>
                        <ArrowRight className="h-4 w-4 text-text-tertiary" />
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
