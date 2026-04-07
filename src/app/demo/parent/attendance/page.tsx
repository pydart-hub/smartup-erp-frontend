"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_CHILDREN,
  DEMO_ATTENDANCE,
  getAttendanceStats,
} from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoAttendancePage() {
  const [selectedChild, setSelectedChild] = useState(DEMO_CHILDREN[0].id);
  const records = DEMO_ATTENDANCE[selectedChild] ?? [];
  const stats = getAttendanceStats(records);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-secondary mt-1">Full attendance record for the last ~1.2 months</p>
        </div>
        {DEMO_CHILDREN.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2 outline-none focus:border-primary"
          >
            {DEMO_CHILDREN.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <Calendar className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary">Total Days</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold text-success">{stats.present}</p>
          <p className="text-xs text-text-secondary">Present</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <XCircle className="h-5 w-5 text-error mx-auto mb-2" />
          <p className="text-2xl font-bold text-error">{stats.absent}</p>
          <p className="text-xs text-text-secondary">Absent</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold text-warning">{stats.late}</p>
          <p className="text-xs text-text-secondary">Late</p>
        </div>
      </motion.div>

      {/* Attendance Rate */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>Attendance Rate</span>
              <span className="font-semibold text-text-primary">{stats.pct}%</span>
            </div>
            <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stats.pct >= 75 ? "bg-success" : "bg-warning"}`}
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Day-by-day list */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...records].reverse().map((record, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-[10px] border border-border-light bg-app-bg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-primary">
                      {new Date(record.date).toLocaleDateString("en-IN", {
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
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
