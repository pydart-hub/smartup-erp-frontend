"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Save,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

// Placeholder data
const mockStudentsInBatch = [
  { id: "STU-001", name: "Arjun Menon", status: "Present" as const },
  { id: "STU-002", name: "Priya Sharma", status: "Present" as const },
  { id: "STU-003", name: "Rahul Kumar", status: "Absent" as const },
  { id: "STU-004", name: "Meera Das", status: "Present" as const },
  { id: "STU-005", name: "Anil Nair", status: "Present" as const },
  { id: "STU-006", name: "Deepa Thomas", status: "Late" as const },
  { id: "STU-007", name: "Karthik Raj", status: "Present" as const },
  { id: "STU-008", name: "Sneha Pillai", status: "Absent" as const },
  { id: "STU-009", name: "Vishnu Dev", status: "Present" as const },
  { id: "STU-010", name: "Lakshmi Nair", status: "Present" as const },
];

type AttendanceStatus = "Present" | "Absent" | "Late";

export default function AttendancePage() {
  const { flags } = useFeatureFlagsStore();
  const [selectedBatch, setSelectedBatch] = useState("Class 10 - Batch A");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(mockStudentsInBatch.map((s) => [s.id, s.status]))
  );

  if (!flags.attendance) return null;

  const presentCount = Object.values(attendance).filter((s) => s === "Present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "Absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "Late").length;
  const total = mockStudentsInBatch.length;

  function toggleStatus(studentId: string) {
    setAttendance((prev) => {
      const cycle: AttendanceStatus[] = ["Present", "Absent", "Late"];
      const current = prev[studentId];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return { ...prev, [studentId]: next };
    });
  }

  function markAllPresent() {
    setAttendance(Object.fromEntries(mockStudentsInBatch.map((s) => [s.id, "Present" as const])));
  }

  function saveAttendance() {
    // TODO: Connect to API
    toast.success(`Attendance saved for ${selectedBatch} on ${selectedDate}`);
  }

  const statusConfig = {
    Present: { icon: CheckCircle, color: "text-success", bg: "bg-success-light", ring: "ring-success/20" },
    Absent: { icon: XCircle, color: "text-error", bg: "bg-error-light", ring: "ring-error/20" },
    Late: { icon: Clock, color: "text-warning", bg: "bg-warning-light", ring: "ring-warning/20" },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-secondary mt-0.5">Mark daily attendance for batches</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
              >
                <option>Class 10 - Batch A</option>
                <option>Class 10 - Batch B</option>
                <option>Class 11 - Batch A</option>
                <option>Class 12 - Batch A</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
              />
            </div>
            <div className="flex items-end gap-2 ml-auto">
              <Button variant="outline" size="md" onClick={markAllPresent}>
                <CheckCircle className="h-4 w-4" />
                Mark All Present
              </Button>
              <Button variant="primary" size="md" onClick={saveAttendance}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-success-light rounded-[12px] p-4 text-center border border-success/10">
          <p className="text-2xl font-bold text-success">{presentCount}</p>
          <p className="text-xs text-success font-medium mt-1">Present</p>
        </div>
        <div className="bg-error-light rounded-[12px] p-4 text-center border border-error/10">
          <p className="text-2xl font-bold text-error">{absentCount}</p>
          <p className="text-xs text-error font-medium mt-1">Absent</p>
        </div>
        <div className="bg-warning-light rounded-[12px] p-4 text-center border border-warning/10">
          <p className="text-2xl font-bold text-warning">{lateCount}</p>
          <p className="text-xs text-warning font-medium mt-1">Late</p>
        </div>
      </div>

      {/* Attendance Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-text-tertiary" />
              {selectedBatch}
            </CardTitle>
            <Badge variant="outline">{total} students</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockStudentsInBatch.map((student, index) => {
              const status = attendance[student.id];
              const config = statusConfig[status];
              const Icon = config.icon;

              return (
                <motion.button
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleStatus(student.id)}
                  className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all cursor-pointer text-left ${config.bg} ${config.ring} ring-2`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{student.name}</p>
                    <p className="text-xs text-text-tertiary">{student.id}</p>
                  </div>
                  <Badge
                    variant={status === "Present" ? "success" : status === "Absent" ? "error" : "warning"}
                    className="text-[10px]"
                  >
                    {status}
                  </Badge>
                </motion.button>
              );
            })}
          </div>
          <p className="text-xs text-text-tertiary mt-4 text-center">
            Click on a student card to cycle through: Present → Absent → Late
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
