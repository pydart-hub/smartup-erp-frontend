"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck, Calendar, Search, Users, CheckCircle,
  XCircle, Clock, Loader2, UserX,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployeeAttendance, getEmployees } from "@/lib/api/employees";

export default function EmployeeAttendancePage() {
  const { defaultCompany } = useAuth();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  // Merge: show all employees with their attendance status (or "Not Marked")
  const merged = employees
    .filter((emp) =>
      !search || emp.employee_name.toLowerCase().includes(search.toLowerCase())
    )
    .map((emp) => {
      const att = attMap.get(emp.name);
      return {
        ...emp,
        attendance_status: att?.status ?? "Not Marked",
        attendance_name: att?.name,
      };
    });

  // Summary counts
  const presentCount = merged.filter((e) => e.attendance_status === "Present").length;
  const absentCount = merged.filter((e) => e.attendance_status === "Absent").length;
  const notMarkedCount = merged.filter((e) => e.attendance_status === "Not Marked").length;
  const otherCount = merged.length - presentCount - absentCount - notMarkedCount;

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    Present: { color: "text-success", bg: "bg-success-light", icon: CheckCircle },
    Absent: { color: "text-error", bg: "bg-error-light", icon: XCircle },
    "Half Day": { color: "text-warning", bg: "bg-warning-light", icon: Clock },
    "On Leave": { color: "text-info", bg: "bg-info/10", icon: UserX },
    "Work From Home": { color: "text-primary", bg: "bg-brand-wash", icon: Users },
    "Not Marked": { color: "text-text-tertiary", bg: "bg-app-bg", icon: Clock },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Employee Attendance
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track daily attendance for branch employees
        </p>
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
                  <motion.div
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border ${cfg.bg}`}
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
                      <Badge
                        variant={
                          emp.attendance_status === "Present" ? "success"
                          : emp.attendance_status === "Absent" ? "error"
                          : emp.attendance_status === "Not Marked" ? "default"
                          : "warning"
                        }
                        className="text-[10px]"
                      >
                        {emp.attendance_status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {attendanceRecords.length === 0 && (
              <p className="text-xs text-text-tertiary mt-4 text-center">
                No attendance records found for this date. Attendance may not have been marked yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
