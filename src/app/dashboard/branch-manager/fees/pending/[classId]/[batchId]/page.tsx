"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPendingInvoices, type PendingInvoiceRow } from "@/lib/api/fees";
import { getBatch } from "@/lib/api/batches";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Batch } from "@/lib/types/batch";

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

  useEffect(() => {
    if (!decodedClass) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        // Fetch all pending invoices for this item_code/class
        const allInvoices = await getPendingInvoices({
          company: defaultCompany || undefined,
          item_code: decodedClass,
          limit_page_length: 2000,
        });

        if (isUnmatched) {
          // For unmatched: we show invoices whose customer doesn't match any batch student
          // We need to fetch all batches to determine unmatched
          const { getBatches } = await import("@/lib/api/batches");
          const batchListRes = await getBatches({
            custom_branch: defaultCompany || undefined,
            limit_page_length: 500,
          });

          // Gather all student names from all batches
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

          // Show only invoices where customer is NOT in any batch
          setInvoices(
            allInvoices.filter((inv) => !allStudentNames.has(inv.customer_name || inv.customer))
          );
        } else {
          // Fetch the specific batch to get its student list
          const batchRes = await getBatch(decodedBatch);
          const batchData = batchRes.data;
          setBatch(batchData);

          // Get student names from this batch
          const batchStudentNames = new Set(
            (batchData.students ?? [])
              .filter((s) => s.active !== 0)
              .map((s) => s.student_name ?? "")
              .filter(Boolean)
          );

          // Filter invoices to only those whose customer matches a batch student
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

  const totalOutstanding = useMemo(
    () => invoices.reduce((s, inv) => s + inv.outstanding_amount, 0),
    [invoices]
  );

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.customer_name.toLowerCase().includes(q) ||
        inv.name.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const today = new Date().toISOString().split("T")[0];

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
                  {invoices.length}
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

      {/* Student table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
            No pending fees found for this batch.
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Students with Pending Fees ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left pb-3 font-semibold text-text-secondary">
                        #
                      </th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">
                        Student
                      </th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">
                        Invoice
                      </th>
                      <th className="text-right pb-3 font-semibold text-text-secondary">
                        Total
                      </th>
                      <th className="text-right pb-3 font-semibold text-text-secondary">
                        Outstanding
                      </th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">
                        Due Date
                      </th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, index) => {
                      const isOverdue =
                        !!inv.due_date && inv.due_date < today;
                      const isDueToday =
                        !!inv.due_date && inv.due_date === today;
                      return (
                        <motion.tr
                          key={inv.name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          <td className="py-3 text-text-tertiary">
                            {index + 1}
                          </td>
                          <td className="py-3 font-medium text-text-primary">
                            {inv.customer_name || inv.customer}
                          </td>
                          <td className="py-3 text-text-secondary text-xs font-mono">
                            {inv.name}
                          </td>
                          <td className="py-3 text-right text-text-secondary">
                            {formatCurrency(inv.grand_total)}
                          </td>
                          <td className="py-3 text-right font-semibold text-warning">
                            {formatCurrency(inv.outstanding_amount)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`flex items-center gap-1 text-sm ${
                                isOverdue
                                  ? "text-error font-semibold"
                                  : isDueToday
                                  ? "text-warning font-semibold"
                                  : "text-text-secondary"
                              }`}
                            >
                              {(isOverdue || isDueToday) && (
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {inv.due_date
                                ? new Date(inv.due_date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}
                              {isOverdue && (
                                <span className="text-[10px] font-bold ml-1">
                                  OVERDUE
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                inv.status === "Overdue"
                                  ? "error"
                                  : inv.status === "Unpaid"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-light">
                      <td
                        colSpan={4}
                        className="py-3 text-right font-semibold text-text-primary"
                      >
                        Total Outstanding:
                      </td>
                      <td className="py-3 text-right font-bold text-lg text-warning">
                        {formatCurrency(totalOutstanding)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
