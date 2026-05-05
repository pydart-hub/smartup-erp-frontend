"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Clock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPendingInvoices, type PendingInvoiceRow } from "@/lib/api/fees";
import { useAuth } from "@/lib/hooks/useAuth";

interface ClassOverdueSummary {
  item_code: string;
  student_count: number;
  total_outstanding: number;
}

export default function ClassOverdueFeesPage() {
  const { defaultCompany } = useAuth();
  const [data, setData] = useState<ClassOverdueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split("T")[0];
        const [invoices, discData] = await Promise.all([
          getPendingInvoices({
            company: defaultCompany || undefined,
            limit_page_length: 3000,
          }),
          fetch(
            `/api/fees/discontinued-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
            { credentials: "include" },
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (isCancelled) return;

        const discIds = new Set<string>(
          (discData?.students ?? []).map((s: { student_id: string }) => s.student_id),
        );

        const activeOverdues = (invoices as PendingInvoiceRow[]).filter((inv) => {
          if (inv.student && discIds.has(inv.student)) return false;
          return !!inv.due_date && inv.due_date < today;
        });

        const map = new Map<
          string,
          {
            outstanding: number;
            students: Set<string>;
          }
        >();

        for (const inv of activeOverdues) {
          const itemCode = (inv.item_code || "Uncategorized").trim() || "Uncategorized";
          const studentKey =
            (inv.student || "").trim() ||
            (inv.customer_name || inv.customer || "").trim() ||
            inv.name;

          const existing = map.get(itemCode);
          if (existing) {
            existing.outstanding += inv.outstanding_amount || 0;
            existing.students.add(studentKey);
          } else {
            map.set(itemCode, {
              outstanding: inv.outstanding_amount || 0,
              students: new Set([studentKey]),
            });
          }
        }

        const rows: ClassOverdueSummary[] = Array.from(map.entries())
          .map(([item_code, value]) => ({
            item_code,
            student_count: value.students.size,
            total_outstanding: value.outstanding,
          }))
          .sort((a, b) => b.total_outstanding - a.total_outstanding);

        setData(rows);
      } catch (err) {
        console.error("[overdue] error:", err);
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
    [data],
  );
  const totalStudents = useMemo(
    () => data.reduce((s, d) => s + d.student_count, 0),
    [data],
  );

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((d) => d.item_code.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

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
            <h1 className="text-2xl font-bold text-text-primary">Overdue Fees by Class</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Click a class to view overdue drilldown details
            </p>
          </div>
        </div>
      </motion.div>

      {!loading && data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                  Total Overdue
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-warning">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                  Students with Overdues
                </p>
                <p className="text-xl font-bold text-text-primary">{totalStudents}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

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
            <Clock className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No overdue fees found.
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
                <Link href={`/dashboard/branch-manager/fees/pending/${encoded}?overdue=1`}>
                  <Card className="hover:shadow-md hover:border-error/30 transition-all cursor-pointer group">
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-error/10 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-error" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary group-hover:text-error transition-colors">
                              {cls.item_code}
                            </h3>
                            <p className="text-xs text-text-tertiary">
                              {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-error transition-colors mt-1" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-text-tertiary">Outstanding</p>
                          <p className="text-lg font-bold text-error">
                            {formatCurrency(cls.total_outstanding)}
                          </p>
                        </div>
                        <Badge variant="error">{cls.student_count} overdue</Badge>
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
