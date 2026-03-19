"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  CalendarDays,
  ClipboardCheck,
  IndianRupee,
  ShoppingCart,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getStudentCountForBranch,
  getBatchCountForBranch,
  getInstructorCountForBranch,
  getScheduleCountForBranch,
  getBranchBatches,
  getBranchSalesSummary,
  getBranchInvoiceStats,
  getDuesTodayByClass,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface QuickNavItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

export default function BranchDetailPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  // ── Stats queries ──
  const { data: studentCount, isLoading: loadStudents } = useQuery({
    queryKey: ["director-branch-students", branchName],
    queryFn: () => getStudentCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: batchCount, isLoading: loadBatches } = useQuery({
    queryKey: ["director-branch-batches", branchName],
    queryFn: () => getBatchCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: instructorCount, isLoading: loadInstructors } = useQuery({
    queryKey: ["director-branch-instructors", branchName],
    queryFn: () => getInstructorCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: scheduleCount, isLoading: loadSchedules } = useQuery({
    queryKey: ["director-branch-schedules", branchName],
    queryFn: () => getScheduleCountForBranch(branchName),
    staleTime: 120_000,
  });

  // ── Batch overview ──
  const { data: batchesRes, isLoading: loadBatchList } = useQuery({
    queryKey: ["director-branch-batch-list", branchName],
    queryFn: () => getBranchBatches(branchName),
    staleTime: 120_000,
  });

  // ── Sales summary ──
  const { data: salesStats, isLoading: loadSales } = useQuery({
    queryKey: ["director-branch-sales-summary", branchName],
    queryFn: () => getBranchSalesSummary(branchName),
    staleTime: 120_000,
  });

  // ── Invoice / collection stats ──
  const { data: invoiceStats, isLoading: loadInvoices } = useQuery({
    queryKey: ["director-branch-invoice-stats", branchName],
    queryFn: () => getBranchInvoiceStats(branchName),
    staleTime: 120_000,
  });

  // ── Dues Till Today ──
  const { data: dueClasses, isLoading: loadDues } = useQuery({
    queryKey: ["director-dues-classes", branchName],
    queryFn: () => getDuesTodayByClass(branchName),
    staleTime: 30_000,
  });

  const duesToday = (dueClasses ?? []).reduce((s, c) => s + c.total_dues, 0);

  const batches = batchesRes?.data ?? [];
  const activeBatches = batches.filter((b) => !b.disabled);

  // Group batches by program
  const batchesByProgram = activeBatches.reduce(
    (acc, b) => {
      const key = b.program || "Uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    },
    {} as Record<string, typeof activeBatches>
  );

  // Sales stats
  const totalRevenue = salesStats?.totalRevenue ?? 0;

  // Quick navigation items
  const quickNavItems: QuickNavItem[] = [
    {
      label: "Students",
      description: `${studentCount ?? "..."} students enrolled`,
      href: `/dashboard/director/branches/${encodedBranch}/students`,
      icon: <GraduationCap className="h-5 w-5" />,
      color: "text-primary",
    },
    {
      label: "Batches & Classes",
      description: `${batchCount ?? "..."} active batches`,
      href: `/dashboard/director/branches/${encodedBranch}/batches`,
      icon: <Users className="h-5 w-5" />,
      color: "text-secondary",
    },
    {
      label: "Course Schedule",
      description: `${scheduleCount ?? "..."} scheduled classes`,
      href: `/dashboard/director/branches/${encodedBranch}/course-schedule`,
      icon: <CalendarDays className="h-5 w-5" />,
      color: "text-info",
    },
    {
      label: "Teachers & Staff",
      description: `${instructorCount ?? "..."} active staff`,
      href: `/dashboard/director/branches/${encodedBranch}/teachers`,
      icon: <UserCheck className="h-5 w-5" />,
      color: "text-success",
    },
    {
      label: "Attendance",
      description: "View attendance records",
      href: `/dashboard/director/branches/${encodedBranch}/attendance`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: "text-warning",
    },
    {
      label: "Fees & Revenue",
      description: "Fee schedules & collections",
      href: `/dashboard/director/branches/${encodedBranch}/fees`,
      icon: <IndianRupee className="h-5 w-5" />,
      color: "text-warning",
    },
    {
      label: "Sales Orders",
      description: `${salesStats?.count ?? "..."} orders`,
      href: `/dashboard/director/branches/${encodedBranch}/sales-orders`,
      icon: <ShoppingCart className="h-5 w-5" />,
      color: "text-error",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back + Header */}
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/director"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Branches
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-11 h-11 rounded-[10px] bg-brand-wash flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{shortName}</h1>
            <p className="text-sm text-text-tertiary">{branchName}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards — Clickable */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Link href={`/dashboard/director/branches/${encodedBranch}/students`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadStudents ? "…" : (studentCount ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Students</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/director/branches/${encodedBranch}/batches`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-secondary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadBatches ? "…" : (batchCount ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Batches</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/director/branches/${encodedBranch}/teachers`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 text-info mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadInstructors ? "…" : (instructorCount ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Staff</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/director/branches/${encodedBranch}/fees`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadSales ? "…" : formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-text-tertiary">Total Revenue</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/director/dues/${encodedBranch}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-orange-200/60 hover:border-orange-300">
            <CardContent className="p-4 text-center">
              <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <p className={`text-2xl font-bold ${duesToday > 0 ? "text-orange-600" : "text-text-primary"}`}>
                {loadDues ? "…" : formatCurrency(duesToday)}
              </p>
              <p className="text-xs text-text-tertiary">Dues Today</p>
              <ChevronRight className="h-3.5 w-3.5 text-orange-400 mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Quick Navigation Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`${item.color} shrink-0`}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{item.label}</p>
                    <p className="text-xs text-text-tertiary truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Batch Overview by Program */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Batches by Program</CardTitle>
              <Link href={`/dashboard/director/branches/${encodedBranch}/batches`}>
                <Button variant="outline" size="sm">
                  View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadBatchList ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="animate-spin h-5 w-5 text-primary" />
              </div>
            ) : Object.keys(batchesByProgram).length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-6">No batches found</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(batchesByProgram)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([program, groups]) => (
                    <div key={program}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-text-primary">{program}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {groups.length} batch{groups.length !== 1 ? "es" : ""}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {groups.map((g) => (
                          <Link
                            key={g.name}
                            href={`/dashboard/director/branches/${encodedBranch}/batches/${encodeURIComponent(g.name)}`}
                          >
                            <Badge
                              variant="default"
                              className="cursor-pointer hover:bg-primary hover:text-white transition-colors text-xs px-2 py-1"
                            >
                              {g.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial Summary */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Financial Summary</CardTitle>
              <Link href={`/dashboard/director/branches/${encodedBranch}/fees`}>
                <Button variant="outline" size="sm">
                  View Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(loadSales || loadInvoices) ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="animate-spin h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Sales Revenue</p>
                  <p className="text-xl font-bold text-text-primary">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Total Invoiced</p>
                  <p className="text-xl font-bold text-text-primary">{formatCurrency(invoiceStats?.totalInvoiced ?? 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Collected</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(invoiceStats?.totalCollected ?? 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Pending</p>
                  <p className="text-xl font-bold text-error">{formatCurrency(invoiceStats?.totalOutstanding ?? 0)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
