"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  ChevronRight,
  Loader2,
  AlertCircle,
  IndianRupee,
  ShoppingCart,
  CircleCheck,
  Clock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getAllBranches,
  getStudentCountForBranch,
  getBatchCountForBranch,
  getInstructorCountForBranch,
  getTotalStudentCount,
  getTotalStaffCount,
  getTotalInvoiceStats,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ── Branch card with live stats ──
function BranchCard({ branch }: { branch: { name: string; company_name: string; abbr: string } }) {
  const { data: studentCount, isLoading: loadingStudents } = useQuery({
    queryKey: ["director-branch-students", branch.name],
    queryFn: () => getStudentCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: batchCount, isLoading: loadingBatches } = useQuery({
    queryKey: ["director-branch-batches", branch.name],
    queryFn: () => getBatchCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: instructorCount, isLoading: loadingInstructors } = useQuery({
    queryKey: ["director-branch-instructors", branch.name],
    queryFn: () => getInstructorCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}`}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">{shortName}</h3>
                  <p className="text-xs text-text-tertiary">{branch.abbr}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {loadingStudents ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    studentCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Students</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-3.5 w-3.5 text-secondary" />
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {loadingBatches ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    batchCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Batches</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <UserCheck className="h-3.5 w-3.5 text-info" />
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {loadingInstructors ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    instructorCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Main Director Dashboard ──
export default function DirectorDashboard() {
  const { user } = useAuth();

  const {
    data: branches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Filter out the parent "Smart Up" company (HQ) if it has no students
  const activeBranches = (branches ?? []).filter(
    (b) => b.name !== "Smart Up"
  );

  // Summary stats
  const totalBranches = activeBranches.length;

  // Dynamic total counts
  const { data: totalStudents, isLoading: loadTotalStudents } = useQuery({
    queryKey: ["director-total-students"],
    queryFn: getTotalStudentCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: totalStaff, isLoading: loadTotalStaff } = useQuery({
    queryKey: ["director-total-staff"],
    queryFn: getTotalStaffCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: invoiceStats, isLoading: loadInvoiceStats } = useQuery({
    queryKey: ["director-total-invoices"],
    queryFn: getTotalInvoiceStats,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome, {user?.full_name?.split(" ")[0] || "Director"}
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Overview of all your branches and operations
            </p>
          </div>
          <Badge variant="default" className="self-start px-3 py-1 text-sm">
            Director
          </Badge>
        </div>
      </motion.div>

      {/* Summary Stats — Clickable Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Link href="/dashboard/director/students">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadTotalStudents ? "..." : (totalStudents ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-text-tertiary">Total Students</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/director/teachers">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 text-info mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadTotalStaff ? "..." : (totalStaff ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-text-tertiary">Total Staff</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/director/fees">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadInvoiceStats ? "..." : formatCurrency(invoiceStats?.totalInvoiced ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Total Billed</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/director/fees">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-success/30 border-success/20">
            <CardContent className="p-4 text-center">
              <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">
                {loadInvoiceStats ? "..." : formatCurrency(invoiceStats?.totalCollected ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Collected</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/director/fees">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-error/30 border-error/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-error mx-auto mb-2" />
              <p className="text-2xl font-bold text-error">
                {loadInvoiceStats ? "..." : formatCurrency(invoiceStats?.totalOutstanding ?? 0)}
              </p>
              <p className="text-xs text-text-tertiary">Pending Fees</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Branches Grid */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">All Branches</h2>
          <Badge variant="outline" className="text-xs">
            {totalBranches} branches
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load branches</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {activeBranches.map((branch) => (
              <BranchCard key={branch.name} branch={branch} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
