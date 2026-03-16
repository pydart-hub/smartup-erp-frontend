"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  IndianRupee,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Search,
  BookOpen,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPendingInvoices, type PendingInvoiceRow } from "@/lib/api/fees";
import { getBatches, getBatch } from "@/lib/api/batches";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Batch } from "@/lib/types/batch";

interface BatchSummary {
  batchName: string;
  batchDisplayName: string;
  studentCount: number;
  totalOutstanding: number;
}

export default function BatchPendingFeesPage() {
  const { classId } = useParams<{ classId: string }>();
  const decodedClass = decodeURIComponent(classId);
  const { defaultCompany } = useAuth();

  const [invoices, setInvoices] = useState<PendingInvoiceRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!decodedClass) return;
    setLoading(true);

    // Fetch invoices + student groups + discontinued students in parallel
    Promise.all([
      getPendingInvoices({
        company: defaultCompany || undefined,
        item_code: decodedClass,
        limit_page_length: 2000,
      }),
      getBatches({
        custom_branch: defaultCompany || undefined,
        limit_page_length: 500,
      }),
      fetch(
        `/api/fees/discontinued-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
        { credentials: "include" }
      ).then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(async ([invData, batchListRes, discData]) => {
        // Build set of discontinued student IDs to exclude
        const discIds = new Set<string>(
          (discData?.students ?? []).map((s: { student_id: string }) => s.student_id)
        );

        // Filter out invoices belonging to discontinued students
        const activeInvoices = invData.filter(
          (inv: PendingInvoiceRow) => !inv.student || !discIds.has(inv.student)
        );
        setInvoices(activeInvoices);

        // Fetch full docs for batches to get student child tables
        const batchIds = (batchListRes.data ?? []).map((b: { name: string }) => b.name);
        const fullBatches = await Promise.all(
          batchIds.map((id: string) =>
            getBatch(id)
              .then((r) => r.data)
              .catch(() => null)
          )
        );
        setBatches(fullBatches.filter((b): b is Batch => b !== null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [decodedClass, defaultCompany]);

  // Build: customer → set of invoice customers
  const invoiceCustomers = useMemo(() => {
    const map = new Map<string, { outstanding: number; count: number }>();
    for (const inv of invoices) {
      const key = inv.customer_name || inv.customer;
      const existing = map.get(key);
      if (existing) {
        existing.outstanding += inv.outstanding_amount;
        existing.count += 1;
      } else {
        map.set(key, { outstanding: inv.outstanding_amount, count: 1 });
      }
    }
    return map;
  }, [invoices]);

  // Build batch summaries by matching student_name in batch.students against
  // invoice customer names (in this system, customer = student name)
  const batchSummaries = useMemo(() => {
    const summaries: BatchSummary[] = [];
    const matchedCustomers = new Set<string>();

    for (const batch of batches) {
      const activeStudents = batch.students?.filter((s) => s.active !== 0) ?? [];
      let batchOutstanding = 0;
      let batchStudentCount = 0;

      for (const student of activeStudents) {
        // Try matching by student_name (customer_name in SI = student name)
        const studentName = student.student_name ?? "";
        const entry = invoiceCustomers.get(studentName);
        if (entry) {
          batchOutstanding += entry.outstanding;
          batchStudentCount += 1;
          matchedCustomers.add(studentName);
        }
      }

      if (batchStudentCount > 0) {
        summaries.push({
          batchName: batch.name,
          batchDisplayName: batch.student_group_name || batch.name,
          studentCount: batchStudentCount,
          totalOutstanding: batchOutstanding,
        });
      }
    }

    // Add "Unmatched" for invoices not assigned to any batch
    const unmatchedInvoices = invoices.filter(
      (inv) => !matchedCustomers.has(inv.customer_name || inv.customer)
    );
    const unmatchedOutstanding = unmatchedInvoices.reduce(
      (s, inv) => s + inv.outstanding_amount, 0
    );
    // Count unique students (customers), not invoices
    const unmatchedStudentCount = new Set(
      unmatchedInvoices.map((inv) => inv.customer_name || inv.customer)
    ).size;

    if (unmatchedStudentCount > 0) {
      summaries.push({
        batchName: "__unmatched__",
        batchDisplayName: "Unassigned Students",
        studentCount: unmatchedStudentCount,
        totalOutstanding: unmatchedOutstanding,
      });
    }

    return summaries.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [batches, invoices, invoiceCustomers]);

  const totalOutstanding = invoices.reduce(
    (s, inv) => s + inv.outstanding_amount,
    0
  );

  const filtered = useMemo(() => {
    if (!search) return batchSummaries;
    const q = search.toLowerCase();
    return batchSummaries.filter((b) =>
      b.batchDisplayName.toLowerCase().includes(q)
    );
  }, [batchSummaries, search]);

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
          <Link href="/dashboard/branch-manager/fees/pending">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {decodedClass}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Batch-wise pending fee breakdown
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary */}
      {!loading && invoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
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
                  Total Students
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {invoiceCustomers.size}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                  Batches
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {batchSummaries.filter((b) => b.batchName !== "__unmatched__").length}
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
            placeholder="Search batch..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Batch cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No batches with pending fees found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch, idx) => {
            const isUnmatched = batch.batchName === "__unmatched__";
            const href = isUnmatched
              ? `/dashboard/branch-manager/fees/pending/${encodeURIComponent(decodedClass)}/__unmatched__`
              : `/dashboard/branch-manager/fees/pending/${encodeURIComponent(decodedClass)}/${encodeURIComponent(batch.batchName)}`;

            return (
              <motion.div
                key={batch.batchName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link href={href}>
                  <Card
                    className={`hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group ${
                      isUnmatched ? "border-dashed border-warning/40" : ""
                    }`}
                  >
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                              isUnmatched
                                ? "bg-warning/10"
                                : "bg-primary/10"
                            }`}
                          >
                            {isUnmatched ? (
                              <AlertTriangle className="h-5 w-5 text-warning" />
                            ) : (
                              <BookOpen className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                              {batch.batchDisplayName}
                            </h3>
                            <p className="text-xs text-text-tertiary">
                              {batch.studentCount} student
                              {batch.studentCount !== 1 ? "s" : ""} with dues
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors mt-1" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-text-tertiary">
                            Outstanding
                          </p>
                          <p className="text-lg font-bold text-warning">
                            {formatCurrency(batch.totalOutstanding)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            batch.totalOutstanding > 200000
                              ? "error"
                              : batch.totalOutstanding > 50000
                              ? "warning"
                              : "info"
                          }
                        >
                          {batch.studentCount} due
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
