"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Building2, Loader2, Phone, Search, UserRoundX } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getSalesUserDiscontinuedStudents } from "@/lib/api/discontinuedFollowup";
import { DiscontinuedFollowUpDrawer } from "@/components/discontinued/DiscontinuedFollowUpDrawer";

function formatDate(value?: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

export default function SalesUserDiscontinuedPage() {
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sales-discontinued-students"],
    queryFn: () => getSalesUserDiscontinuedStudents(),
    staleTime: 60_000,
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.student_name, row.student_id, row.branch, row.program, row.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const selectedStudent = filteredRows.find((row) => row.student_id === selectedStudentId)
    ?? rows.find((row) => row.student_id === selectedStudentId)
    ?? null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div>
        <h1 className="text-2xl font-bold text-text-primary">Discontinued Students</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Call discontinued students, capture feedback, and keep the director forfeited view updated.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-200/70 bg-amber-50/30">
          <CardContent className="p-5">
            <UserRoundX className="mb-3 h-5 w-5 text-amber-600" />
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Discontinued Students</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200/70 bg-red-50/30">
          <CardContent className="p-5">
            <AlertCircle className="mb-3 h-5 w-5 text-red-600" />
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Overdue Forfeited</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">
              {formatCurrency(rows.reduce((sum, row) => sum + row.overdue_outstanding_amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200/70 bg-sky-50/30">
          <CardContent className="p-5">
            <Phone className="mb-3 h-5 w-5 text-sky-600" />
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Already Called</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">
              {rows.filter((row) => !!row.latest_followup?.name).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search student, branch, class, mobile..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {isLoading ? (
          <Card>
            <CardContent className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-error" />
              <p className="text-sm text-error">
                {error instanceof Error ? error.message : "Failed to load discontinued students"}
              </p>
            </CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="flex h-48 items-center justify-center text-sm text-text-tertiary">
              No discontinued students found.
            </CardContent>
          </Card>
        ) : (
          filteredRows.map((row, index) => (
            <motion.div
              key={row.student_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className="h-full border-border-light">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-text-primary">{row.student_name}</h2>
                        <Badge variant={row.latest_followup ? "info" : "warning"}>
                          {row.latest_followup ? row.latest_followup.call_status : "Never Called"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {row.student_id} - {row.program || "No class"} - {row.batch || "No batch"}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedStudentId(row.student_id)}
                      className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                    >
                      Call / Mark Feedback
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border-light bg-surface px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Branch</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                        <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                        {row.branch.replace("Smart Up ", "").replace("Smart Up", "HQ")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-light bg-surface px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Discontinued</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{formatDate(row.discontinuation_date)}</p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-red-700/70">Overdue</p>
                      <p className="mt-1 text-sm font-semibold text-red-500">{formatCurrency(row.overdue_outstanding_amount)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-amber-700/70">Future Due</p>
                      <p className="mt-1 text-sm font-semibold text-amber-600">{formatCurrency(row.future_outstanding_amount)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border-light bg-slate-50/70 p-3 text-sm">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Reason</p>
                    <p className="mt-1 font-medium text-text-primary">{row.discontinuation_reason || "No reason recorded"}</p>
                    {row.latest_followup ? (
                      <div className="mt-3 space-y-1 text-xs text-text-secondary">
                        <p>
                          Last called: <span className="font-medium text-text-primary">{formatDate(row.latest_followup.call_date)}</span>
                          {" "}by {row.latest_followup.called_by.split("@")[0]}
                        </p>
                        {row.latest_followup.feedback_category ? (
                          <p>
                            Feedback: <span className="font-medium text-text-primary">{row.latest_followup.feedback_category}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-text-tertiary">No follow-up logged yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {selectedStudent ? (
        <DiscontinuedFollowUpDrawer
          open={!!selectedStudent}
          onClose={() => setSelectedStudentId(null)}
          student={{
            student_id: selectedStudent.student_id,
            student_name: selectedStudent.student_name,
            branch: selectedStudent.branch,
            mobile: selectedStudent.mobile,
            discontinuation_date: selectedStudent.discontinuation_date,
            discontinuation_reason: selectedStudent.discontinuation_reason,
            outstanding_amount: selectedStudent.outstanding_amount,
          }}
          invalidateKeys={[["sales-discontinued-students"]]}
        />
      ) : null}
    </motion.div>
  );
}
