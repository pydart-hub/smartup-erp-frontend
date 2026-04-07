"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  CreditCard,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_CHILDREN,
  DEMO_FEES,
  formatCurrency,
  type DemoFeeInstalment,
} from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function InstalmentStatusIcon({ status }: { status: DemoFeeInstalment["status"] }) {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "partially-paid":
      return <Clock className="h-5 w-5 text-warning" />;
    case "overdue":
      return <AlertCircle className="h-5 w-5 text-error" />;
    case "upcoming":
      return <Calendar className="h-5 w-5 text-text-tertiary" />;
  }
}

function InstalmentBadge({ status }: { status: DemoFeeInstalment["status"] }) {
  const map: Record<DemoFeeInstalment["status"], { label: string; variant: "success" | "warning" | "error" | "outline" }> = {
    paid: { label: "Paid", variant: "success" },
    "partially-paid": { label: "Partial", variant: "warning" },
    overdue: { label: "Overdue", variant: "error" },
    upcoming: { label: "Upcoming", variant: "outline" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function DemoFeesPage() {
  const [selectedChild, setSelectedChild] = useState<string>("all");

  const filteredFees = selectedChild === "all"
    ? DEMO_FEES
    : DEMO_FEES.filter((f) => f.studentId === selectedChild);

  const totalFees = filteredFees.reduce((s, f) => s + f.totalFee, 0);
  const totalPaid = filteredFees.reduce((s, f) => s + f.totalPaid, 0);
  const totalOutstanding = totalFees - totalPaid;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fees & Payments</h1>
          <p className="text-sm text-text-secondary mt-1">Track instalments and payment history</p>
        </div>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2 outline-none focus:border-primary"
        >
          <option value="all">All Children</option>
          {DEMO_CHILDREN.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-[14px] border border-border-light p-5 text-center">
          <p className="text-sm text-text-secondary">Total Fees</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totalFees)}</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-5 text-center">
          <p className="text-sm text-text-secondary">Paid</p>
          <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-5 text-center">
          <p className="text-sm text-text-secondary">Outstanding</p>
          <p className="text-2xl font-bold text-error mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
      </motion.div>

      {/* Per-child Fee Details */}
      {filteredFees.map((feeData) => {
        const child = DEMO_CHILDREN.find((c) => c.id === feeData.studentId);
        const paidPct = Math.round((feeData.totalPaid / feeData.totalFee) * 100);

        return (
          <motion.div key={feeData.orderId} variants={item}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    {child?.name} — {child?.feePlan} Plan
                  </CardTitle>
                  <Badge variant="info">{feeData.orderId}</Badge>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Total: {formatCurrency(feeData.totalFee)} • Paid: {formatCurrency(feeData.totalPaid)} •
                  Outstanding: {formatCurrency(feeData.totalFee - feeData.totalPaid)}
                </p>
              </CardHeader>
              <CardContent>
                {/* Overall progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                    <span>Payment Progress</span>
                    <span className="font-semibold">{paidPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>

                {/* Instalment Timeline */}
                <div className="space-y-2 mb-6">
                  {feeData.instalments.map((inst) => {
                    const instPct = inst.amount > 0 ? Math.round((inst.paid / inst.amount) * 100) : 0;
                    return (
                      <div key={inst.id} className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light bg-app-bg">
                        <InstalmentStatusIcon status={inst.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">{inst.label}</p>
                            <InstalmentBadge status={inst.status} />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-text-tertiary">
                              Due: {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {formatCurrency(inst.paid)} / {formatCurrency(inst.amount)}
                            </p>
                          </div>
                          {inst.status === "partially-paid" && (
                            <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden mt-1.5">
                              <div className="h-full bg-warning rounded-full" style={{ width: `${instPct}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment History */}
                {feeData.payments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-text-tertiary" />
                      Payment History
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-light">
                            <th className="text-left py-2 text-text-tertiary font-medium">Date</th>
                            <th className="text-left py-2 text-text-tertiary font-medium">Amount</th>
                            <th className="text-left py-2 text-text-tertiary font-medium">Mode</th>
                            <th className="text-left py-2 text-text-tertiary font-medium">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeData.payments.map((p, idx) => (
                            <tr key={idx} className="border-b border-border-light last:border-0">
                              <td className="py-2 text-text-secondary">
                                {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="py-2 font-medium text-text-primary">{formatCurrency(p.amount)}</td>
                              <td className="py-2 text-text-secondary">{p.mode}</td>
                              <td className="py-2 text-text-tertiary">{p.reference}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
