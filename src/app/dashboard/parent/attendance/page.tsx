"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type AttendanceRecord,
} from "../page";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");

  const children = data?.children ?? [];

  const targetChildren = selectedChild === "all"
    ? children
    : children.filter((c) => c.name === selectedChild);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Attendance
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Monthly attendance details for your children
          </p>
        </div>

        {children.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        targetChildren.map((child) => {
          const enrollment = getLatestEnrollment(data, child.name);
          const records = (data?.attendance?.[child.name] ?? []) as AttendanceRecord[];
          const present = records.filter((r) => r.status === "Present").length;
          const absent = records.filter((r) => r.status === "Absent").length;
          const late = records.filter((r) => r.status === "Late").length;
          const total = records.length;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;

          return (
            <motion.div key={child.name} variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-2">
                      {enrollment?.program || child.custom_branch?.replace("Smart Up ", "")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {total === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-6">
                      No attendance records this month.
                    </p>
                  ) : (
                    <>
                      {/* Summary stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                          <p className="text-xs text-text-tertiary">Total Days</p>
                          <p className="text-xl font-bold text-text-primary">{total}</p>
                        </div>
                        <div className="bg-success-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            <p className="text-xs text-text-secondary">Present</p>
                          </div>
                          <p className="text-xl font-bold text-success">{present}</p>
                        </div>
                        <div className="bg-error-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-error" />
                            <p className="text-xs text-text-secondary">Absent</p>
                          </div>
                          <p className="text-xl font-bold text-error">{absent}</p>
                        </div>
                        <div className="bg-warning-light rounded-[10px] p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-warning" />
                            <p className="text-xs text-text-secondary">Late</p>
                          </div>
                          <p className="text-xl font-bold text-warning">{late}</p>
                        </div>
                      </div>

                      {/* Attendance rate bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-text-secondary">
                          <span>Attendance Rate</span>
                          <span className={`font-bold ${pct >= 75 ? "text-success" : "text-warning"}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-success" : "bg-warning"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Day-by-day list */}
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {records.map((record, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 px-3 rounded-[8px] border border-border-light bg-app-bg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-text-tertiary" />
                              <span className="text-text-primary font-medium">
                                {new Date(record.attendance_date).toLocaleDateString("en-IN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <Badge
                              variant={
                                record.status === "Present"
                                  ? "success"
                                  : record.status === "Absent"
                                  ? "error"
                                  : "warning"
                              }
                            >
                              {record.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
