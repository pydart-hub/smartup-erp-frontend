"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_FEE_COLLECTION,
  DEMO_STUDENT_FEES,
  DEMO_RECENT_PAYMENTS,
  formatCurrency,
} from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBMFeesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = DEMO_STUDENT_FEES.filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (search && !f.student.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPaid = DEMO_STUDENT_FEES.filter((f) => f.status === "paid").length;
  const totalPartial = DEMO_STUDENT_FEES.filter((f) => f.status === "partial").length;
  const totalOverdue = DEMO_STUDENT_FEES.filter((f) => f.status === "overdue").length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Fee Collection</h1>
        <p className="text-sm text-text-secondary mt-1">Track and manage fee payments across all students</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <IndianRupee className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-lg font-bold text-text-primary">{formatCurrency(DEMO_FEE_COLLECTION.totalBilled)}</p>
          <p className="text-xs text-text-secondary">Total Billed</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-lg font-bold text-success">{formatCurrency(DEMO_FEE_COLLECTION.totalCollected)}</p>
          <p className="text-xs text-text-secondary">Collected</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <AlertCircle className="h-5 w-5 text-error mx-auto mb-2" />
          <p className="text-lg font-bold text-error">{formatCurrency(DEMO_FEE_COLLECTION.outstanding)}</p>
          <p className="text-xs text-text-secondary">Outstanding</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-lg font-bold text-primary">{DEMO_FEE_COLLECTION.collectionRate}%</p>
          <p className="text-xs text-text-secondary">Collection Rate</p>
        </div>
      </motion.div>

      {/* Collection Progress */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>Overall Collection Progress</span>
              <span className="font-semibold text-text-primary">{DEMO_FEE_COLLECTION.collectionRate}%</span>
            </div>
            <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${DEMO_FEE_COLLECTION.collectionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-success"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Student-wise Fee Status */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                Student Fee Status
              </CardTitle>
              <div className="flex gap-2 text-xs">
                <Badge variant="success">{totalPaid} Paid</Badge>
                <Badge variant="warning">{totalPartial} Partial</Badge>
                <Badge variant="error">{totalOverdue} Overdue</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-[10px] border border-border-light bg-app-bg text-text-primary text-sm outline-none focus:border-primary placeholder:text-text-tertiary"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-[10px] border border-border-light bg-app-bg text-text-primary text-sm outline-none focus:border-primary"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="space-y-2">
              {filtered.map((fee) => (
                <div key={fee.studentId} className="flex items-center gap-4 p-3 rounded-[10px] border border-border-light bg-app-bg">
                  <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {fee.student.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{fee.student}</p>
                    <p className="text-[11px] text-text-tertiary">{fee.class} · {fee.batch}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-text-tertiary">Paid</p>
                    <p className="text-sm font-medium text-success">{formatCurrency(fee.paid)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-tertiary">Outstanding</p>
                    <p className={`text-sm font-semibold ${fee.outstanding > 0 ? "text-error" : "text-success"}`}>
                      {fee.outstanding > 0 ? formatCurrency(fee.outstanding) : "—"}
                    </p>
                  </div>
                  <Badge
                    variant={fee.status === "paid" ? "success" : fee.status === "partial" ? "warning" : "error"}
                    className="shrink-0 text-[10px]"
                  >
                    {fee.status === "paid" ? "Paid" : fee.status === "partial" ? "Partial" : "Overdue"}
                  </Badge>
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
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-success" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEMO_RECENT_PAYMENTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-[10px] border border-border-light bg-app-bg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{p.student}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.mode} · {p.reference}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
