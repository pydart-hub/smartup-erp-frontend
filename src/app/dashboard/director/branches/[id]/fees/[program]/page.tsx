"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  CircleCheck,
  Clock,
  TriangleAlert,
  Loader2,
  AlertCircle,
  Search,
  UserX,
  Star,
  Banknote,
  Wifi,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getBranchProgramStudentFees } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function ProgramStudentFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const programName = decodeURIComponent(params.program as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [search, setSearch] = useState("");

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-program-student-fees", branchName, programName],
    queryFn: () => getBranchProgramStudentFees(branchName, programName),
    staleTime: 120_000,
  });

  const filtered = (students ?? []).filter((s) =>
    !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  // Summary totals
  const totalFees = filtered.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const totalCollected = filtered.reduce((sum, s) => sum + s.totalCollected, 0);
  const totalPending = filtered.reduce((sum, s) => sum + s.totalOutstanding, 0);
  const discontinuedCount = filtered.filter((s) => s.enabled === 0).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <motion.div variants={itemVariants}>
        <Link
          href={`/dashboard/director/branches/${encodedBranch}/fees`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {shortName} Fees
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{programName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {shortName} · Student-wise fee details
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">{branchName}</Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {!isLoading && !isError && (students?.length ?? 0) > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalFees)}</p>
              <p className="text-xs text-text-tertiary">Total Fees</p>
            </CardContent>
          </Card>
          <Card className="border-success/20">
            <CardContent className="p-4 text-center">
              <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-text-tertiary">Collected</p>
            </CardContent>
          </Card>
          <Card className="border-error/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-error mx-auto mb-2" />
              <p className="text-2xl font-bold text-error">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-text-tertiary">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
              <p className="text-xs text-text-tertiary">Students</p>
              {discontinuedCount > 0 && (
                <p className="text-[10px] text-amber-500 mt-1">{discontinuedCount} discontinued</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search */}
      <motion.div variants={itemVariants} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </motion.div>

      {/* Student List */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load student fee details</p>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Users className="h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-tertiary">
              {search ? "No students match your search" : "No students found for this class"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((student) => {
              const pending = student.totalOutstanding;
              const isDiscontinued = student.enabled === 0;
              return (
                <motion.div
                  key={student.studentId}
                  variants={itemVariants}
                  className={`flex items-center gap-3 p-3 rounded-[10px] border bg-surface transition-colors ${
                    isDiscontinued
                      ? "border-amber-200/60 opacity-75"
                      : "border-border-light"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isDiscontinued ? "bg-amber-50" : "bg-brand-wash"
                  }`}>
                    {isDiscontinued ? (
                      <UserX className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{student.studentName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-text-tertiary truncate">{student.studentId}</p>
                      {isDiscontinued && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                          Discontinued
                        </Badge>
                      )}
                      {student.paymentMode && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                            student.paymentMode === "Online"
                              ? "border-blue-300 text-blue-600"
                              : "border-green-300 text-green-600"
                          }`}
                        >
                          {student.paymentMode === "Online" ? (
                            <Wifi className="h-2.5 w-2.5" />
                          ) : (
                            <Banknote className="h-2.5 w-2.5" />
                          )}
                          {student.paymentMode}
                        </Badge>
                      )}
                      {student.feePlan && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                            student.feePlan === "Advanced"
                              ? "border-indigo-300 text-indigo-600"
                              : "border-gray-300 text-gray-500"
                          }`}
                        >
                          {student.feePlan === "Advanced" && (
                            <Star className="h-2.5 w-2.5" />
                          )}
                          {student.feePlan}
                        </Badge>
                      )}
                      {!isDiscontinued && student.totalOutstanding === 0 && student.totalInvoiced > 0 && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <CircleCheck className="h-2.5 w-2.5" /> Fully Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(student.totalInvoiced)}</p>
                      <p className="text-[10px] text-text-tertiary">total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatCurrency(student.totalCollected)}</p>
                      <p className="text-[10px] text-success/70 flex items-center justify-end gap-0.5">
                        <CircleCheck className="h-2.5 w-2.5" /> paid
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${pending > 0 ? (isDiscontinued ? "text-amber-600" : "text-error") : "text-text-tertiary"}`}>
                        {formatCurrency(pending)}
                      </p>
                      <p className={`text-[10px] flex items-center justify-end gap-0.5 ${
                        pending > 0 ? (isDiscontinued ? "text-amber-500/70" : "text-error/70") : "text-text-tertiary"
                      }`}>
                        {pending > 0 ? (
                          isDiscontinued ? (
                            <><TriangleAlert className="h-2.5 w-2.5" /> forfeited</>
                          ) : (
                            <><Clock className="h-2.5 w-2.5" /> pending</>
                          )
                        ) : (
                          "cleared"
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
