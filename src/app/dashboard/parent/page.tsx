"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  ClipboardCheck,
  IndianRupee,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";

// ── Types matching the actual Frappe fields ────────────────────
export interface ChildInfo {
  name: string;           // Student ID e.g. "STU-SU CHL-26-55555"
  student_name: string;
  first_name: string;
  custom_branch: string;  // Company name e.g. "Smart Up Chullickal"
  custom_branch_abbr: string;
  custom_srr_id: string;
  customer: string;       // linked Customer name
  student_email_id: string;
  student_mobile_number: string;
  custom_parent_name: string;
  joining_date: string;
  enabled: number;
  custom_sibling_of?: string;
  custom_sibling_group?: string;
  custom_sibling_discount_applied?: 0 | 1;
}

export interface EnrollmentInfo {
  name: string;
  student: string;
  student_name: string;
  program: string;           // e.g. "10th Grade"
  custom_program_abb: string;
  academic_year: string;
  student_batch_name: string; // e.g. "CHL-25"
  enrollment_date: string;
  custom_fee_structure?: string | null;
  custom_plan?: string | null;
  custom_no_of_instalments?: string | null;
}

export interface AttendanceRecord {
  name: string;
  status: "Present" | "Absent" | "Late";
  attendance_date: string;
}

export interface FeeEntry {
  name: string;
  posting_date: string;
  due_date?: string;
  grand_total: number;
  outstanding_amount: number;
  fee_structure?: string;
  program?: string;
  student_name?: string;
}

export interface SalesInvoiceEntry {
  name: string;
  posting_date: string;
  due_date?: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  customer_name?: string;
}

export interface SalesOrderEntry {
  name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  per_billed?: number;
  advance_paid?: number;
  custom_academic_year?: string;
  student?: string;
  custom_no_of_instalments?: string;
  custom_plan?: string;
}

export interface FeeStructureEntry {
  name: string;
  program: string;
  academic_year: string;
  total_amount: number;
  company?: string;
  custom_plan?: string;
  custom_no_of_instalments?: string;
  components?: { fees_category: string; amount: number; total?: number }[];
}

export interface PaymentEntryRecord {
  name: string;
  posting_date: string;
  paid_amount: number;
  mode_of_payment: string;
  reference_no?: string;
  party_name?: string;
}

export interface ParentData {
  guardian: { name: string; guardian_name: string; email_address: string; mobile_number: string } | null;
  children: ChildInfo[];
  enrollments: Record<string, EnrollmentInfo[]>;
  attendance: Record<string, AttendanceRecord[]>;
  fees: Record<string, FeeEntry[]>;
  salesOrders: Record<string, SalesOrderEntry[]>;
  salesInvoices: Record<string, SalesInvoiceEntry[]>;
  feeStructures: Record<string, FeeStructureEntry[]>;
  paymentEntries: Record<string, PaymentEntryRecord[]>;
}

// ── Helpers ─────────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Get the latest enrollment for a child (program, batch, year) */
export function getLatestEnrollment(
  data: ParentData | undefined,
  studentId: string
): EnrollmentInfo | undefined {
  return (data?.enrollments?.[studentId] ?? [])[0];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ── Hook: fetch all parent data via admin-backed API ────────────
export function useParentData(email?: string) {
  return useQuery<ParentData>({
    queryKey: ["parent-data", email],
    queryFn: async () => {
      const res = await fetch("/api/parent/data", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parent data");
      return res.json();
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

// ── Component ───────────────────────────────────────────────────
export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);

  const children = data?.children ?? [];

  // Aggregate attendance across all children
  const allAttendance = Object.values(data?.attendance ?? {}).flat() as AttendanceRecord[];
  const presentDays = allAttendance.filter((a) => a.status === "Present").length;
  const absentDays = allAttendance.filter((a) => a.status === "Absent").length;
  const lateDays = allAttendance.filter((a) => a.status === "Late").length;
  const attendancePct = allAttendance.length > 0
    ? Math.round((presentDays / allAttendance.length) * 100)
    : 0;

  // Aggregate fees: prefer Sales Invoices, fall back to Fees doctype
  const allInvoices = Object.values(data?.salesInvoices ?? {}).flat() as SalesInvoiceEntry[];
  const allFees = Object.values(data?.fees ?? {}).flat() as FeeEntry[];
  const allSOs = Object.values(data?.salesOrders ?? {}).flat() as SalesOrderEntry[];

  // Sales Invoices = billed fees
  const totalInvoiced = allInvoices.reduce((s, i) => s + i.grand_total, 0);
  const totalInvOutstanding = allInvoices.reduce((s, i) => s + i.outstanding_amount, 0);

  // Sales Orders = ordered/expected fees (grand_total may be 0 if item price wasn't set)
  const totalSO = allSOs.reduce((s, so) => s + so.grand_total, 0);

  // Fees doctype records
  const totalFeesDoc = allFees.reduce((s, f) => s + f.grand_total, 0);
  const totalFeesOutstanding = allFees.reduce((s, f) => s + f.outstanding_amount, 0);

  // Choose best data source: Invoices > Fees > Sales Orders
  let displayTotalFees: number;
  let displayOutstanding: number;
  if (totalInvoiced > 0) {
    displayTotalFees = totalInvoiced;
    displayOutstanding = totalInvOutstanding;
  } else if (totalFeesDoc > 0) {
    displayTotalFees = totalFeesDoc;
    displayOutstanding = totalFeesOutstanding;
  } else {
    // Sales Orders exist but no invoices — full amount is outstanding
    displayTotalFees = totalSO;
    displayOutstanding = totalSO;
  }
  const displayPaid = displayTotalFees - displayOutstanding;

  // Next due invoice: earliest outstanding invoice across all children
  const todayStr = new Date().toISOString().split("T")[0];
  const nextDueInvoice = allInvoices
    .filter((inv) => inv.outstanding_amount > 0)
    .sort((a, b) => (a.due_date ?? a.posting_date).localeCompare(b.due_date ?? b.posting_date))[0] as
    | SalesInvoiceEntry
    | undefined;
  const nextDueIsOverdue = nextDueInvoice?.due_date
    ? nextDueInvoice.due_date < todayStr
    : false;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {user?.full_name?.split(" ")[0] || "Parent"} 👋
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s an overview of your child&apos;s academic progress and fees
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Children Enrolled"
          value={children.length}
          icon={<GraduationCap className="h-5 w-5" />}
          color="primary"
          loading={isLoading}
          href="/dashboard/parent/children"
        />
        <StatsCard
          title="Attendance (This Month)"
          value={allAttendance.length > 0 ? `${attendancePct}%` : "No data"}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color={attendancePct >= 75 ? "success" : "warning"}
          loading={isLoading}
          href="/dashboard/parent/attendance"
        />
        <StatsCard
          title="Total Fees"
          value={displayTotalFees > 0 ? formatCurrency(displayTotalFees) : "—"}
          icon={<IndianRupee className="h-5 w-5" />}
          color="info"
          loading={isLoading}
          href="/dashboard/parent/fees"
        />
        <StatsCard
          title="Outstanding"
          value={displayOutstanding > 0 ? formatCurrency(displayOutstanding) : displayTotalFees > 0 ? "All Paid" : "—"}
          icon={<AlertCircle className="h-5 w-5" />}
          color={displayOutstanding > 0 ? "error" : "success"}
          loading={isLoading}
          href="/dashboard/parent/fees"
        />
      </motion.div>

      {/* Next Payment Due */}
      {nextDueInvoice && !isLoading && (
        <motion.div variants={item}>
          <Link href="/dashboard/parent/fees" className="block">
            <div
              className={`rounded-[14px] border p-4 flex items-center justify-between gap-4 transition-colors hover:shadow-sm ${
                nextDueIsOverdue
                  ? "bg-error-light border-error/20"
                  : "bg-warning-light border-warning/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    nextDueIsOverdue ? "bg-error/10" : "bg-warning/10"
                  }`}
                >
                  {nextDueIsOverdue ? (
                    <AlertCircle className="h-5 w-5 text-error" />
                  ) : (
                    <Clock className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {nextDueIsOverdue ? "Payment Overdue" : "Next Payment Due"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {nextDueInvoice.due_date
                      ? new Date(nextDueInvoice.due_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : nextDueInvoice.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-text-primary">
                  {formatCurrency(nextDueInvoice.outstanding_amount)}
                </p>
                <span className="text-xs text-primary font-medium">Pay Now →</span>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Children Cards */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                My Children
              </CardTitle>
              <Link href="/dashboard/parent/children" className="text-sm text-primary hover:underline">
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-border-light rounded-[10px] animate-pulse" />
                ))}
              </div>
            ) : children.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">
                No children linked to your account yet.
              </p>
            ) : (
              <div className="space-y-3">
                {children.map((child) => {
                  const enrollment = getLatestEnrollment(data, child.name);
                  const childInvoices = (data?.salesInvoices?.[child.name] ?? []) as SalesInvoiceEntry[];
                  const childFees = (data?.fees?.[child.name] ?? []) as FeeEntry[];
                  const feeSource = childInvoices.length > 0 ? childInvoices : childFees;
                  const outstanding = feeSource.reduce((s, f) => s + f.outstanding_amount, 0);

                  return (
                    <div
                      key={child.name}
                      className="flex items-center gap-4 p-4 rounded-[10px] border border-border-light bg-app-bg hover:bg-brand-wash/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {child.student_name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {[
                            enrollment?.program,
                            child.custom_branch?.replace("Smart Up ", ""),
                          ]
                            .filter(Boolean)
                            .join(" • ") || child.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.custom_sibling_group && (
                          <Badge variant="default">Sibling</Badge>
                        )}
                        {outstanding > 0 && (
                          <Badge variant="error">Due {formatCurrency(outstanding)}</Badge>
                        )}
                        {enrollment?.student_batch_name && (
                          <Badge variant="info">{enrollment.student_batch_name}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance + Fee Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Attendance This Month
                </CardTitle>
                <Link href="/dashboard/parent/attendance" className="text-sm text-primary hover:underline">
                  Details →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-border-light rounded-[10px] animate-pulse" />
                  ))}
                </div>
              ) : allAttendance.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">
                  No attendance records this month.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-text-primary">{presentDays} Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-error" />
                      <span className="text-sm font-medium text-text-primary">{absentDays} Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium text-text-primary">{lateDays} Late</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Attendance Rate</span>
                      <span className="font-semibold">{attendancePct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${attendancePct >= 75 ? "bg-success" : "bg-warning"}`}
                        style={{ width: `${attendancePct}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allAttendance.slice(0, 7).map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border-light last:border-0">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">
                            {new Date(record.attendance_date).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", weekday: "short",
                            })}
                          </span>
                        </div>
                        <Badge variant={record.status === "Present" ? "success" : record.status === "Absent" ? "error" : "warning"}>
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Fee Status */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Fee Status
                </CardTitle>
                <Link href="/dashboard/parent/fees" className="text-sm text-primary hover:underline">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-border-light rounded-[10px] animate-pulse" />
                  ))}
                </div>
              ) : displayTotalFees === 0 && allSOs.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">
                  No fee records found.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-success-light rounded-[10px] p-3 text-center">
                      <p className="text-xs text-text-secondary">Paid</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(displayPaid)}</p>
                    </div>
                    <div className="bg-error-light rounded-[10px] p-3 text-center">
                      <p className="text-xs text-text-secondary">Pending</p>
                      <p className="text-lg font-bold text-error">{formatCurrency(displayOutstanding)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {/* Show invoices first, then fees, then SOs */}
                    {(allInvoices.length > 0
                      ? allInvoices
                      : allFees.length > 0
                      ? allFees
                      : allSOs.map((so) => ({
                          name: so.name,
                          posting_date: so.transaction_date,
                          due_date: undefined as string | undefined,
                          grand_total: so.grand_total,
                          outstanding_amount: so.grand_total, // SO = fully outstanding
                          status: so.status,
                        }))
                    )
                      .slice(0, 5)
                      .map((entry) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const due = (entry as { due_date?: string }).due_date;
                        const isOverdue = !!due && due < todayStr && entry.outstanding_amount > 0;
                        const isDueToday = !!due && due === todayStr && entry.outstanding_amount > 0;
                        return (
                        <div key={entry.name} className="flex items-center justify-between p-3 rounded-[10px] border border-border-light bg-app-bg">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{entry.name}</p>
                            <p className="text-xs text-text-secondary">
                              {new Date(entry.posting_date).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </p>
                            {due && (
                              <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                                isOverdue ? "text-error font-semibold" : isDueToday ? "text-warning font-semibold" : "text-text-tertiary"
                              }`}>
                                <Clock className="h-3 w-3 shrink-0" />
                                Due: {new Date(due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                {isOverdue && " · Overdue"}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-text-primary">
                              {entry.grand_total > 0 ? formatCurrency(entry.grand_total) : "—"}
                            </p>
                            <Badge variant={entry.outstanding_amount > 0 ? "error" : "success"}>
                              {entry.outstanding_amount > 0 ? `Due: ${formatCurrency(entry.outstanding_amount)}` : "Paid"}
                            </Badge>
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Info — from Program Enrollment, not Student */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">—</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {children.map((child) => {
                  const enrollment = getLatestEnrollment(data, child.name);
                  return (
                    <div key={child.name} className="bg-app-bg rounded-[10px] p-4 border border-border-light space-y-2">
                      <p className="font-semibold text-text-primary">{child.student_name}</p>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Class</span>
                        <span className="font-medium text-text-primary">{enrollment?.program || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Branch</span>
                        <span className="font-medium text-text-primary">{child.custom_branch?.replace("Smart Up ", "") || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Batch</span>
                        <span className="font-medium text-text-primary">{enrollment?.student_batch_name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Academic Year</span>
                        <span className="font-medium text-text-primary">{enrollment?.academic_year || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Fee Plan</span>
                        <span className="font-medium text-text-primary">{enrollment?.custom_plan || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Instalments</span>
                        <span className="font-medium text-text-primary">{enrollment?.custom_no_of_instalments ? `${enrollment.custom_no_of_instalments}x` : "—"}</span>
                      </div>
                      {enrollment?.custom_fee_structure && (
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">Fee Structure</span>
                          <span className="font-medium text-text-primary text-xs text-right">{enrollment.custom_fee_structure}</span>
                        </div>
                      )}
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
