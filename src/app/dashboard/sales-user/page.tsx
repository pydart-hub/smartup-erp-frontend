"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  PhoneMissed,
  ChevronRight,
  ArrowUpRight,
  X,
  Building2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { AnimatedNumber, AnimatedCurrency, AnimatedName } from "@/components/dashboard/AnimatedValue";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDuesTodayTotal } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";
import { getSalesUserFollowUpDashboard } from "@/lib/api/followup";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* ─── Minimal KPI card ─── */
interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
  href?: string;
  onClick?: () => void;
  warn?: boolean;
  loading?: boolean;
}

function KpiCard({ title, value, sub, icon, iconBg, accent, href, onClick, warn, loading }: KpiCardProps) {
  const inner = (
    <div
      onClick={onClick}
      className={`relative h-full rounded-2xl bg-white border transition-all duration-200 overflow-hidden group ${
        onClick ? "cursor-pointer hover:scale-[1.01] hover:shadow-md" : ""
      } ${
        warn ? "border-orange-200 shadow-orange-50 shadow-md" : "border-gray-100 shadow-sm hover:shadow-md"
      }`}
    >
      <div className={`absolute top-0 inset-x-0 h-[3px] ${accent}`} />
      <div className="p-5 pt-6">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg} mb-3`}>
          {icon}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{title}</p>
        <div className="text-[1.9rem] font-extrabold text-gray-900 leading-tight">
          {loading ? <span className="block w-20 h-7 bg-gray-100 rounded-lg animate-pulse" /> : value}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {href && (
          <div className="flex items-center gap-1 mt-3 text-[10px] font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
            <span>View details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ─── Small stat pill ─── */
function StatPill({
  label,
  value,
  color,
  icon,
  loading,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
      <span className="shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
        {loading ? (
          <span className="block w-10 h-4 bg-current/20 rounded animate-pulse" />
        ) : (
          <p className="text-lg font-bold leading-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Status colour map ─── */
const STATUS_COLORS: Record<string, string> = {
  "Already Paid": "text-emerald-600 bg-emerald-50",
  "Promised to Pay": "text-blue-600 bg-blue-50",
  "Will Pay This Week": "text-sky-600 bg-sky-50",
  "Called – No Answer": "text-amber-600 bg-amber-50",
  "Called – Busy": "text-orange-600 bg-orange-50",
  Disputed: "text-rose-600 bg-rose-50",
};

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? "text-gray-500 bg-gray-100";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* ─── Breakdown Modal ─── */
interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: { branch: string; converted_count: number; paid_amount: number }[];
  totalAmount: number;
}

function BreakdownModal({ isOpen, onClose, title, data, totalAmount }: BreakdownModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-md font-bold text-gray-800">{title}</h2>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Branch-wise stats</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto p-6 space-y-5">
            {!data || data.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No branch separation data available.</p>
              </div>
            ) : (
              data.map((item) => {
                const percent = totalAmount > 0 ? (item.paid_amount / totalAmount) * 100 : 0;
                return (
                  <div key={item.branch} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">
                        {item.branch.replace("Smart Up ", "").replace("Smart Up", "HQ")}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-gray-900">{formatCurrency(item.paid_amount)}</span>
                        <span className="text-[11px] text-gray-400 font-medium ml-1.5">({item.converted_count} students)</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Collection</span>
            <span className="text-lg font-black text-teal-600">{formatCurrency(totalAmount)}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function SalesUserDashboard() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState("");
  const [modalData, setModalData] = React.useState<{ branch: string; converted_count: number; paid_amount: number }[]>([]);
  const [modalTotal, setModalTotal] = React.useState(0);

  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ["su-overdue"],
    queryFn: () => getDuesTodayTotal(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: followUpData, isLoading: loadingFollowUp } = useQuery({
    queryKey: ["su-followup-dashboard"],
    queryFn: () => getSalesUserFollowUpDashboard(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const hasOverdue = (overdueData?.total_dues ?? 0) > 0;

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5 pb-8">
      <BreadcrumbNav />

      {/* ── Header ── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/70 bg-white/70 backdrop-blur-sm px-5 py-4"
      >
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            <AnimatedName name={user?.full_name ?? "Sales User"} />
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">Fee follow-up dashboard</p>
        </div>
        <Link
          href="/dashboard/sales-user/fees/overdue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          Overdue Fees
        </Link>
      </motion.div>

      {/* ── 5 KPI cards ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Overdue Fees"
          value={<AnimatedCurrency value={overdueData?.total_dues ?? 0} />}
          sub={`${overdueData?.student_count ?? 0} students`}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          iconBg="bg-orange-50"
          accent={hasOverdue ? "bg-orange-500" : "bg-gray-200"}
          href="/dashboard/sales-user/fees/overdue"
          warn={hasOverdue}
          loading={loadingOverdue}
        />
        <KpiCard
          title="Today Calls"
          value={<AnimatedNumber value={followUpData?.summary.today_calls ?? 0} />}
          sub={`${followUpData?.summary.week_calls ?? 0} this week`}
          icon={<Phone className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          accent="bg-emerald-500"
          loading={loadingFollowUp}
        />
        <KpiCard
          title="Branch Converted"
          value={<AnimatedNumber value={followUpData?.summary.branch_converted_count ?? 0} />}
          sub={formatCurrency(followUpData?.summary.branch_paid_amount ?? 0)}
          icon={<CheckCircle2 className="h-4 w-4 text-sky-600" />}
          iconBg="bg-sky-50"
          accent="bg-sky-500"
          loading={loadingFollowUp}
          onClick={() => {
            if (followUpData?.summary.branch_conversions_breakdown) {
              setModalTitle("Branch Collection Breakdown");
              setModalData(followUpData.summary.branch_conversions_breakdown);
              setModalTotal(followUpData.summary.branch_paid_amount);
              setModalOpen(true);
            }
          }}
        />
        <KpiCard
          title="My Converted"
          value={<AnimatedNumber value={followUpData?.summary.converted_count ?? 0} />}
          sub={formatCurrency(followUpData?.summary.paid_amount ?? 0)}
          icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50"
          accent="bg-violet-500"
          loading={loadingFollowUp}
          onClick={() => {
            if (followUpData?.summary.user_conversions_breakdown) {
              setModalTitle("My Collection Breakdown");
              setModalData(followUpData.summary.user_conversions_breakdown);
              setModalTotal(followUpData.summary.paid_amount);
              setModalOpen(true);
            }
          }}
        />
        <KpiCard
          title="Pending Follow-Ups"
          value={<AnimatedNumber value={followUpData?.summary.pending_followups ?? 0} />}
          sub="Need callback or action"
          icon={<Clock3 className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50"
          accent="bg-amber-500"
          loading={loadingFollowUp}
        />
      </motion.div>

      {/* ── 2 small stat pills ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
        <StatPill
          label="Students Contacted"
          value={followUpData?.summary.students_contacted ?? 0}
          color="border-sky-200/60 bg-sky-50/50 text-sky-800"
          icon={<Phone className="h-4 w-4 text-sky-500" />}
          loading={loadingFollowUp}
        />
        <StatPill
          label="No Answer / Busy"
          value={followUpData?.summary.no_answer_count ?? 0}
          color="border-rose-200/60 bg-rose-50/50 text-rose-800"
          icon={<PhoneMissed className="h-4 w-4 text-rose-500" />}
          loading={loadingFollowUp}
        />
      </motion.div>

      {/* ── Overdue banner (only when there is overdue) ── */}
      {hasOverdue && (
        <motion.div variants={fadeUp}>
          <Link href="/dashboard/sales-user/fees/overdue">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-200 hover:bg-orange-100/60 transition-all cursor-pointer group">
              <div className="relative shrink-0">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-orange-800">Fee Overdue — Till Today</span>
                <span className="text-sm text-orange-500 ml-2">
                  {formatCurrency(overdueData?.total_dues ?? 0)} · {overdueData?.student_count ?? 0} students
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-300 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── Recent Call History ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Phone className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Recent Call History</h2>
            </div>
            <Link
              href="/dashboard/sales-user/followup"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              See all →
            </Link>
          </div>

          {loadingFollowUp ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !(followUpData?.recent_logs?.length) ? (
            <div className="text-center py-10">
              <Phone className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-text-tertiary">No follow-up calls logged yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followUpData.recent_logs.slice(0, 8).map((log, index) => (
                <motion.div
                  key={log.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-teal-50">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {log.student_name || log.student}
                    </p>
                    <p className="text-[11px] text-text-tertiary">{log.call_date}</p>
                  </div>
                  {statusBadge(log.call_status)}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Breakdown Modal */}
      <BreakdownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        data={modalData}
        totalAmount={modalTotal}
      />
    </motion.div>
  );
}
