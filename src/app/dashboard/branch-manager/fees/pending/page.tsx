"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  UserRound,
  IndianRupee,
  ChevronRight,
  ChevronDown,
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
import {
  getClassPendingSummary,
  getPendingInvoices,
  type ClassPendingSummary,
  type PendingInvoiceRow,
} from "@/lib/api/fees";
import { getStudentGroups } from "@/lib/api/courseSchedule";
import { getBatch } from "@/lib/api/batches";
import type { Batch } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";

interface O2OPendingStudentRow {
  key: string;
  studentId?: string;
  studentName: string;
  outstanding: number;
  invoiceCount: number;
}

export default function ClassPendingFeesPage() {
  const { defaultCompany } = useAuth();
  const [data, setData] = useState<ClassPendingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [o2oPending, setO2OPending] = useState<O2OPendingStudentRow[]>([]);
  const [o2oExpanded, setO2oExpanded] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [classSummary, o2oGroupsRes] = await Promise.all([
          getClassPendingSummary(defaultCompany || undefined),
          getStudentGroups({ branch: defaultCompany || undefined, oneToOneOnly: true }),
        ]);
        if (isCancelled) return;
        setData(classSummary);

        const o2oGroups = o2oGroupsRes.data ?? [];
        if (o2oGroups.length === 0) {
          setO2OPending([]);
          return;
        }

        const fullGroups = await Promise.all(
          o2oGroups.map((g) =>
            getBatch(g.name)
              .then((res) => res.data)
              .catch(() => null),
          ),
        );
        if (isCancelled) return;

        const studentIds = new Set<string>();
        const studentNames = new Set<string>();
        const studentNameById: Record<string, string> = {};

        for (const group of fullGroups.filter((g): g is Batch => g !== null)) {
          for (const s of group.students ?? []) {
            if (s.active === 0) continue;
            const sid = (s.student ?? "").trim();
            const sname = (s.student_name ?? "").trim();
            if (sid) studentIds.add(sid);
            if (sname) studentNames.add(sname);
            if (sid && sname) studentNameById[sid] = sname;
          }
        }

        const pendingInvoices = await getPendingInvoices({
          company: defaultCompany || undefined,
          limit_page_length: 3000,
        });
        if (isCancelled) return;

        const rowsMap = new Map<string, O2OPendingStudentRow>();
        for (const inv of pendingInvoices as PendingInvoiceRow[]) {
          const sid = (inv.student ?? "").trim();
          const cname = (inv.customer_name || inv.customer || "").trim();
          const isO2O = (sid && studentIds.has(sid)) || (!!cname && studentNames.has(cname));
          if (!isO2O) continue;

          const key = sid || cname;
          const studentName = sid
            ? (studentNameById[sid] || cname || sid)
            : (cname || "Unknown Student");

          const existing = rowsMap.get(key);
          if (existing) {
            existing.outstanding += inv.outstanding_amount || 0;
            existing.invoiceCount += 1;
          } else {
            rowsMap.set(key, {
              key,
              studentId: sid || undefined,
              studentName,
              outstanding: inv.outstanding_amount || 0,
              invoiceCount: 1,
            });
          }
        }

        const rows = Array.from(rowsMap.values()).sort(
          (a, b) => b.outstanding - a.outstanding,
        );
        setO2OPending(rows);
      } catch (err) {
        console.error("[pending] error:", err);
        setError((err as { message?: string })?.message || "Failed to fetch data");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [defaultCompany]);

  const totalOutstanding = useMemo(
    () => data.reduce((s, d) => s + d.total_outstanding, 0),
    [data]
  );
  const totalStudents = useMemo(
    () => data.reduce((s, d) => s + d.student_count, 0),
    [data]
  );
  const totalO2OOutstanding = useMemo(
    () => o2oPending.reduce((sum, row) => sum + row.outstanding, 0),
    [o2oPending],
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

      {/* One-to-One drilldown */}
      {!loading && o2oPending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border border-warning/30 bg-warning/5">
            <CardContent className="py-4">
              <button
                type="button"
                onClick={() => setO2oExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      One-to-One Pending Fees
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {o2oPending.length} student{o2oPending.length !== 1 ? "s" : ""} with pending dues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-warning">
                    {formatCurrency(totalO2OOutstanding)}
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 text-text-tertiary transition-transform ${o2oExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {o2oExpanded && (
                <div className="mt-4 space-y-2">
                  {o2oPending.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-lg border border-border-light bg-surface px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{row.studentName}</p>
                        <p className="text-xs text-text-tertiary">{row.studentId || "Linked by customer name"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-warning">{formatCurrency(row.outstanding)}</p>
                        <Badge variant="info">{row.invoiceCount} due</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
