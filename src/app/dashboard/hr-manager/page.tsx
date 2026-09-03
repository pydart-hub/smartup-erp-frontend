"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CalendarDays,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  MapPin,
  ExternalLink,
  Palmtree,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAllBranches } from "@/lib/api/director";
import { getEmployees, getEmployeeAttendance } from "@/lib/api/employees";

// Status configuration for badges and counts
const statusConfig: Record<
  string,
  { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Present: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
  Absent: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", icon: XCircle },
  "Half Day": { color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  "On Leave": { color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10", icon: Clock },
  "Work From Home": { color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10", icon: Users },
  "At Head Office": { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", icon: Building2 },
  Holiday: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", icon: Palmtree },
  "Not Marked": { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-500/10", icon: Clock },
};

function formatDisplayTime(val?: string | null): string {
  if (!val) return "-";
  let raw = val;
  if (raw.includes("T")) {
    raw = raw.split("T")[1] || "";
  } else if (raw.includes(" ")) {
    raw = raw.split(" ")[1] || "";
  }
  return raw.slice(0, 5);
}

export default function HRBranchAttendanceDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Modal State
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState("All");

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["hr-branches"],
    queryFn: getAllBranches,
    staleTime: 5 * 60_000,
  });

  // Fetch all active employees
  const { data: employeesRes, isLoading: loadingEmployees } = useQuery({
    queryKey: ["hr-all-employees"],
    queryFn: () => getEmployees({ status: "Active", limit_page_length: 1000 }),
    staleTime: 5 * 60_000,
  });

  // Fetch today's / selected date's attendance
  const { data: attendanceRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["hr-all-attendance", selectedDate],
    queryFn: () => getEmployeeAttendance({ date: selectedDate, limit_page_length: 1000 }),
    staleTime: 60_000,
  });

  const allEmployees = employeesRes?.data ?? [];
  const allAttendance = attendanceRes?.data ?? [];

  // Group data by branch (company)
  const branchData = useMemo(() => {
    // Lookup mapping employee code/name to attendance record
    const attMap = new Map(allAttendance.map((a) => [a.employee, a]));

    return branches
      .filter((branch) => branch.name !== "Smart Up")
      .map((branch) => {
      const branchEmployees = allEmployees.filter((e) => e.company === branch.name);
      
      let present = 0;
      let absent = 0;
      let halfDay = 0;
      let onLeave = 0;
      let wfh = 0;
      let atHeadOffice = 0;
      let holiday = 0;
      let notMarked = 0;

      const employeeDetails = branchEmployees.map((emp) => {
        const att = attMap.get(emp.name);
        const status = att?.status ?? "Not Marked";

        if (status === "Present") present++;
        else if (status === "Absent") absent++;
        else if (status === "Half Day") halfDay++;
        else if (status === "On Leave") onLeave++;
        else if (status === "Work From Home") wfh++;
        else if (status === "At Head Office") atHeadOffice++;
        else if (status === "Holiday") holiday++;
        else notMarked++;

        return {
          ...emp,
          attendanceStatus: status,
          inTime: formatDisplayTime(att?.in_time || att?.custom_check_in),
          outTime: formatDisplayTime(att?.out_time || att?.custom_check_out),
        };
      });

      const total = branchEmployees.length;
      const rate = total > 0 ? Math.round(((present + wfh + atHeadOffice + halfDay * 0.5) / total) * 100) : 0;

      return {
        branchName: branch.name,
        shortName: branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ"),
        employees: employeeDetails,
        total,
        rate,
        stats: { present, absent, halfDay, onLeave, wfh, atHeadOffice, holiday, notMarked },
      };
    });
  }, [branches, allEmployees, allAttendance]);

  // Overall statistics
  const summary = useMemo(() => {
    let totalEmployees = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalOnLeave = 0;
    let totalWfh = 0;
    let totalAtHeadOffice = 0;
    let totalHoliday = 0;

    branchData.forEach((b) => {
      totalEmployees += b.total;
      totalPresent += b.stats.present;
      totalAbsent += b.stats.absent;
      totalOnLeave += b.stats.onLeave + b.stats.halfDay; // count half day here or separate
      totalWfh += b.stats.wfh;
      totalAtHeadOffice += b.stats.atHeadOffice || 0;
      totalHoliday += b.stats.holiday || 0;
    });

    const attendanceRate = totalEmployees > 0 
      ? Math.round(((totalPresent + totalWfh + totalAtHeadOffice) / totalEmployees) * 100) 
      : 0;

    return {
      totalEmployees,
      attendanceRate,
      totalPresent,
      totalAbsent,
      totalOnLeave,
      totalWfh,
      totalAtHeadOffice,
      totalHoliday,
    };
  }, [branchData]);

  // Find currently open branch detail
  const currentBranchDetail = useMemo(() => {
    return branchData.find((b) => b.branchName === activeBranch);
  }, [branchData, activeBranch]);

  // Filtered employees for the modal
  const filteredModalEmployees = useMemo(() => {
    if (!currentBranchDetail) return [];
    return currentBranchDetail.employees.filter((emp) => {
      const matchSearch = emp.employee_name.toLowerCase().includes(modalSearch.toLowerCase()) || 
        emp.name.toLowerCase().includes(modalSearch.toLowerCase());
      
      const matchStatus = modalStatusFilter === "All" || emp.attendanceStatus === modalStatusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [currentBranchDetail, modalSearch, modalStatusFilter]);

  const isLoading = loadingBranches || loadingEmployees || loadingAttendance;

  return (
    <div className="space-y-6 pb-12">
      <BreadcrumbNav />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Staff Attendance Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time branch-wise attendance status of all {branches.length || 9} branches.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <CalendarDays className="h-5 w-5 text-slate-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44 border-none shadow-none focus-visible:ring-0 p-0 text-sm font-medium bg-transparent text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading branch attendance records...</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border-violet-100 dark:border-violet-950">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-500">Total Staff</p>
                  <p className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 mt-1">
                    {summary.totalEmployees}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Active across all branches</span>
                </div>
                <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-100 dark:border-emerald-950">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Attendance Rate</p>
                  <p className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 mt-1">
                    {summary.attendanceRate}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Present today + WFH</span>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border-teal-100 dark:border-teal-950">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-500">Present Today</p>
                  <p className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 mt-1">
                    {summary.totalPresent}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Excluding leaves / absences</span>
                </div>
                <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/5 to-orange-500/5 border-rose-100 dark:border-rose-950">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Leaves / Absences</p>
                  <p className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 mt-1">
                    {summary.totalAbsent + summary.totalOnLeave}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {summary.totalAbsent} Abs. &bull; {summary.totalOnLeave} Leaves
                  </span>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                  <XCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branchData.map((branch, index) => {
              const ringColor = branch.rate > 80 
                ? "stroke-emerald-500" 
                : branch.rate > 50 
                  ? "stroke-amber-500" 
                  : "stroke-rose-500";

              return (
                <motion.div
                  key={branch.branchName}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => {
                    setActiveBranch(branch.branchName);
                    setModalStatusFilter("All");
                    setModalSearch("");
                  }}
                  className="cursor-pointer group"
                >
                  <Card hover className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-all duration-300 hover:border-violet-500/30">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-violet-500" />
                          {branch.shortName}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 mt-0.5">
                          {branch.total} Total Staff
                        </CardDescription>
                      </div>
                      
                      {/* Circular Progress Indicator */}
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="stroke-slate-100 dark:stroke-slate-800"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={`${ringColor} transition-all duration-500`}
                            strokeDasharray={`${branch.rate}, 100`}
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-slate-800 dark:text-slate-200">
                          {branch.rate}%
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2">
                      <div className="grid grid-cols-3 gap-2 text-center mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Present</p>
                          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {branch.stats.present + branch.stats.wfh}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Absent</p>
                          <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                            {branch.stats.absent}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Leaves / WFH</p>
                          <p className="text-base font-bold text-blue-500 dark:text-blue-400 mt-0.5">
                            {branch.stats.onLeave + branch.stats.wfh}
                          </p>
                        </div>
                      </div>

                      {/* Not marked warning indicator */}
                      {branch.stats.notMarked > 0 && (
                        <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {branch.stats.notMarked} pending check-in
                          </span>
                          <span className="text-violet-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
                            Details <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Slide-over / Modal for detailed branch attendance */}
      <AnimatePresence>
        {activeBranch && currentBranchDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveBranch(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Content Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg md:max-w-xl h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-violet-500" />
                    {currentBranchDetail.shortName} Branch Staff
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentBranchDetail.total} Total active employees &bull; {selectedDate}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setActiveBranch(null)} className="h-8 w-8 rounded-lg">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Filters & Search controls */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/10 space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search staff by name or ID..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Status Quick Filter Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Present", "Absent", "Half Day", "On Leave", "Work From Home", "At Head Office", "Holiday", "Not Marked"].map((status) => {
                    const count = status === "All" 
                      ? currentBranchDetail.total 
                      : status === "Present" 
                        ? currentBranchDetail.stats.present 
                        : status === "Absent" 
                          ? currentBranchDetail.stats.absent 
                          : status === "Half Day" 
                            ? currentBranchDetail.stats.halfDay 
                            : status === "On Leave" 
                              ? currentBranchDetail.stats.onLeave 
                              : status === "Work From Home" 
                                ? currentBranchDetail.stats.wfh 
                                : status === "At Head Office"
                                  ? currentBranchDetail.stats.atHeadOffice
                                  : status === "Holiday"
                                    ? currentBranchDetail.stats.holiday
                                    : currentBranchDetail.stats.notMarked;

                    return (
                      <button
                        key={status}
                        onClick={() => setModalStatusFilter(status)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          modalStatusFilter === status
                            ? "bg-violet-500 text-white shadow-sm shadow-violet-500/20"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {status} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Staff List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {filteredModalEmployees.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400">No staff found matching the filter criteria.</p>
                  </div>
                ) : (
                  filteredModalEmployees.map((emp) => {
                    const config = statusConfig[emp.attendanceStatus] || statusConfig["Not Marked"];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={emp.name}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-950 dark:text-slate-50 text-sm">
                            {emp.employee_name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                            <span>ID: {emp.name}</span>
                            <span>&bull;</span>
                            <span>{emp.designation || "Staff"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6">
                          {/* Timings */}
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-semibold text-slate-400">In:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{emp.inTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-400">Out:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{emp.outTime}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <Badge className={`${config.bg} ${config.color} border-none font-semibold px-2.5 py-1 flex items-center gap-1 text-[11px] shadow-none`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {emp.attendanceStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
