"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap,
  ClipboardCheck,
  IndianRupee,
  AlertCircle,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  TrendingUp,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_PARENT,
  DEMO_CHILDREN,
  DEMO_ATTENDANCE,
  DEMO_FEES,
  formatCurrency,
  getAttendanceStats,
  getOverallAvgPercent,
  getPerformanceRating,
  getExamsForStudent,
} from "./demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoParentDashboardPage() {
  // Aggregate attendance
  const allAttendance = Object.values(DEMO_ATTENDANCE).flat();
  const stats = getAttendanceStats(allAttendance);

  // Aggregate fees
  const totalFees = DEMO_FEES.reduce((s, f) => s + f.totalFee, 0);
  const totalPaid = DEMO_FEES.reduce((s, f) => s + f.totalPaid, 0);
  const outstanding = totalFees - totalPaid;

  // Next due: find earliest overdue/upcoming instalment
  const allInstalments = DEMO_FEES.flatMap((f) => f.instalments);
  const nextDue = allInstalments.find(
    (inst) => inst.status === "overdue" || inst.status === "partially-paid"
  );
  const isOverdue = nextDue?.status === "overdue";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">{DEMO_PARENT.name.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s an overview of your child&apos;s academic progress and fees
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Child Enrolled"
          value={DEMO_CHILDREN.length}
          icon={<GraduationCap className="h-5 w-5" />}
          color="primary"
          href="/demo/parent/children"
        />
        <StatsCard
          title="Attendance (This Month)"
          value={`${stats.pct}%`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color={stats.pct >= 75 ? "success" : "warning"}
          href="/demo/parent/attendance"
        />
        <StatsCard
          title="Total Fees"
          value={formatCurrency(totalFees)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="info"
          href="/demo/parent/fees"
        />
        <StatsCard
          title="Outstanding"
          value={outstanding > 0 ? formatCurrency(outstanding) : "All Paid"}
          icon={<AlertCircle className="h-5 w-5" />}
          color={outstanding > 0 ? "error" : "success"}
          href="/demo/parent/fees"
        />
      </motion.div>

      {/* Next Payment Due */}
      {nextDue && (
        <motion.div variants={item}>
          <Link href="/demo/parent/fees" className="block">
            <div
              className={`rounded-[14px] border p-4 flex items-center justify-between gap-4 transition-colors hover:shadow-sm ${
                isOverdue
                  ? "bg-error-light border-error/20"
                  : "bg-warning-light border-warning/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOverdue ? "bg-error/10" : "bg-warning/10"}`}>
                  {isOverdue ? <AlertCircle className="h-5 w-5 text-error" /> : <Clock className="h-5 w-5 text-warning" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {isOverdue ? "Payment Overdue" : "Next Payment Due"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(nextDue.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-text-primary">
                  {formatCurrency(nextDue.amount - nextDue.paid)}
                </p>
                <span className="text-xs text-primary font-medium">View Details →</span>
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
                My Child
              </CardTitle>
              <Link href="/demo/parent/children" className="text-sm text-primary hover:underline">
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_CHILDREN.map((child) => {
                const childFee = DEMO_FEES.find((f) => f.studentId === child.id);
                const childOutstanding = childFee ? childFee.totalFee - childFee.totalPaid : 0;

                return (
                  <div
                    key={child.id}
                    className="flex items-center gap-4 p-4 rounded-[10px] border border-border-light bg-app-bg hover:bg-brand-wash/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{child.name}</p>
                      <p className="text-xs text-text-secondary">
                        {child.class} • {child.branch.replace("Smart Up ", "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {child.isSibling && <Badge variant="default">Sibling</Badge>}
                      {childOutstanding > 0 && (
                        <Badge variant="error">Due {formatCurrency(childOutstanding)}</Badge>
                      )}
                      <Badge variant="info">{child.batch}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
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
                <Link href="/demo/parent/attendance" className="text-sm text-primary hover:underline">
                  Details →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-text-primary">{stats.present} Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-error" />
                    <span className="text-sm font-medium text-text-primary">{stats.absent} Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-text-primary">{stats.late} Late</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Attendance Rate</span>
                    <span className="font-semibold">{stats.pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stats.pct >= 75 ? "bg-success" : "bg-warning"}`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allAttendance.slice(0, 7).map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border-light last:border-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                        <span className="text-text-secondary">
                          {new Date(record.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" })}
                        </span>
                      </div>
                      <Badge variant={record.status === "Present" ? "success" : record.status === "Absent" ? "error" : "warning"}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
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
                <Link href="/demo/parent/fees" className="text-sm text-primary hover:underline">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-success-light rounded-[10px] p-3 text-center">
                    <p className="text-xs text-text-secondary">Paid</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="bg-error-light rounded-[10px] p-3 text-center">
                    <p className="text-xs text-text-secondary">Pending</p>
                    <p className="text-lg font-bold text-error">{formatCurrency(outstanding)}</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {DEMO_FEES.map((fee) => {
                    const childName = DEMO_CHILDREN.find((c) => c.id === fee.studentId)?.name ?? "";
                    const feeOutstanding = fee.totalFee - fee.totalPaid;
                    return (
                      <div key={fee.orderId} className="flex items-center justify-between p-3 rounded-[10px] border border-border-light bg-app-bg">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{childName}</p>
                          <p className="text-xs text-text-secondary">{fee.orderId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(fee.totalFee)}</p>
                          <Badge variant={feeOutstanding > 0 ? "error" : "success"}>
                            {feeOutstanding > 0 ? `Due: ${formatCurrency(feeOutstanding)}` : "Paid"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Overview */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Overview
              </CardTitle>
              <Link href="/demo/parent/performance" className="text-sm text-primary hover:underline">
                Full Report →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEMO_CHILDREN.map((child) => {
                const examAvg = getOverallAvgPercent(child.id);
                const childAtt = DEMO_ATTENDANCE[child.id] ?? [];
                const childAttStats = getAttendanceStats(childAtt);
                const perf = getPerformanceRating(childAttStats.pct, examAvg);
                const latestExam = getExamsForStudent(child.id).slice(-1)[0];

                return (
                  <div key={child.id} className="bg-app-bg rounded-[10px] p-4 border border-border-light space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-text-primary">{child.name}</p>
                      <span className={`text-sm font-bold ${perf.color}`}>{perf.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <Award className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-lg font-bold text-text-primary">{examAvg}%</p>
                        <p className="text-[10px] text-text-tertiary">Exam Avg</p>
                      </div>
                      <div className="text-center">
                        <ClipboardCheck className="h-4 w-4 text-success mx-auto mb-1" />
                        <p className="text-lg font-bold text-text-primary">{childAttStats.pct}%</p>
                        <p className="text-[10px] text-text-tertiary">Attendance</p>
                      </div>
                    </div>
                    {latestExam && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border-light">
                        <span className="text-text-tertiary">Latest: {latestExam.name}</span>
                        <Badge variant={latestExam.percentage >= 70 ? "success" : latestExam.percentage >= 50 ? "warning" : "error"}>
                          {latestExam.percentage}% ({latestExam.grade})
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Info */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {DEMO_CHILDREN.map((child) => (
                <div key={child.id} className="bg-app-bg rounded-[10px] p-4 border border-border-light space-y-2">
                  <p className="font-semibold text-text-primary">{child.name}</p>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Class</span>
                    <span className="font-medium text-text-primary">{child.class}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Branch</span>
                    <span className="font-medium text-text-primary">{child.branch.replace("Smart Up ", "")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Batch</span>
                    <span className="font-medium text-text-primary">{child.batch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Fee Plan</span>
                    <span className="font-medium text-text-primary">{child.feePlan}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
