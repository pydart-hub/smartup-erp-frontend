"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Building2,
  Briefcase,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserX,
  ClipboardEdit,
  Save,
  RefreshCw,
  X,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
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

//  Attendance status options 

type AttStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";

const ATT_OPTIONS: {
  value: AttStatus;
  label: string;
  icon: React.ElementType;
  active: string;
}[] = [
  { value: "Present",        label: "Present",  icon: CheckCircle, active: "bg-success text-white border-success" },
  { value: "Absent",         label: "Absent",   icon: XCircle,     active: "bg-error text-white border-error" },
  { value: "Half Day",       label: "Half Day", icon: Clock,       active: "bg-warning text-white border-warning" },
  { value: "On Leave",       label: "On Leave", icon: UserX,       active: "bg-info text-white border-info" },
  { value: "Work From Home", label: "WFH",      icon: Users,       active: "bg-primary text-white border-primary" },
];

const ATT_VIEW_CONFIG: Record<
  string,
  { variant: "success" | "error" | "warning" | "default"; icon: React.ElementType; color: string }
> = {
  Present:          { variant: "success", icon: CheckCircle, color: "text-success" },
  Absent:           { variant: "error",   icon: XCircle,     color: "text-error" },
  "Half Day":       { variant: "warning", icon: Clock,       color: "text-warning" },
  "On Leave":       { variant: "default", icon: UserX,       color: "text-info" },
  "Work From Home": { variant: "default", icon: Users,       color: "text-primary" },
};

//  Page 

export default function EmployeesPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [markMode, setMarkMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, AttStatus>>({});
  const [saveResult, setSaveResult] = useState<{ saved: number; failed: string[] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  //  Queries 

  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["employees", defaultCompany, search, statusFilter],
    queryFn: () =>
      getEmployees({
        company: defaultCompany || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
    staleTime: 60_000,
    enabled: !!defaultCompany,
  });

  const { data: empAttRes, isLoading: attLoading } = useQuery({
    queryKey: ["employee-attendance", defaultCompany, selectedDate],
    queryFn: () =>
      getEmployeeAttendance({ company: defaultCompany || undefined, date: selectedDate }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  const employees = empRes?.data ?? [];

  // existingMap: employee name  { docId, status }
  const existingMap = useMemo(
    () =>
      new Map(
        (empAttRes?.data ?? []).map((r) => [
          r.employee,
          { docId: r.name, status: r.status as AttStatus },
        ])
      ),
    [empAttRes]
  );

  const isLoading = empLoading || attLoading;

  //  Derived counts 

  const getEffectiveStatus = (empName: string): AttStatus | null =>
    changes[empName] ?? existingMap.get(empName)?.status ?? null;

  const presentCount  = employees.filter((e) => getEffectiveStatus(e.name) === "Present").length;
  const absentCount   = employees.filter((e) => getEffectiveStatus(e.name) === "Absent").length;
  const otherCount    = employees.filter((e) => {
    const s = getEffectiveStatus(e.name);
    return s && s !== "Present" && s !== "Absent";
  }).length;
  const notMarkedCount = employees.filter((e) => !getEffectiveStatus(e.name)).length;
  const pendingCount  = Object.keys(changes).length;

  //  Mark mode helpers 

  const toggleMarkMode = () => {
    setMarkMode((v) => !v);
    setChanges({});
    setSaveResult(null);
  };

  const setStatus = (empName: string, status: AttStatus) => {
    setSaveResult(null);
    setChanges((prev) => ({ ...prev, [empName]: status }));
  };

  const handleDateChange = (d: string) => {
    setSelectedDate(d);
    setChanges({});
    setSaveResult(null);
  };

  //  Save mutation 

  const { mutate: saveAttendance, isPending: saving } = useMutation({
    mutationFn: async () => {
      const pending = Object.entries(changes);
      if (!pending.length) return { saved: 0, failed: [] };

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
      queryClient.invalidateQueries({
        queryKey: ["employee-attendance", defaultCompany, selectedDate],
      });
    },
  });

  const STATUS_TABS = [
    { value: "Active",   label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "Left",     label: "Left" },
    { value: "",         label: "All" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Employees
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading
              ? "Loading"
              : `${employees.length} employees  attendance for ${selectedDate}`}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {/* Manage Instructor Roles link */}
          <Link
            href="/dashboard/branch-manager/employees/manage-instructors"
            className="h-10 px-4 rounded-[10px] text-sm font-medium flex items-center gap-2 transition-all border bg-brand-wash text-primary border-primary/20 hover:border-primary/40"
          >
            <Shield className="h-4 w-4" /> Instructor Roles
          </Link>
          {/* Date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
            />
          </div>
          {/* Mark attendance toggle */}
          <button
            onClick={toggleMarkMode}
            className={`h-10 px-4 rounded-[10px] text-sm font-medium flex items-center gap-2 transition-all border ${
              markMode
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-app-bg text-text-secondary border-border-input hover:bg-brand-wash"
            }`}
          >
            {markMode ? (
              <><X className="h-4 w-4" /> Cancel</>
            ) : (
              <><ClipboardEdit className="h-4 w-4" /> Mark Attendance</>
            )}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-2xl font-bold text-warning">{otherCount}</p>
            <p className="text-xs text-warning font-medium mt-1">Leave / WFH</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-tertiary">{notMarkedCount}</p>
            <p className="text-xs text-text-tertiary font-medium mt-1">Not Marked</p>
          </CardContent>
        </Card>
      </div>

      {/* Save result banner */}
      {saveResult && (
        <div className={`rounded-[10px] px-4 py-3 text-sm font-medium ${
          saveResult.failed.length === 0
            ? "bg-success/10 text-success border border-success/20"
            : "bg-warning/10 text-warning border border-warning/20"
        }`}>
          {saveResult.saved > 0 &&
            ` Saved attendance for ${saveResult.saved} employee${saveResult.saved > 1 ? "s" : ""}.`}
          {saveResult.failed.length > 0 &&
            ` Failed: ${saveResult.failed.join(", ")} (may already be submitted).`}
        </div>
      )}

      {/* Search + status filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all ${
                    statusFilter === tab.value
                      ? "bg-primary text-white"
                      : "bg-app-bg text-text-secondary hover:bg-brand-wash"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/*  Employee List  */}
      {isLoading ? (
        <div className={markMode ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">No employees found.</div>
      ) : markMode ? (
        /*  MARK MODE: list layout with status buttons  */
        <>
          <div className="space-y-2">
            {employees.map((emp, index) => {
              const effective = getEffectiveStatus(emp.name);
              const isPending = emp.name in changes;
              const hasSaved  = !isPending && existingMap.has(emp.name);

              return (
                <motion.div
                  key={emp.name}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={`transition-all ${isPending ? "ring-1 ring-primary/40" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Info */}
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
                          {hasSaved && (
                            <Badge variant="default" className="text-[10px] flex-shrink-0">Saved</Badge>
                          )}
                          {isPending && (
                            <Badge variant="warning" className="text-[10px] flex-shrink-0">Pending</Badge>
                          )}
                        </div>

                        {/* Status buttons */}
                        <div className="flex gap-1.5 flex-wrap">
                          {ATT_OPTIONS.map(({ value, label, icon: Icon, active }) => (
                            <button
                              key={value}
                              onClick={() => setStatus(emp.name, value)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-all border ${
                                effective === value
                                  ? active
                                  : "bg-app-bg text-text-secondary border-border-input hover:bg-brand-wash"
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-4 flex justify-end">
            <Card className="shadow-lg">
              <CardContent className="p-3 flex items-center gap-3">
                {pendingCount > 0 && (
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-primary">{pendingCount}</span>{" "}
                    change{pendingCount > 1 ? "s" : ""} pending
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
                  {saving ? "Saving" : "Save Attendance"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /*  VIEW MODE: card grid with attendance badge  */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp, index) => {
            const attStatus = getEffectiveStatus(emp.name);
            const attCfg = attStatus
              ? ATT_VIEW_CONFIG[attStatus] ?? {
                  variant: "default" as const,
                  icon: Clock,
                  color: "text-text-tertiary",
                }
              : null;
            const AttIcon = attCfg?.icon;

            return (
              <motion.div
                key={emp.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-brand-wash flex items-center justify-center overflow-hidden flex-shrink-0">
                        {emp.image ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${emp.image}`}
                            alt={emp.employee_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-primary">
                            {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <h3 className="font-semibold text-text-primary truncate">
                            {emp.employee_name}
                          </h3>
                          <Badge
                            variant={
                              emp.status === "Active"
                                ? "success"
                                : emp.status === "Left"
                                ? "error"
                                : "default"
                            }
                            className="text-[10px] flex-shrink-0"
                          >
                            {emp.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-text-secondary font-mono mb-2">{emp.name}</p>

                        <div className="space-y-1">
                          {emp.designation && (
                            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <Briefcase className="h-3 w-3 text-text-tertiary" />
                              <span className="truncate">{emp.designation}</span>
                            </div>
                          )}
                          {emp.department && (
                            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <Building2 className="h-3 w-3 text-text-tertiary" />
                              <span className="truncate">{emp.department}</span>
                            </div>
                          )}
                          {emp.user_id && (
                            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <Mail className="h-3 w-3 text-text-tertiary" />
                              <span className="truncate">{emp.user_id}</span>
                            </div>
                          )}
                        </div>

                        {/* Attendance row */}
                        <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-1.5">
                          {AttIcon && attCfg ? (
                            <>
                              <AttIcon className={`h-3.5 w-3.5 ${attCfg.color}`} />
                              <Badge variant={attCfg.variant} className="text-[10px]">
                                {attStatus}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">Not marked</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}