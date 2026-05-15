"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Search, Save, Check, X, Clock, Coffee, Home,
  Loader2, AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getEmployees,
  getEmployeeAttendance,
  createEmployeeAttendance,
  updateEmployeeAttendance,
  type Employee,
  type EmployeeAttendance,
} from "@/lib/api/hr";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getInitials } from "@/lib/utils/formatters";
import { toast } from "sonner";

type AttendanceStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";

const STATUSES: { value: AttendanceStatus; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "Present", icon: Check, color: "text-success", bg: "bg-success" },
  { value: "Absent", icon: X, color: "text-error", bg: "bg-error" },
  { value: "Half Day", icon: Clock, color: "text-warning", bg: "bg-warning" },
  { value: "On Leave", icon: Coffee, color: "text-info", bg: "bg-info" },
  { value: "Work From Home", icon: Home, color: "text-secondary", bg: "bg-secondary" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HRAttendancePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [saving, setSaving] = useState(false);

  // ── Fetch employees ──
  const { data: employeesRes, isLoading: loadingEmployees } = useQuery({
    queryKey: ["hr-att-employees", defaultCompany],
    queryFn: () =>
      getEmployees({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        status: "Active",
        limit_page_length: 500,
      }),
    staleTime: 60_000,
  });

  // ── Fetch attendance for selected date ──
  const { data: attendanceRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["hr-att-records", selectedDate, defaultCompany],
    queryFn: () =>
      getEmployeeAttendance({
        date: selectedDate,
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
    staleTime: 30_000,
  });

  const employees = employeesRes?.data ?? [];
  const attendanceMap = useMemo(() => {
    const map = new Map<string, EmployeeAttendance>();
    (attendanceRes?.data ?? []).forEach((a) => map.set(a.employee, a));
    return map;
  }, [attendanceRes]);

  // Filter employees by search
  const filtered = useMemo(() => {
    if (!debouncedSearch) return employees;
    const q = debouncedSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.employee_name.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
  }, [employees, debouncedSearch]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, "Half Day": 0, "On Leave": 0, "Work From Home": 0, "Not Marked": 0 };
    employees.forEach((emp) => {
      const pending = pendingChanges[emp.name];
      const existing = attendanceMap.get(emp.name);
      const status = pending ?? existing?.status;
      if (status && status in counts) {
        counts[status as keyof typeof counts]++;
      } else {
        counts["Not Marked"]++;
      }
    });
    return counts;
  }, [employees, attendanceMap, pendingChanges]);

  const handleStatusClick = useCallback(
    (employeeId: string, status: AttendanceStatus) => {
      setPendingChanges((prev) => {
        const existing = attendanceMap.get(employeeId);
        // If clicking same status as current (and not already pending), remove pending
        if (existing?.status === status && !prev[employeeId]) return prev;
        // If clicking same status as pending, remove it
        if (prev[employeeId] === status) {
          const { [employeeId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [employeeId]: status };
      });
    },
    [attendanceMap]
  );

  // ── Save attendance ──
  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [empId, status] of Object.entries(pendingChanges)) {
      const existing = attendanceMap.get(empId);
      const emp = employees.find((e) => e.name === empId);
      const payload = {
        employee: empId,
        employee_name: emp?.employee_name ?? "",
        attendance_date: selectedDate,
        status,
        company: defaultCompany || emp?.company || "",
      };
      try {
        if (existing) {
          await updateEmployeeAttendance(existing.name, payload);
        } else {
          await createEmployeeAttendance(payload);
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setPendingChanges({});
    setSaving(false);
    await queryClient.invalidateQueries({ queryKey: ["hr-att-records"] });

    if (errorCount === 0) {
      toast.success(`Attendance saved for ${successCount} employee${successCount !== 1 ? "s" : ""}`);
    } else {
      toast.error(`${errorCount} failed, ${successCount} saved`);
    }
  };

  const pendingCount = Object.keys(pendingChanges).length;
  const statusBadgeVariant: Record<AttendanceStatus, "success" | "error" | "warning" | "info"> = {
    Present: "success",
    Absent: "error",
    "Half Day": "warning",
    "On Leave": "info",
    "Work From Home": "info",
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-24">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-border-light/70 bg-gradient-to-br from-surface via-surface to-brand-wash/35 shadow-card">
          <div className="pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full bg-primary/10 blur-2xl" />
          <CardContent className="relative p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-text-tertiary">
                  Human Resources
                </p>
                <h1 className="text-2xl sm:text-[30px] leading-tight font-semibold text-text-primary mt-1">
                  Employee Attendance
                </h1>
                <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
                  Mark and track daily employee attendance with a clear branch-ready view.
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <p className="text-xs font-medium text-text-tertiary">Attendance Date</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPendingChanges({});
                  }}
                  className="h-11 px-3.5 border border-border-light rounded-[12px] text-sm bg-surface text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <Card className="border-border-light/70 shadow-sm">
          <CardContent className="p-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                placeholder="Search by employee, ID, or department"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATUSES.map(({ value, bg, icon: Icon }) => (
          <Card key={value} className="border-border-light/70 hover:border-primary/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-8 h-8 rounded-[10px] ${bg} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-semibold text-text-primary leading-none">{summary[value]}</p>
              </div>
              <p className="text-[11px] text-text-tertiary uppercase tracking-[0.14em] font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-border-light/70 hover:border-primary/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="w-8 h-8 rounded-[10px] bg-text-tertiary text-white flex items-center justify-center shadow-sm">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-text-primary leading-none">{summary["Not Marked"]}</p>
            </div>
            <p className="text-[11px] text-text-tertiary uppercase tracking-[0.14em] font-semibold">Not Marked</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Attendance List */}
      {loadingEmployees || loadingAttendance ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <GifLoader />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-10 w-10 text-text-tertiary" />
            <p className="text-text-secondary">No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => {
            const existing = attendanceMap.get(emp.name);
            const currentStatus = pendingChanges[emp.name] ?? existing?.status ?? null;
            const isPending = emp.name in pendingChanges;

            return (
              <motion.div key={emp.name} variants={itemVariants}>
                <Card
                  className={`transition-all border shadow-sm ${
                    isPending
                      ? "border-primary/50 bg-gradient-to-r from-brand-wash/35 to-surface"
                      : "border-border-light/70"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        {emp.image ? (
                          <img
                            src={emp.image}
                            alt={emp.employee_name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-brand-wash flex items-center justify-center text-sm font-semibold text-primary ring-2 ring-white shadow-sm">
                            {getInitials(emp.employee_name)}
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {emp.employee_name}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {emp.department ?? "-"} | {emp.designation ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:ml-auto">
                        {currentStatus ? (
                          <Badge variant={statusBadgeVariant[currentStatus]} className="h-6 px-2.5">
                            {currentStatus}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-6 px-2.5">
                            Not Marked
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="default" className="h-6 px-2.5">
                            Pending Save
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-light/70 flex flex-wrap gap-2">
                      {STATUSES.map(({ value, icon: Icon, color, bg }) => {
                        const isActive = currentStatus === value;
                        return (
                          <button
                            key={value}
                            onClick={() => handleStatusClick(emp.name, value)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium transition-all border ${
                              isActive
                                ? `${bg} text-white border-transparent shadow-sm`
                                : `bg-surface ${color} border-border-light hover:bg-app-bg`
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Sticky Save Bar */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-4 bg-surface/95 backdrop-blur border border-border-light rounded-[14px] shadow-lg px-5 py-3">
            <span className="text-sm text-text-secondary whitespace-nowrap">
              <span className="font-semibold text-primary">{pendingCount}</span> unsaved change{pendingCount !== 1 ? "s" : ""}
            </span>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 h-9"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Attendance
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
