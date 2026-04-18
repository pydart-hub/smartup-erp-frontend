"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAttendanceAnalytics } from "@/lib/api/analytics";
import { motion } from "framer-motion";
import {
  ClipboardCheck, Users, AlertTriangle, TrendingUp,
  Calendar, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import Link from "next/link";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AttendanceReportPage() {
  const { defaultCompany } = useAuth();
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "custom">("month");
  const [search, setSearch] = useState("");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    if (period === "week") from.setDate(to.getDate() - 7);
    else if (period === "month") from.setMonth(to.getMonth() - 1);
    else if (period === "quarter") from.setMonth(to.getMonth() - 3);
    else from.setMonth(to.getMonth() - 1);
    return {
      from_date: from.toISOString().split("T")[0],
      to_date: to.toISOString().split("T")[0],
    };
  }, [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-analytics", defaultCompany, dateRange],
    queryFn: () =>
      getAttendanceAnalytics({
        branch: defaultCompany,
        ...dateRange,
      }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const filteredBatches = useMemo(() => {
    if (!data?.batches) return [];
    if (!search) return data.batches;
    const q = search.toLowerCase();
    return data.batches.filter(
      (b) => b.student_group.toLowerCase().includes(q) || b.program.toLowerCase().includes(q),
    );
  }, [data?.batches, search]);

  const filteredAbsentees = useMemo(() => {
    if (!data?.chronic_absentees) return [];
    if (!search) return data.chronic_absentees;
    const q = search.toLowerCase();
    return data.chronic_absentees.filter(
      (a) => a.student_name.toLowerCase().includes(q) || a.student_group.toLowerCase().includes(q),
    );
  }, [data?.chronic_absentees, search]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-[12px] animate-pulse" />
      </div>
    );
  }

  const overall = data?.overall ?? { total_students: 0, avg_attendance_pct: 0, total_working_days: 0 };
  const chronicCount = data?.chronic_absentees?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Attendance Report</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Batch-wise analytics, trends & chronic absentees
          </p>
        </div>
        <Link
          href="/dashboard/branch-manager/attendance/students"
          className="text-sm text-primary hover:underline"
        >
          ← Mark Attendance
        </Link>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["week", "month", "quarter"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm rounded-[8px] font-medium transition-colors ${
              period === p
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-app-bg"
            }`}
          >
            {p === "week" ? "This Week" : p === "month" ? "This Month" : "This Quarter"}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Total Students</span>
          </div>
          <p className="text-2xl font-bold text-primary">{overall.total_students}</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-success" />
            <span className="text-xs text-text-tertiary font-medium">Avg Attendance</span>
          </div>
          <p className={`text-2xl font-bold ${overall.avg_attendance_pct >= 75 ? "text-success" : overall.avg_attendance_pct >= 50 ? "text-warning" : "text-error"}`}>
            {overall.avg_attendance_pct}%
          </p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Working Days</span>
          </div>
          <p className="text-2xl font-bold text-primary">{overall.total_working_days}</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="text-xs text-text-tertiary font-medium">Chronic Absentees</span>
          </div>
          <p className="text-2xl font-bold text-error">{chronicCount}</p>
          <p className="text-xs text-text-tertiary mt-0.5">&lt;75% attendance</p>
        </motion.div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search batches or students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-surface rounded-[10px] border border-border-input text-sm text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Batch-wise Attendance */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">Batch-wise Attendance</h2>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          {filteredBatches.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <p className="text-text-tertiary text-sm">No attendance data found for this period</p>
            </div>
          ) : (
            filteredBatches.map((batch) => (
              <motion.div
                key={batch.student_group}
                variants={item}
                className="bg-surface rounded-[12px] border border-border-light overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedBatch(expandedBatch === batch.student_group ? null : batch.student_group)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-app-bg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-sm font-bold ${
                        batch.avg_attendance_pct >= 85
                          ? "bg-success/10 text-success"
                          : batch.avg_attendance_pct >= 70
                          ? "bg-warning/10 text-warning"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {batch.avg_attendance_pct}%
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-primary">{batch.student_group}</p>
                      <p className="text-xs text-text-tertiary">{batch.program} · {batch.total_students} students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-3 text-xs text-text-secondary">
                      <span className="text-success">P:{batch.total_present}</span>
                      <span className="text-error">A:{batch.total_absent}</span>
                      <span className="text-warning">L:{batch.total_late}</span>
                    </div>
                    {batch.chronic_absentees > 0 && (
                      <span className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full font-medium">
                        {batch.chronic_absentees} at risk
                      </span>
                    )}
                    {expandedBatch === batch.student_group ? (
                      <ChevronUp className="w-4 h-4 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                </button>

                {expandedBatch === batch.student_group && (
                  <div className="px-4 pb-4 border-t border-border-light pt-3">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-success">{batch.total_present}</p>
                        <p className="text-xs text-text-tertiary">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-error">{batch.total_absent}</p>
                        <p className="text-xs text-text-tertiary">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-warning">{batch.total_late}</p>
                        <p className="text-xs text-text-tertiary">Late</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-app-bg rounded-full overflow-hidden flex">
                      <div
                        className="bg-success h-full"
                        style={{
                          width: `${(batch.total_present / Math.max(batch.total_present + batch.total_absent + batch.total_late, 1)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-warning h-full"
                        style={{
                          width: `${(batch.total_late / Math.max(batch.total_present + batch.total_absent + batch.total_late, 1)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-error h-full"
                        style={{
                          width: `${(batch.total_absent / Math.max(batch.total_present + batch.total_absent + batch.total_late, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-tertiary mt-1">
                      <span>{batch.total_working_days} working days</span>
                      <span>{batch.total_students} students tracked</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Daily Trend */}
      {data?.daily_trend && data.daily_trend.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Trend
          </h2>
          <div className="bg-surface rounded-[12px] border border-border-light p-4 overflow-x-auto">
            <div className="flex gap-1 min-w-[600px]" style={{ height: 120 }}>
              {data.daily_trend.map((d) => {
                const pct = d.total > 0 ? ((d.present + d.late) / d.total) * 100 : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    <div
                      className={`w-full rounded-t-[4px] min-h-[4px] transition-all ${
                        pct >= 85 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-error"
                      }`}
                      style={{ height: `${Math.max(pct, 5)}%` }}
                    />
                    <div className="absolute -top-8 hidden group-hover:block bg-primary text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                      {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {Math.round(pct)}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-text-tertiary mt-2 min-w-[600px]">
              <span>
                {new Date(data.daily_trend[0].date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span>
                {new Date(data.daily_trend[data.daily_trend.length - 1].date).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short" },
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chronic Absentees */}
      {filteredAbsentees.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-error" />
            Chronic Absentees ({filteredAbsentees.length})
          </h2>
          <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-app-bg">
                    <th className="text-left p-3 font-medium text-text-secondary">Student</th>
                    <th className="text-left p-3 font-medium text-text-secondary">Batch</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Present</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Absent</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Late</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsentees.map((a) => (
                    <tr key={a.student} className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-primary">{a.student_name}</p>
                        <p className="text-xs text-text-tertiary">{a.student}</p>
                      </td>
                      <td className="p-3 text-text-secondary">{a.student_group}</td>
                      <td className="p-3 text-center text-success font-medium">{a.present}</td>
                      <td className="p-3 text-center text-error font-medium">{a.absent}</td>
                      <td className="p-3 text-center text-warning font-medium">{a.late}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            a.pct < 50 ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
                          }`}
                        >
                          {a.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
