"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap,
  ClipboardCheck,
  IndianRupee,
  Users,
  UserPlus,
  CalendarDays,
  School,
  TrendingUp,
  MessageSquareWarning,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_MANAGER,
  DEMO_STUDENTS,
  DEMO_BATCHES,
  DEMO_STAFF,
  DEMO_FEE_COLLECTION,
  DEMO_RECENT_PAYMENTS,
  DEMO_TODAY_ATTENDANCE,
  DEMO_BM_COMPLAINTS,
  DEMO_RECENT_ACTIVITY,
  formatCurrency,
} from "./demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBranchManagerDashboardPage() {
  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled).length;
  const staffPresent = DEMO_STAFF.filter((s) => s.presentToday).length;
  const totalAttToday = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.present, 0);
  const totalStudentsToday = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.total, 0);
  const openComplaints = DEMO_BM_COMPLAINTS.filter((c) => c.status === "Open" || c.status === "In Review").length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">{DEMO_MANAGER.name.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening at your branch today.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <Badge variant="default" className="px-3 py-1 text-sm">Branch Manager</Badge>
          <span className="text-xs text-text-tertiary">{DEMO_MANAGER.branch.replace("Smart Up ", "")}</span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={activeStudents}
          icon={<GraduationCap className="h-5 w-5" />}
          color="primary"
          href="/demo/branch-manager/students"
        />
        <StatsCard
          title="Student Attendance"
          value={`${totalAttToday}/${totalStudentsToday}`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="info"
          trend={{ value: totalStudentsToday > 0 ? Math.round((totalAttToday / totalStudentsToday) * 100) : 0, label: "present" }}
          href="/demo/branch-manager/attendance"
        />
        <StatsCard
          title="Staff Present"
          value={`${staffPresent}/${DEMO_STAFF.length}`}
          icon={<Users className="h-5 w-5" />}
          color="secondary"
          trend={{ value: Math.round((staffPresent / DEMO_STAFF.length) * 100), label: "present" }}
          href="/demo/branch-manager/staff"
        />
        <StatsCard
          title="Outstanding Fees"
          value={formatCurrency(DEMO_FEE_COLLECTION.outstanding)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="warning"
          trend={{ value: DEMO_FEE_COLLECTION.collectionRate, label: "collected" }}
          href="/demo/branch-manager/fees"
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/demo/branch-manager/students" className="flex items-center gap-4 p-4 rounded-[12px] border border-border-light bg-app-bg hover:border-primary/30 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Student Directory</p>
                  <p className="text-xs text-text-tertiary">View all students and details</p>
                </div>
              </Link>
              <Link href="/demo/branch-manager/attendance" className="flex items-center gap-4 p-4 rounded-[12px] border border-border-light bg-app-bg hover:border-info/30 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-info-light flex items-center justify-center group-hover:bg-info/20 transition-colors">
                  <CalendarDays className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Mark Attendance</p>
                  <p className="text-xs text-text-tertiary">Daily attendance for batches</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Batch Overview + Fee Summary (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Overview */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    Batch Overview
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">{DEMO_BATCHES.length} batches</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEMO_BATCHES.map((batch) => {
                    const pct = Math.round((batch.enrolled / batch.maxStrength) * 100);
                    return (
                      <div key={batch.name} className="bg-app-bg rounded-[12px] p-4 border border-border-light">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-text-primary">{batch.name}</span>
                          <Badge variant="success" className="text-xs px-2 py-0.5">Open</Badge>
                        </div>
                        <p className="text-xs text-text-tertiary mb-2">{batch.program}</p>
                        <div className="text-sm font-medium text-text-primary mb-2">{batch.enrolled}/{batch.maxStrength} students</div>
                        <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fee Collection Summary */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Fee Collection Summary
                  </CardTitle>
                  <Link href="/demo/branch-manager/fees" className="text-sm text-primary hover:underline">View All →</Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-text-tertiary mb-1">Total Orders</p>
                    <p className="text-lg font-bold text-text-primary">{DEMO_FEE_COLLECTION.totalOrders}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-tertiary mb-1">Total Billed</p>
                    <p className="text-lg font-bold text-text-primary">{formatCurrency(DEMO_FEE_COLLECTION.totalBilled)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-tertiary mb-1">Collected</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(DEMO_FEE_COLLECTION.totalCollected)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-tertiary mb-1">Outstanding</p>
                    <p className="text-lg font-bold text-error">{formatCurrency(DEMO_FEE_COLLECTION.outstanding)}</p>
                  </div>
                </div>
                {/* Collection progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Collection Rate</span>
                    <span className="font-semibold">{DEMO_FEE_COLLECTION.collectionRate}%</span>
                  </div>
                  <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${DEMO_FEE_COLLECTION.collectionRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-success"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Attendance by Batch */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-info" />
                    Today&apos;s Attendance
                  </CardTitle>
                  <Link href="/demo/branch-manager/attendance" className="text-sm text-primary hover:underline">Details →</Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {DEMO_TODAY_ATTENDANCE.map((batch) => {
                    const pct = batch.total > 0 ? Math.round((batch.present / batch.total) * 100) : 0;
                    return (
                      <div key={batch.batch} className="flex items-center gap-4 p-3 rounded-[10px] border border-border-light bg-app-bg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{batch.batch}</p>
                          <p className="text-xs text-text-tertiary">
                            {batch.present} present · {batch.absent} absent · {batch.late} late
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2 bg-border-light rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 80 ? "bg-success" : "bg-warning"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-text-primary w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column: Recent Activity + Complaints + Payments */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {DEMO_RECENT_ACTIVITY.map((activity) => {
                    const iconMap = {
                      admission: <GraduationCap className="h-4 w-4 text-primary" />,
                      payment: <CreditCard className="h-4 w-4 text-success" />,
                      complaint: <AlertCircle className="h-4 w-4 text-warning" />,
                      attendance: <ClipboardCheck className="h-4 w-4 text-info" />,
                    };
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-app-bg border border-border-light flex items-center justify-center shrink-0 mt-0.5">
                          {iconMap[activity.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary leading-snug">{activity.message}</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Open Complaints */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareWarning className="h-5 w-5 text-warning" />
                    Open Complaints
                  </CardTitle>
                  <Badge variant="warning" className="text-xs">{openComplaints}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEMO_BM_COMPLAINTS.filter((c) => c.status !== "Closed").map((c) => (
                    <div key={c.id} className="p-3 rounded-[10px] border border-border-light bg-app-bg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-text-primary">{c.subject}</p>
                        <Badge variant={c.priority === "High" ? "error" : c.priority === "Medium" ? "warning" : "default"} className="text-[10px] shrink-0">
                          {c.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>{c.student}</span>
                        <span>·</span>
                        <Badge variant={c.status === "Open" ? "error" : "warning"} className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Payments */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-success" />
                    Recent Payments
                  </CardTitle>
                  <Link href="/demo/branch-manager/fees" className="text-sm text-primary hover:underline">All →</Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEMO_RECENT_PAYMENTS.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-[10px] border border-border-light bg-app-bg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{p.student}</p>
                        <p className="text-[11px] text-text-tertiary">
                          {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {p.mode}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
