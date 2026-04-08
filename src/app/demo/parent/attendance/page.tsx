"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  BookOpen,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_CHILDREN,
  DEMO_ATTENDANCE,
  getAttendanceStats,
  getMissedClassesForDate,
  type DemoMissedClass,
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
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
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
              {[...records].reverse().map((record, idx) => {
                const isAbsentOrLate = record.status === "Absent" || record.status === "Late";
                const missedClasses = isAbsentOrLate ? getMissedClassesForDate(record.date) : [];
                const hasMissed = missedClasses.length > 0;
                const isExpanded = expandedDate === record.date;
                const allWatched = hasMissed && missedClasses.every((c) => c.videoWatched);
                const someWatched = hasMissed && missedClasses.some((c) => c.videoWatched);

                return (
                  <div key={idx} className="rounded-[10px] border border-border-light bg-app-bg overflow-hidden">
                    {/* Row */}
                    <button
                      onClick={() => hasMissed ? setExpandedDate(isExpanded ? null : record.date) : undefined}
                      className={`w-full flex items-center justify-between py-2.5 px-3 ${hasMissed ? "cursor-pointer hover:bg-surface/50 transition-colors" : "cursor-default"}`}
                    >
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
                      <div className="flex items-center gap-2">
                        {/* Video watched remark for absent/late */}
                        {isAbsentOrLate && hasMissed && !isExpanded && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            allWatched
                              ? "bg-success/10 text-success"
                              : someWatched
                              ? "bg-warning/10 text-warning"
                              : "bg-error/10 text-error"
                          }`}>
                            {allWatched
                              ? "Videos watched"
                              : someWatched
                              ? "Partially watched"
                              : "Videos not watched"}
                          </span>
                        )}
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
                        {hasMissed && (
                          <ChevronRight className={`h-4 w-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        )}
                      </div>
                    </button>

                    {/* Expanded: missed topics */}
                    {isExpanded && hasMissed && (
                      <div className="px-3 pb-3 border-t border-border-light">
                        <p className="text-xs text-text-tertiary mt-2.5 mb-2 font-medium">
                          {record.status === "Absent" ? "Missed" : "Partially missed"} — {missedClasses.length} class{missedClasses.length !== 1 ? "es" : ""} that day
                        </p>
                        <div className="space-y-2">
                          {missedClasses.map((mc, mcIdx) => (
                            <MissedClassRow key={mcIdx} mc={mc} />
                          ))}
                        </div>
                      </div>
                    )}
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

function MissedClassRow({ mc }: { mc: DemoMissedClass }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg border ${
      mc.videoWatched ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5"
    }`}>
      {/* Subject + topic */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          <span className="text-xs font-semibold text-text-primary">{mc.subject}</span>
          <span className="text-[10px] text-text-tertiary">• {mc.duration}</span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5 ml-5.5 truncate">{mc.topic}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5 ml-5.5">{mc.teacher}</p>
      </div>

      {/* Status + action */}
      <div className="flex items-center gap-2 ml-5.5 sm:ml-0 shrink-0">
        {mc.videoWatched ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-1 rounded-full">
            <Eye className="h-3 w-3" />
            Watched
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 px-2 py-1 rounded-full">
            <EyeOff className="h-3 w-3" />
            Not watched
          </span>
        )}
        <a
          href={mc.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors"
        >
          <Play className="h-3 w-3" />
          {mc.videoWatched ? "Rewatch" : "Watch now"}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  );
}
