"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  IndianRupee,
  Loader2,
  AlertTriangle,
  Search,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPendingInvoices, type PendingInvoiceRow } from "@/lib/api/fees";
import { getBatch } from "@/lib/api/batches";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Batch } from "@/lib/types/batch";

interface StudentGroup {
  name: string;
  invoices: PendingInvoiceRow[];
  totalOutstanding: number;
}

export default function StudentPendingFeesPage() {
  const { classId, batchId } = useParams<{
    classId: string;
    batchId: string;
  }>();
  const decodedClass = decodeURIComponent(classId);
  const decodedBatch = decodeURIComponent(batchId);
  const isUnmatched = decodedBatch === "__unmatched__";
  const { defaultCompany } = useAuth();

  const [invoices, setInvoices] = useState<PendingInvoiceRow[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedClass) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const allInvoices = await getPendingInvoices({
          company: defaultCompany || undefined,
          item_code: decodedClass,
          limit_page_length: 2000,
        });

        if (isUnmatched) {
          const { getBatches } = await import("@/lib/api/batches");
          const batchListRes = await getBatches({
            custom_branch: defaultCompany || undefined,
            limit_page_length: 500,
          });

          const allStudentNames = new Set<string>();
          const batchIds = (batchListRes.data ?? []).map((b) => b.name);
          const fullBatches = await Promise.all(
            batchIds.map((id) =>
              getBatch(id)
                .then((r) => r.data)
                .catch(() => null)
            )
          );
          for (const b of fullBatches) {
            if (!b) continue;
            for (const s of b.students ?? []) {
              if (s.student_name) allStudentNames.add(s.student_name);
            }
          }

          setInvoices(
            allInvoices.filter((inv) => !allStudentNames.has(inv.customer_name || inv.customer))
          );
        } else {
          const batchRes = await getBatch(decodedBatch);
          const batchData = batchRes.data;
          setBatch(batchData);

          const batchStudentNames = new Set(
            (batchData.students ?? [])
              .filter((s) => s.active !== 0)
              .map((s) => s.student_name ?? "")
              .filter(Boolean)
          );

          setInvoices(
            allInvoices.filter((inv) => batchStudentNames.has(inv.customer_name || inv.customer))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [decodedClass, decodedBatch, defaultCompany, isUnmatched]);

  // Group invoices by student
  const studentGroups = useMemo(() => {
    const map = new Map<string, PendingInvoiceRow[]>();
    for (const inv of invoices) {
      const key = inv.customer_name || inv.customer;
      const existing = map.get(key);
      if (existing) {
        existing.push(inv);
      } else {
        map.set(key, [inv]);
      }
    }
    const groups: StudentGroup[] = [];
    map.forEach((invs, name) => {
      groups.push({
        name,
        invoices: invs.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
        totalOutstanding: invs.reduce((s, i) => s + i.outstanding_amount, 0),
      });
    });
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const totalOutstanding = useMemo(
    () => invoices.reduce((s, inv) => s + inv.outstanding_amount, 0),
    [invoices]
  );

  const filteredStudents = useMemo(() => {
    if (!search) return studentGroups;
    const q = search.toLowerCase();
    return studentGroups.filter((s) => s.name.toLowerCase().includes(q));
  }, [studentGroups, search]);

  const today = new Date().toISOString().split("T")[0];

  const toggleStudent = (name: string) => {
    setExpandedStudent((prev) => (prev === name ? null : name));
  };

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
          <Link
            href={`/dashboard/branch-manager/fees/pending/${encodeURIComponent(decodedClass)}`}
          >
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isUnmatched ? "Unassigned Students" : decodedBatch}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {decodedClass} &mdash; Student pending fee details
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary strip */}
      {!loading && invoices.length > 0 && (
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
                  {studentGroups.length}
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
            placeholder="Search student..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No pending fees found for this batch.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const isExpanded = expandedStudent === student.name;
            return (
              <motion.div
                key={student.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className={isExpanded ? "border-primary/40 shadow-md" : ""}>
                  {/* Student row — clickable */}
                  <button
                    onClick={() => toggleStudent(student.name)}
                    className="w-full text-left"
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {student.invoices.length} invoice{student.invoices.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-sm font-bold text-warning">
                          {formatCurrency(student.totalOutstanding)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-text-tertiary shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-text-tertiary shrink-0" />
                      )}
                    </CardContent>
                  </button>

                  {/* Expanded invoice table */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4">
                          <div className="border-t border-border-light pt-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border-light">
                                    <th className="text-left pb-2 font-semibold text-text-secondary text-xs">
                                      Invoice
                                    </th>
                                    <th className="text-right pb-2 font-semibold text-text-secondary text-xs">
                                      Total
                                    </th>
                                    <th className="text-right pb-2 font-semibold text-text-secondary text-xs">
                                      Outstanding
                                    </th>
                                    <th className="text-left pb-2 font-semibold text-text-secondary text-xs">
                                      Due Date
                                    </th>
                                    <th className="text-left pb-2 font-semibold text-text-secondary text-xs">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {student.invoices.map((inv) => {
                                    const isOverdue = !!inv.due_date && inv.due_date < today;
                                    const isDueToday = !!inv.due_date && inv.due_date === today;
                                    return (
                                      <tr
                                        key={inv.name}
                                        className="border-b border-border-light/50 last:border-0"
                                      >
                                        <td className="py-2.5 text-text-secondary text-xs font-mono">
                                          {inv.name}
                                        </td>
                                        <td className="py-2.5 text-right text-text-secondary">
                                          {formatCurrency(inv.grand_total)}
                                        </td>
                                        <td className="py-2.5 text-right font-semibold text-warning">
                                          {formatCurrency(inv.outstanding_amount)}
                                        </td>
                                        <td className="py-2.5">
                                          <span
                                            className={`flex items-center gap-1 text-xs ${
                                              isOverdue
                                                ? "text-error font-semibold"
                                                : isDueToday
                                                ? "text-warning font-semibold"
                                                : "text-text-secondary"
                                            }`}
                                          >
                                            {(isOverdue || isDueToday) && (
                                              <Clock className="h-3 w-3 shrink-0" />
                                            )}
                                            {inv.due_date
                                              ? new Date(inv.due_date).toLocaleDateString(
                                                  "en-IN",
                                                  { day: "numeric", month: "short", year: "numeric" }
                                                )
                                              : "—"}
                                            {isOverdue && (
                                              <span className="text-[10px] font-bold ml-1">
                                                OVERDUE
                                              </span>
                                            )}
                                          </span>
                                        </td>
                                        <td className="py-2.5">
                                          <Badge
                                            variant={
                                              inv.status === "Overdue"
                                                ? "error"
                                                : inv.status === "Partly Paid"
                                                ? "warning"
                                                : inv.status === "Unpaid"
                                                ? "warning"
                                                : "info"
                                            }
                                          >
                                            {inv.status}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-border-light">
                                    <td className="py-2 text-right font-semibold text-text-primary" colSpan={2}>
                                      Total:
                                    </td>
                                    <td className="py-2 text-right font-bold text-warning">
                                      {formatCurrency(student.totalOutstanding)}
                                    </td>
                                    <td colSpan={2} />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
