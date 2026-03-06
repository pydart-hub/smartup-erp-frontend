"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardEdit,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserX,
  Users,
  Save,
  RefreshCw,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getEmployees,
  getEmployeeAttendance,
  createEmployeeAttendance,
  updateEmployeeAttendance,
} from "@/lib/api/employees";

// ── Types ─────────────────────────────────────────────────────────────────────

type AttStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";

const STATUS_OPTIONS: { value: AttStatus; label: string; icon: React.ElementType; variant: "success" | "error" | "warning" | "default" }[] = [
  { value: "Present",          label: "Present",  icon: CheckCircle, variant: "success" },
  { value: "Absent",           label: "Absent",   icon: XCircle,     variant: "error"   },
  { value: "Half Day",         label: "Half Day", icon: Clock,       variant: "warning" },
  { value: "On Leave",         label: "On Leave", icon: UserX,       variant: "default" },
  { value: "Work From Home",   label: "WFH",      icon: Users,       variant: "default" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarkAttendancePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  // Map: employee name → chosen status (only modified entries)
  const [changes, setChanges] = useState<Record<string, AttStatus>>({});
  const [saveResult, setSaveResult] = useState<{ saved: number; failed: string[] } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["employees", defaultCompany, "Active"],
    queryFn: () =>
      getEmployees({ company: defaultCompany || undefined, status: "Active", limit_page_length: 500 }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });

  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: ["employee-attendance", defaultCompany, selectedDate],
    queryFn: () =>
      getEmployeeAttendance({ company: defaultCompany || undefined, date: selectedDate }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  const employees = empRes?.data ?? [];
  // Map employee → { name (doc id), status, docstatus } from existing attendance
  const existingMap = useMemo(
    () =>
      new Map(
        (attRes?.data ?? []).map((r) => [r.employee, { docId: r.name, status: r.status as AttStatus }])
      ),
    [attRes]
  );

  // Reset changes when date changes
  const handleDateChange = (d: string) => {
    setSelectedDate(d);
    setChanges({});
    setSaveResult(null);
  };

  const setStatus = (empName: string, status: AttStatus) => {
    setSaveResult(null);
    setChanges((prev) => ({ ...prev, [empName]: status }));
  };

  const getEffectiveStatus = (empName: string): AttStatus | null =>
    changes[empName] ?? existingMap.get(empName)?.status ?? null;

  // ── Summary counts ────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    let present = 0, absent = 0, halfDay = 0, onLeave = 0, wfh = 0, unmarked = 0;
    employees.forEach((e) => {
      const s = getEffectiveStatus(e.name);
      if (!s) unmarked++;
      else if (s === "Present") present++;
      else if (s === "Absent") absent++;
      else if (s === "Half Day") halfDay++;
      else if (s === "On Leave") onLeave++;
      else if (s === "Work From Home") wfh++;
    });
    return { present, absent, halfDay, onLeave, wfh, unmarked };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, changes, existingMap]);

  // ── Save mutation ─────────────────────────────────────────────────────────────

  const { mutate: saveAttendance, isPending: saving } = useMutation({
    mutationFn: async () => {
      const pending = Object.entries(changes);
      if (pending.length === 0) return { saved: 0, failed: [] };

      const failed: string[] = [];
      let saved = 0;

      for (const [empName, status] of pending) {
        const emp = employees.find((e) => e.name === empName);
        if (!emp) continue;
        const existing = existingMap.get(empName);
        const payload = {
          employee: emp.name,
          employee_name: emp.employee_name,
          attendance_date: selectedDate,
          status,
          company: emp.company,
        };

        try {
          if (existing) {
            await updateEmployeeAttendance(existing.docId, payload);
          } else {
            await createEmployeeAttendance(payload);
          }
          saved++;
        } catch {
          failed.push(emp.employee_name);
        }
      }
      return { saved, failed };
    },
    onSuccess: (result) => {
      setSaveResult(result);
      setChanges({});
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", defaultCompany, selectedDate] });
    },
  });

  const isLoading = empLoading || attLoading;
  const pendingCount = Object.keys(changes).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardEdit className="h-6 w-6 text-primary" />
            Mark Employee Attendance
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading ? "Loading…" : `${employees.length} active employees`}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
          />
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && employees.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Present",   count: summary.present,  color: "text-success" },
            { label: "Absent",    count: summary.absent,   color: "text-error" },
            { label: "Half Day",  count: summary.halfDay,  color: "text-warning" },
            { label: "On Leave",  count: summary.onLeave,  color: "text-info" },
            { label: "WFH",       count: summary.wfh,      color: "text-primary" },
            { label: "Unmarked",  count: summary.unmarked, color: "text-text-tertiary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${s.color}`}>{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Save result banner */}
      {saveResult && (
        <div className={`rounded-[10px] px-4 py-3 text-sm font-medium ${saveResult.failed.length === 0 ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20"}`}>
          {saveResult.saved > 0 && `✓ Saved attendance for ${saveResult.saved} employee${saveResult.saved > 1 ? "s" : ""}.`}
          {saveResult.failed.length > 0 && ` Failed: ${saveResult.failed.join(", ")} (may already be submitted).`}
        </div>
      )}

      {/* Employee List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-64" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">No active employees found.</div>
      ) : (
        <>
          <div className="space-y-2">
            {employees.map((emp, index) => {
              const effective = getEffectiveStatus(emp.name);
              const isPending = emp.name in changes;
              const existing = existingMap.get(emp.name);

              return (
                <motion.div
                  key={emp.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={`transition-all ${isPending ? "ring-1 ring-primary/40" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Employee Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center overflow-hidden flex-shrink-0">
                            {emp.image ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${emp.image}`}
                                alt={emp.employee_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-primary">
                                {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-text-primary truncate">
                              {emp.employee_name}
                            </p>
                            <p className="text-[11px] text-text-tertiary truncate">
                              {emp.designation || emp.department || emp.name}
                            </p>
                          </div>
                          {existing && !isPending && (
                            <Badge variant="default" className="text-[10px] flex-shrink-0">Saved</Badge>
                          )}
                          {isPending && (
                            <Badge variant="warning" className="text-[10px] flex-shrink-0">Pending</Badge>
                          )}
                        </div>

                        {/* Status Buttons */}
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_OPTIONS.map(({ value, label, icon: Icon, variant }) => {
                            const isSelected = effective === value;
                            return (
                              <button
                                key={value}
                                onClick={() => setStatus(emp.name, value)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-all border ${
                                  isSelected
                                    ? value === "Present" ? "bg-success text-white border-success"
                                    : value === "Absent"  ? "bg-error text-white border-error"
                                    : value === "Half Day" ? "bg-warning text-white border-warning"
                                    : "bg-primary text-white border-primary"
                                    : "bg-app-bg text-text-secondary border-border-input hover:bg-brand-wash"
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Sticky Save Bar */}
          <div className="sticky bottom-4 flex justify-end">
            <Card className="shadow-lg">
              <CardContent className="p-3 flex items-center gap-3">
                {pendingCount > 0 && (
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-primary">{pendingCount}</span> change{pendingCount > 1 ? "s" : ""} pending
                  </span>
                )}
                <Button
                  onClick={() => saveAttendance()}
                  disabled={pendingCount === 0 || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Save Attendance"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  );
}
