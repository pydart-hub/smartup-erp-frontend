"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_TODAY_ATTENDANCE, DEMO_STUDENTS } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBMAttendancePage() {
  const [selectedBatch, setSelectedBatch] = useState("all");

  const totalPresent = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.present, 0);
  const totalAbsent  = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.absent, 0);
  const totalLate    = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.late, 0);
  const totalStudents = DEMO_TODAY_ATTENDANCE.reduce((s, b) => s + b.total, 0);
  const overallPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  // Generate mock per-student attendance for selected batch
  const batches = DEMO_TODAY_ATTENDANCE.map((b) => b.batch);
  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled);

  const studentsInBatch = selectedBatch === "all"
    ? activeStudents
    : activeStudents.filter((s) => {
        // Match batch from attendance list e.g. "CHL-10A (10th Grade)" contains "CHL-10A"
        return selectedBatch.includes(s.batch);
      });

  // Mock today's status for each student based on their attendance %
  function todayStatus(pct: number, idx: number): "Present" | "Absent" | "Late" {
    const hash = (pct + idx * 7) % 20;
    if (hash >= 19) return "Absent";
    if (hash >= 17) return "Late";
    return "Present";
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Attendance Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Today&apos;s attendance across all batches</p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <Users className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">{totalStudents}</p>
          <p className="text-xs text-text-secondary">Total</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold text-success">{totalPresent}</p>
          <p className="text-xs text-text-secondary">Present</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <XCircle className="h-5 w-5 text-error mx-auto mb-2" />
          <p className="text-2xl font-bold text-error">{totalAbsent}</p>
          <p className="text-xs text-text-secondary">Absent</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold text-warning">{totalLate}</p>
          <p className="text-xs text-text-secondary">Late</p>
        </div>
      </motion.div>

      {/* Overall Rate */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>Overall Attendance Rate</span>
              <span className="font-semibold text-text-primary">{overallPct}%</span>
            </div>
            <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${overallPct >= 80 ? "bg-success" : "bg-warning"}`}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batch-wise breakdown */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Batch-wise Breakdown
              </CardTitle>
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

      {/* Per-student today's attendance */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Student-wise (Today)</CardTitle>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-1.5 outline-none focus:border-primary"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studentsInBatch.map((student, idx) => {
                const status = todayStatus(student.attendancePct, idx);
                return (
                  <div key={student.id} className="flex items-center justify-between py-2.5 px-3 rounded-[10px] border border-border-light bg-app-bg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{student.name}</p>
                        <p className="text-[11px] text-text-tertiary">{student.class} · {student.batch}</p>
                      </div>
                    </div>
                    <Badge
                      variant={status === "Present" ? "success" : status === "Absent" ? "error" : "warning"}
                    >
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
