"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  IndianRupee,
  UserPlus,
  School,
  CalendarDays,
  FileText,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

// Placeholder data — replace with real API calls
const stats = {
  totalStudents: 342,
  activeBatches: 12,
  todayAttendance: "89%",
  pendingFees: "₹4,52,000",
};

const quickActions = [
  {
    label: "Add New Student",
    description: "Create student profile & admission",
    href: "/dashboard/branch-manager/students/new",
    icon: <UserPlus className="h-5 w-5" />,
    color: "primary" as const,
  },
  {
    label: "Create Batch",
    description: "Set up a new batch for a class",
    href: "/dashboard/branch-manager/batches/new",
    icon: <Users className="h-5 w-5" />,
    color: "secondary" as const,
  },
  {
    label: "Mark Attendance",
    description: "Daily attendance for batches",
    href: "/dashboard/branch-manager/attendance",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "info" as const,
  },
  {
    label: "Fee Collection",
    description: "Record fee payments",
    href: "/dashboard/branch-manager/fees/payments",
    icon: <FileText className="h-5 w-5" />,
    color: "warning" as const,
  },
];

const recentActivities: ActivityItem[] = [
  { id: "1", type: "student_added", message: "Arjun Menon admitted to Class 10 - Batch A", timestamp: "2026-02-23T10:30:00" },
  { id: "2", type: "fee_collected", message: "₹15,000 fee collected from Priya Sharma", timestamp: "2026-02-23T09:45:00" },
  { id: "3", type: "attendance_marked", message: "Attendance marked for Class 12 - Batch B", timestamp: "2026-02-23T09:15:00" },
  { id: "4", type: "batch_created", message: "Class 11 - Batch C created (capacity: 60)", timestamp: "2026-02-22T16:00:00" },
  { id: "5", type: "student_added", message: "Meera Das admitted to Class 9 - Batch A", timestamp: "2026-02-22T14:20:00" },
];

const batchOverview = [
  { class: "Class 8", batches: [{ name: "A", strength: 58, max: 60 }, { name: "B", strength: 42, max: 60 }] },
  { class: "Class 9", batches: [{ name: "A", strength: 60, max: 60 }, { name: "B", strength: 55, max: 60 }] },
  { class: "Class 10", batches: [{ name: "A", strength: 52, max: 60 }, { name: "B", strength: 35, max: 60 }] },
  { class: "Class 11", batches: [{ name: "A", strength: 60, max: 60 }, { name: "B", strength: 60, max: 60 }, { name: "C", strength: 20, max: 60 }] },
  { class: "Class 12", batches: [{ name: "A", strength: 57, max: 60 }] },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BranchManagerDashboard() {
  const { user } = useAuth();
  const { flags } = useFeatureFlagsStore();

  if (!flags.overview) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {user?.full_name?.split(" ")[0] || "Manager"}
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Here&apos;s what&apos;s happening at your branch today.
            </p>
          </div>
          <Badge variant="default" className="self-start px-3 py-1 text-sm">
            Branch Manager
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<GraduationCap className="h-5 w-5" />}
          color="primary"
          trend={{ value: 12, label: "this month" }}
        />
        <StatsCard
          title="Active Batches"
          value={stats.activeBatches}
          icon={<Users className="h-5 w-5" />}
          color="secondary"
        />
        <StatsCard
          title="Today's Attendance"
          value={stats.todayAttendance}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="info"
          trend={{ value: 3, label: "vs yesterday" }}
        />
        <StatsCard
          title="Pending Fees"
          value={stats.pendingFees}
          icon={<IndianRupee className="h-5 w-5" />}
          color="warning"
          trend={{ value: -8, label: "this week" }}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions + Batch Overview (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickActions actions={quickActions} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Batch Overview */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Batch Overview</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {batchOverview.reduce((acc, c) => acc + c.batches.length, 0)} batches
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {batchOverview.map((classItem) => (
                    <div key={classItem.class}>
                      <div className="flex items-center gap-2 mb-2">
                        <School className="h-4 w-4 text-text-tertiary" />
                        <span className="text-sm font-semibold text-text-primary">
                          {classItem.class}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 ml-6">
                        {classItem.batches.map((batch) => {
                          const percentage = (batch.strength / batch.max) * 100;
                          const isFull = batch.strength >= batch.max;
                          return (
                            <div
                              key={`${classItem.class}-${batch.name}`}
                              className="bg-app-bg rounded-[10px] p-3 border border-border-light"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-text-primary">
                                  Batch {batch.name}
                                </span>
                                {isFull ? (
                                  <Badge variant="error" className="text-[10px] px-1.5 py-0">Full</Badge>
                                ) : (
                                  <Badge variant="success" className="text-[10px] px-1.5 py-0">Open</Badge>
                                )}
                              </div>
                              <div className="text-xs text-text-secondary mb-1.5">
                                {batch.strength}/{batch.max} students
                              </div>
                              {/* Capacity bar */}
                              <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className={`h-full rounded-full ${
                                    isFull
                                      ? "bg-error"
                                      : percentage > 80
                                      ? "bg-warning"
                                      : "bg-primary"
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity (1 col) */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivity activities={recentActivities} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
