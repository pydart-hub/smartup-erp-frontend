"use client";

import React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDuesTodayByClass } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function DuesClassPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const shortName = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  const { data: classes, isLoading, isError } = useQuery({
    queryKey: ["director-dues-classes", branch, asOf],
    queryFn: () => getDuesTodayByClass(branch, asOf),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const totalDues = (classes ?? []).reduce((s, c) => s + c.total_dues, 0);
  const totalStudents = (classes ?? []).reduce((s, c) => s + c.student_count, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link href={`/dashboard/director/dues${childQs}`} className="text-text-tertiary hover:text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{shortName} — Dues</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Class-wise overdue breakdown
          </p>
        </div>
      </motion.div>

      {/* Summary card */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Branch Overdue</p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : totalStudents}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Class rows */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load dues</p>
        </div>
      ) : !classes?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue dues for this branch!</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {classes.map((cls) => {
            const displayName = cls.item_code.replace(" Tuition Fee", "");
            return (
              <motion.div key={cls.item_code} variants={itemVariants}>
                <Link
                  href={`/dashboard/director/dues/${encodeURIComponent(branch)}/${encodeURIComponent(cls.item_code)}${childQs}`}
                >
                  <div className="flex items-center gap-3 p-4 rounded-[10px] border border-border-light hover:border-orange-300/50 hover:shadow-sm transition-all cursor-pointer bg-surface">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{displayName}</p>
                      <p className="text-xs text-text-tertiary">
                        {cls.student_count} student{cls.student_count !== 1 ? "s" : ""} with overdue
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(cls.total_dues)}
                      </p>
                      <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200">
                        {cls.invoice_count} invoice{cls.invoice_count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
