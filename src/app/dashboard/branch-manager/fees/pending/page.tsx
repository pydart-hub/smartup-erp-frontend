"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  IndianRupee,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getClassPendingSummary, type ClassPendingSummary } from "@/lib/api/fees";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ClassPendingFeesPage() {
  const { defaultCompany } = useAuth();
  const [data, setData] = useState<ClassPendingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getClassPendingSummary(defaultCompany || undefined)
      .then((result) => {
        console.log("[pending] class summary:", result);
        setData(result);
      })
      .catch((err) => {
        console.error("[pending] error:", err);
        setError(err?.message || "Failed to fetch data");
      })
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  const totalOutstanding = useMemo(
    () => data.reduce((s, d) => s + d.total_outstanding, 0),
    [data]
  );
  const totalStudents = useMemo(
    () => data.reduce((s, d) => s + d.student_count, 0),
    [data]
  );

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((d) => d.item_code.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/fees">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Pending Fees by Class
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Click a class to see batch-wise breakdown
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary strip */}
      {!loading && data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Card className="border-l-4 border-l-warning">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                  Total Pending
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-info">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                  Students with Dues
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {totalStudents}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search */}
      <div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search class..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Class cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-error">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load data</p>
            <p className="text-sm mt-1 text-text-secondary">{error}</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No pending fees found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls, idx) => {
            const encoded = encodeURIComponent(cls.item_code);
            return (
              <motion.div
                key={cls.item_code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link href={`/dashboard/branch-manager/fees/pending/${encoded}`}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                              {cls.item_code}
                            </h3>
                            <p className="text-xs text-text-tertiary">
                              {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors mt-1" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-text-tertiary">Outstanding</p>
                          <p className="text-lg font-bold text-warning">
                            {formatCurrency(cls.total_outstanding)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            cls.total_outstanding > 500000
                              ? "error"
                              : cls.total_outstanding > 100000
                              ? "warning"
                              : "info"
                          }
                        >
                          {cls.student_count} due
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
