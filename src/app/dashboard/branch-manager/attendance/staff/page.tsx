"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Calendar, Search, Users, CheckCircle,
  XCircle, Clock, Loader2, UserX, Save, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getEmployeeAttendance,
  getEmployees,
  createEmployeeAttendance,
  updateEmployeeAttendance,
} from "@/lib/api/employees";

type StaffStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";

const STATUS_OPTIONS: StaffStatus[] = ["Present", "Absent", "Half Day", "On Leave", "Work From Home"];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; variant: "success" | "error" | "warning" | "default" }> = {
  Present: { color: "text-success", bg: "bg-success-light", icon: CheckCircle, variant: "success" },
  Absent: { color: "text-error", bg: "bg-error-light", icon: XCircle, variant: "error" },
  "Half Day": { color: "text-warning", bg: "bg-warning-light", icon: Clock, variant: "warning" },
  "On Leave": { color: "text-info", bg: "bg-info/10", icon: UserX, variant: "default" },
  "Work From Home": { color: "text-primary", bg: "bg-brand-wash", icon: Users, variant: "default" },
  "Not Marked": { color: "text-text-tertiary", bg: "bg-app-bg", icon: Clock, variant: "default" },
};

export default function StaffAttendancePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, StaffStatus>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset pending changes when date changes
  useEffect(() => {
    setPendingChanges({});
  }, [selectedDate]);

  // Fetch employees for the branch
  const { data: empRes } = useQuery({
    queryKey: ["employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active" }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });

  // Fetch attendance for selected date
  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: ["employee-attendance", defaultCompany, selectedDate],
    queryFn: () =>
      getEmployeeAttendance({
        company: defaultCompany || undefined,
        date: selectedDate,
      }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  const employees = empRes?.data ?? [];
  const attendanceRecords = attRes?.data ?? [];

  // Build lookup: employee name → attendance record
  const attMap = new Map(attendanceRecords.map((r) => [r.employee, r]));

  // Merge: show all employees with their attendance status
  const merged = employees
    .filter((emp) =>
      !search || emp.employee_name.toLowerCase().includes(search.toLowerCase())
    )
    .map((emp) => {
      const att = attMap.get(emp.name);
      const pendingStatus = pendingChanges[emp.name];
      return {
        ...emp,
        attendance_status: (pendingStatus ?? att?.status ?? "Not Marked") as string,
        attendance_name: att?.name,
        hasChange: pendingStatus !== undefined && pendingStatus !== (att?.status ?? "Not Marked"),
      };
    });

  // Summary counts (including pending changes)
  const presentCount = merged.filter((e) => e.attendance_status === "Present").length;
  const absentCount = merged.filter((e) => e.attendance_status === "Absent").length;
  const notMarkedCount = merged.filter((e) => e.attendance_status === "Not Marked").length;
  const otherCount = merged.length - presentCount - absentCount - notMarkedCount;

  const pendingCount = Object.keys(pendingChanges).length;

  // Cycle through statuses on click
  function cycleStatus(employeeId: string, currentStatus: string) {
    const currentIndex = STATUS_OPTIONS.indexOf(currentStatus as StaffStatus);
    const nextIndex = currentStatus === "Not Marked" ? 0 : (currentIndex + 1) % STATUS_OPTIONS.length;
    const nextStatus = STATUS_OPTIONS[nextIndex];

    // Check if the new status matches the original (no change needed)
    const original = attMap.get(employeeId)?.status ?? "Not Marked";
    if (nextStatus === original) {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
    } else {
      setPendingChanges((prev) => ({ ...prev, [employeeId]: nextStatus }));
    }
  }

  // Mark all present
  function markAllPresent() {
    const changes: Record<string, StaffStatus> = {};
    for (const emp of employees) {
      const original = attMap.get(emp.name)?.status;
      if (original !== "Present") {
        changes[emp.name] = "Present";
      }
    }
    setPendingChanges(changes);
  }

  // Save attendance
  const saveAttendance = useCallback(async () => {
    if (pendingCount === 0) return;
    setSaving(true);
    try {
      const promises = Object.entries(pendingChanges).map(async ([empId, status]) => {
        const existing = attMap.get(empId);
        const emp = employees.find((e) => e.name === empId);
        if (!emp) return;

        const payload = {
          employee: empId,
          employee_name: emp.employee_name,
          attendance_date: selectedDate,
          status,
          company: defaultCompany || "",
        };

        if (existing) {
          // Cancel old → create new submitted record
          await updateEmployeeAttendance(existing.name, payload);
        } else {
          // Create new submitted record
          await createEmployeeAttendance(payload);
        }
      });

      await Promise.all(promises);
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-quick"] });
      toast.success(`Staff attendance saved for ${selectedDate}`);
    } catch {
      toast.error("Failed to save some records. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, pendingCount, attMap, employees, selectedDate, defaultCompany, queryClient]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/attendance">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-info" />
              Staff Attendance
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Mark daily attendance for branch employees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={markAllPresent} disabled={attLoading || employees.length === 0}>
            <CheckCircle className="h-4 w-4" />
            Mark All Present
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={saveAttendance}
            disabled={saving || pendingCount === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {pendingCount > 0 && `(${pendingCount})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-xs text-success font-medium mt-1">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{absentCount}</p>
            <p className="text-xs text-error font-medium mt-1">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-tertiary">{notMarkedCount}</p>
            <p className="text-xs text-text-tertiary font-medium mt-1">Not Marked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">{otherCount}</p>
            <p className="text-xs text-info font-medium mt-1">Leave / Other</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by employee name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      {attLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : merged.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">
          No employees found for this branch.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-text-tertiary" />
                Employees
              </CardTitle>
              <Badge variant="outline">{merged.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {merged.map((emp, index) => {
                const cfg = statusConfig[emp.attendance_status] ?? statusConfig["Not Marked"];
                const Icon = cfg.icon;

                return (
                  <motion.button
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => cycleStatus(emp.name, emp.attendance_status)}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all cursor-pointer text-left ${cfg.bg} ${
                      emp.hasChange ? "ring-2 ring-primary/30 border-primary/20" : "border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.image ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${emp.image}`}
                          alt={emp.employee_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {emp.employee_name}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {emp.designation || emp.department || emp.name}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <Badge variant={cfg.variant} className="text-[10px]">
                        {emp.attendance_status}
                      </Badge>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <p className="text-xs text-text-tertiary mt-4 text-center">
              Click on an employee card to cycle through: Present → Absent → Half Day → On Leave → Work From Home
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sticky save bar when there are pending changes */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-surface border border-border-card rounded-2xl shadow-lg px-6 py-3 flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-primary">{pendingCount}</span> unsaved change{pendingCount > 1 ? "s" : ""}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={saveAttendance}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Attendance
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
