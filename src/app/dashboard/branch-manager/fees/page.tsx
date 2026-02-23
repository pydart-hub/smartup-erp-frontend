"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  FileText,
  CreditCard,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

// Placeholder data
const feeStats = {
  totalFees: 2850000,
  collected: 2398000,
  pending: 452000,
  collectionRate: 84.1,
};

const pendingFees = [
  { student: "Arjun Menon", class: "Class 10 - A", amount: 15000, dueDate: "2026-02-28", status: "Overdue" },
  { student: "Priya Sharma", class: "Class 12 - B", amount: 25000, dueDate: "2026-03-01", status: "Due Soon" },
  { student: "Rahul Kumar", class: "Class 11 - A", amount: 12000, dueDate: "2026-03-05", status: "Due Soon" },
  { student: "Meera Das", class: "Class 9 - A", amount: 18000, dueDate: "2026-02-15", status: "Overdue" },
  { student: "Anil Nair", class: "Class 10 - B", amount: 22000, dueDate: "2026-03-10", status: "Upcoming" },
];

const recentPayments = [
  { student: "Deepa Thomas", amount: 15000, mode: "UPI", date: "2026-02-23" },
  { student: "Karthik Raj", amount: 25000, mode: "Bank Transfer", date: "2026-02-22" },
  { student: "Sneha Pillai", amount: 10000, mode: "Cash", date: "2026-02-22" },
  { student: "Vishnu Dev", amount: 20000, mode: "Card", date: "2026-02-21" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function FeesPage() {
  const { flags } = useFeatureFlagsStore();
  if (!flags.fees) return null;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fee Management</h1>
          <p className="text-sm text-text-secondary mt-0.5">Track fees, payments, and generate reports</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/branch-manager/fees/structure">
            <Button variant="outline" size="md">
              <FileText className="h-4 w-4" />
              Fee Structure
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/fees/payments">
            <Button variant="primary" size="md">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Fees"
          value={formatCurrency(feeStats.totalFees)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="info"
        />
        <StatsCard
          title="Collected"
          value={formatCurrency(feeStats.collected)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="success"
        />
        <StatsCard
          title="Pending"
          value={formatCurrency(feeStats.pending)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="warning"
        />
        <StatsCard
          title="Collection Rate"
          value={`${feeStats.collectionRate}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          color="primary"
          trend={{ value: 2.3, label: "vs last month" }}
        />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Fees */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Fees</CardTitle>
                <Link href="/dashboard/branch-manager/fees/reports">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left pb-3 font-semibold text-text-secondary">Student</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Class</th>
                      <th className="text-right pb-3 font-semibold text-text-secondary">Amount</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Due Date</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingFees.map((fee, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                      >
                        <td className="py-3 font-medium text-text-primary">{fee.student}</td>
                        <td className="py-3 text-text-secondary">{fee.class}</td>
                        <td className="py-3 text-right font-semibold text-text-primary">{formatCurrency(fee.amount)}</td>
                        <td className="py-3 text-text-secondary">{fee.dueDate}</td>
                        <td className="py-3">
                          <Badge variant={fee.status === "Overdue" ? "error" : fee.status === "Due Soon" ? "warning" : "info"}>
                            {fee.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Payments */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPayments.map((payment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-[10px] bg-app-bg border border-border-light"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{payment.student}</p>
                      <p className="text-xs text-text-tertiary">{payment.mode} &middot; {payment.date}</p>
                    </div>
                    <span className="text-sm font-bold text-success">{formatCurrency(payment.amount)}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
