"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Users,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getEmployees,
  getEmployeeAttendance,
} from "@/lib/api/employees";

const statusConfig: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; variant: "success" | "error" | "warning" | "default" }
> = {
  Present: { color: "text-success", bg: "bg-success/5", icon: CheckCircle, variant: "success" },
  Absent: { color: "text-error", bg: "bg-error/5", icon: XCircle, variant: "error" },
  "Half Day": { color: "text-warning", bg: "bg-warning/5", icon: Clock, variant: "warning" },
  "On Leave": { color: "text-info", bg: "bg-info/10", icon: Clock, variant: "default" },
  "Work From Home": { color: "text-primary", bg: "bg-brand-wash", icon: Users, variant: "default" },
  "Not Marked": { color: "text-text-tertiary", bg: "bg-app-bg", icon: Clock, variant: "default" },
};

export default function DirectorStaffBranchAttendancePage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.branchId as string);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  // Fetch employees for the branch
  const { data: empRes } = useQuery({
    queryKey: ["employees", branchName],
    queryFn: () =>
      getEmployees({ company: branchName, status: "Active" }),
    staleTime: 5 * 60_000,
  });

  // Fetch attendance for selected date
  const {
    data: attRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["employee-attendance", branchName, selectedDate],
    queryFn: () =>
      getEmployeeAttendance({
        company: branchName,
        date: selectedDate,
      }),
    staleTime: 60_000,
  });

  const employees = empRes?.data ?? [];
  const attendanceRecords = attRes?.data ?? [];

  // Build lookup: employee name → attendance record
  const attMap = new Map(attendanceRecords.map((r) => [r.employee, r]));

  // Merge employees with their attendance status
  const merged = employees.map((emp) => {
    const att = attMap.get(emp.name);
    return {
      ...emp,
      attendance_status: (att?.status ?? "Not Marked") as string,
    };
  });

  const presentCount = merged.filter((e) => e.attendance_status === "Present").length;
  const absentCount = merged.filter((e) => e.attendance_status === "Absent").length;
  const notMarkedCount = merged.filter((e) => e.attendance_status === "Not Marked").length;
  const otherCount = merged.length - presentCount - absentCount - notMarkedCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/director/attendance/staff">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Staff Attendance — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {merged.length} employees
          </p>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-text-tertiary" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-xs text-text-tertiary">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{absentCount}</p>
            <p className="text-xs text-text-tertiary">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-tertiary">
              {notMarkedCount}
            </p>
            <p className="text-xs text-text-tertiary">Not Marked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">{otherCount}</p>
            <p className="text-xs text-text-tertiary">Leave / Other</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load attendance</p>
        </div>
      ) : merged.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <ClipboardCheck className="h-8 w-8 text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">
            No employees found for this branch
          </p>
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
              {merged.map((emp) => {
                const cfg =
                  statusConfig[emp.attendance_status] ??
                  statusConfig["Not Marked"];
                const Icon = cfg.icon;

                return (
                  <div
                    key={emp.name}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border border-transparent ${cfg.bg}`}
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
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
