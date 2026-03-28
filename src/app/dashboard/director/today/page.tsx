"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserPlus,
  GraduationCap,
  IndianRupee,
  CircleCheck,
  Clock,
  Loader2,
  AlertCircle,
  Building2,
  BookOpen,
  CreditCard,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";

interface TodayAdmission {
  student_id: string;
  student_name: string;
  branch: string;
  branch_abbr: string;
  program: string;
  batch: string;
  fee_structure: string;
  plan: string;
  instalments: string;
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
  invoice_count: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

async function fetchTodaysAdmissions(): Promise<TodayAdmission[]> {
  const res = await fetch("/api/director/today-admissions", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export default function TodayAdmissionsPage() {
  const { data: admissions, isLoading, isError } = useQuery({
    queryKey: ["director-today-admissions-detail"],
    queryFn: fetchTodaysAdmissions,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const rows = admissions ?? [];
  const totalBilled = rows.reduce((s, r) => s + r.total_billed, 0);
  const totalPaid = rows.reduce((s, r) => s + r.total_paid, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.total_outstanding, 0);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/director"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-emerald-500" />
              Today&apos;s Admissions
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">{today}</p>
          </div>
          <Badge
            variant="outline"
            className="self-start px-3 py-1 text-sm border-emerald-500/30 text-emerald-600"
          >
            {isLoading ? "..." : rows.length} student{rows.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading ? "..." : rows.length}
            </p>
            <p className="text-xs text-text-tertiary">Admissions</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-yellow-500 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-yellow-600">
              {isLoading ? "..." : formatCurrency(totalBilled)}
            </p>
            <p className="text-xs text-text-tertiary">Total Billed</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4 text-center">
            <CircleCheck className="h-5 w-5 text-green-500 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-text-tertiary">Collected</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-red-500 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-red-600">
              {isLoading ? "..." : formatCurrency(totalOutstanding)}
            </p>
            <p className="text-xs text-text-tertiary">Pending</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Student list */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load admissions</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <UserPlus className="h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-tertiary">No admissions today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <motion.div
                key={row.student_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border-light hover:border-primary/30 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    {/* Top row: Name + Branch */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {row.student_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Building2 className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                            <span className="text-xs text-text-tertiary truncate">
                              {row.branch?.replace("Smart Up ", "") || "-"}
                            </span>
                            {row.branch_abbr && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {row.branch_abbr}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {row.plan !== "-" && (
                        <Badge
                          variant="default"
                          className="text-[10px] flex-shrink-0 bg-primary/10 text-primary border-0"
                        >
                          {row.plan}
                        </Badge>
                      )}
                    </div>

                    {/* Info row: Fee Structure + Instalments */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 pl-12">
                      {row.program !== "-" && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs text-text-secondary">{row.program}</span>
                        </div>
                      )}
                      {row.fee_structure !== "-" && (
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs text-text-secondary">{row.fee_structure}</span>
                        </div>
                      )}
                      {row.instalments !== "-" && (
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs text-text-secondary">
                            {row.instalments} instalment{row.instalments !== "1" ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom row: Financials */}
                    <div className="flex items-center gap-4 pl-12">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-tertiary uppercase">Billed</span>
                        <span className="text-xs font-semibold text-yellow-600 tabular-nums">
                          {formatCurrency(row.total_billed)}
                        </span>
                      </div>
                      <div className="w-px h-3.5 bg-border-light" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-tertiary uppercase">Paid</span>
                        <span className="text-xs font-semibold text-green-600 tabular-nums">
                          {formatCurrency(row.total_paid)}
                        </span>
                      </div>
                      <div className="w-px h-3.5 bg-border-light" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-tertiary uppercase">Pending</span>
                        <span className={`text-xs font-semibold tabular-nums ${row.total_outstanding > 0 ? "text-red-500" : "text-text-tertiary"}`}>
                          {formatCurrency(row.total_outstanding)}
                        </span>
                      </div>
                      {row.invoice_count > 0 && (
                        <>
                          <div className="w-px h-3.5 bg-border-light" />
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {row.invoice_count} inv
                          </Badge>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
