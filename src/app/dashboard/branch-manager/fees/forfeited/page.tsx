"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, UserX, Calendar, GraduationCap } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ForfeitedBatch } from "@/app/api/fees/forfeited-detail/route";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ForfeitedFeesPage() {
  const { defaultCompany } = useAuth();

  const [batches, setBatches] = useState<ForfeitedBatch[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/fees/forfeited-detail${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
      { credentials: "include" },
    )
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setBatches(data.batches ?? []);
          setTotalOutstanding(data.total_outstanding ?? 0);
          // Auto-open first batch
          if (data.batches?.length) {
            setOpenBatches(new Set([data.batches[0].batch_name]));
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  const toggleBatch = (batchName: string) => {
    setOpenBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchName)) next.delete(batchName);
      else next.add(batchName);
      return next;
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <UserX className="h-6 w-6 text-error" />
          <h1 className="text-2xl font-bold text-text-primary">Forfeited Fees</h1>
        </div>
        <p className="text-sm text-text-secondary">
          Outstanding fees from discontinued students, grouped by class
        </p>
      </motion.div>

      {/* Summary banner */}
      {!loading && totalOutstanding > 0 && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-error/10 border border-error/20"
        >
          <UserX className="h-5 w-5 text-error flex-shrink-0" />
          <span className="text-sm text-text-primary">
            Total forfeited across{" "}
            <span className="font-semibold">
              {batches.reduce((n, b) => n + b.students.length, 0)} student
              {batches.reduce((n, b) => n + b.students.length, 0) !== 1 ? "s" : ""}
            </span>{" "}
            in{" "}
            <span className="font-semibold">
              {batches.length} class{batches.length !== 1 ? "es" : ""}
            </span>
            :{" "}
            <span className="font-bold text-error">{formatCurrency(totalOutstanding)}</span>
          </span>
        </motion.div>
      )}

      {/* Batch list */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>By Class</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : batches.length === 0 ? (
              <p className="text-center text-text-secondary text-sm py-12">
                No discontinued students with pending fees.
              </p>
            ) : (
              <div className="divide-y divide-border-light">
                {batches.map((batch) => {
                  const isOpen = openBatches.has(batch.batch_name);
                  return (
                    <div key={batch.batch_name}>
                      {/* Batch header row */}
                      <button
                        type="button"
                        onClick={() => toggleBatch(batch.batch_name)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded-lg transition-colors ${
                              isOpen ? "bg-primary/10" : "bg-surface"
                            }`}
                          >
                            <GraduationCap
                              className={`h-4 w-4 ${isOpen ? "text-primary" : "text-text-tertiary"}`}
                            />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-text-primary text-sm">
                              {batch.batch_name}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {batch.students.length} discontinued student
                              {batch.students.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-error">
                            {formatCurrency(batch.total_outstanding)}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Students accordion */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="bg-surface/40 border-t border-border-light">
                              {batch.students.map((student, idx) => (
                                <div
                                  key={student.student_id}
                                  className={`flex items-center justify-between px-8 py-3 ${
                                    idx < batch.students.length - 1
                                      ? "border-b border-border-light/60"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <UserX className="h-3.5 w-3.5 text-error" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-text-primary">
                                          {student.student_name}
                                        </p>
                                        {student.disabilities && (
                                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{student.disabilities}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <Badge variant="error" className="text-[10px] px-1.5 py-0">
                                          Discontinued
                                        </Badge>
                                        {student.discontinuation_date && (
                                          <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(student.discontinuation_date).toLocaleDateString(
                                              "en-IN",
                                              { day: "2-digit", month: "short", year: "numeric" },
                                            )}
                                          </span>
                                        )}
                                        {student.reason && (
                                          <span className="text-[11px] text-text-tertiary truncate max-w-[160px]">
                                            · {student.reason}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-sm font-bold text-error line-through decoration-error/60">
                                      {formatCurrency(student.outstanding_amount)}
                                    </p>
                                    <p className="text-[11px] text-text-tertiary mt-0.5">
                                      {student.invoice_count} invoice
                                      {student.invoice_count !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
