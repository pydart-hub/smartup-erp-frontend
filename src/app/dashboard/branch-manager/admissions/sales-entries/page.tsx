"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Award,
  Users,
  Building2,
  Database,
  Loader2,
  Sparkles,
  UserCheck,
  ShieldCheck,
  X,
  User,
  GraduationCap,
  Layers,
  FileText,
  Mail,
  ExternalLink,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBranches } from "@/lib/api/enrollment";
import {
  getSalesUserAdmissions,
  getSalesAdmissionStats,
} from "@/lib/api/salesAdmission";
import type { SalesAdmissionEntry } from "@/lib/types/salesAdmission";

export default function BranchManagerSalesAdmissionsPage() {
  const { defaultCompany } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>(
    defaultCompany || "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("ALL");
  const [selectedSalesRepFilter, setSelectedSalesRepFilter] = useState("ALL");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<"ALL" | "TODAY" | "THIS_MONTH">("ALL");

  // Selected student entry for full detail modal
  const [selectedStudentEntry, setSelectedStudentEntry] =
    useState<SalesAdmissionEntry | null>(null);

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  // Fetch admissions for the selected branch
  const { data: admissions = [], isLoading: isLoadingAdmissions } = useQuery({
    queryKey: ["branch-sales-admissions", selectedBranch],
    queryFn: () => getSalesUserAdmissions(undefined, selectedBranch),
  });

  // Fetch stats for the selected branch
  const { data: stats } = useQuery({
    queryKey: ["branch-sales-admission-stats", selectedBranch],
    queryFn: () => getSalesAdmissionStats(undefined, selectedBranch),
  });

  // Sales representatives performance breakdown for this branch
  const salesRepPerformance = useMemo(() => {
    const map: Record<
      string,
      {
        email: string;
        name: string;
        count: number;
        entries: SalesAdmissionEntry[];
      }
    > = {};

    admissions.forEach((entry) => {
      const email = entry.sales_user || "unknown";
      const name = entry.sales_user_name || entry.sales_user || "Sales User";
      if (!map[email]) {
        map[email] = {
          email,
          name,
          count: 0,
          entries: [],
        };
      }
      map[email].count += 1;
      map[email].entries.push(entry);
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [admissions]);

  // Filtered admissions
  const filteredAdmissions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return admissions.filter((entry) => {
      const matchesSearch =
        entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.sales_user_name &&
          entry.sales_user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.name && entry.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPlan =
        selectedPlanFilter === "ALL" || entry.plan === selectedPlanFilter;
      const matchesSalesRep =
        selectedSalesRepFilter === "ALL" || entry.sales_user === selectedSalesRepFilter;

      const matchesTime =
        selectedTimeFilter === "ALL" ||
        (selectedTimeFilter === "TODAY" &&
          (entry.admission_date === todayStr ||
            (entry.creation && entry.creation.startsWith(todayStr)))) ||
        (selectedTimeFilter === "THIS_MONTH" &&
          (entry.admission_date.startsWith(currentMonthStr) ||
            (entry.creation && entry.creation.startsWith(currentMonthStr))));

      return matchesSearch && matchesPlan && matchesSalesRep && matchesTime;
    });
  }, [admissions, searchTerm, selectedPlanFilter, selectedSalesRepFilter, selectedTimeFilter]);

  // Handle Sales Rep Card click to toggle filtering
  const handleSalesRepClick = (repEmail: string) => {
    if (selectedSalesRepFilter === repEmail) {
      setSelectedSalesRepFilter("ALL");
    } else {
      setSelectedSalesRepFilter(repEmail);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 selection:bg-[#673AB7] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {/* Navigation Breadcrumb */}
        <BreadcrumbNav />

        {/* Executive Branch Header Banner */}
        <div className="mt-3 mb-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-purple-950/40 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-xl p-4 sm:p-6 shadow-sm border-t-2 border-t-white dark:border-t-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-purple-200/80 dark:border-purple-800/80 text-[11px] font-semibold text-[#673AB7] dark:text-purple-300 shadow-xs">
              <Database className="h-3 w-3 text-[#673AB7] dark:text-purple-400 shrink-0" />
              <span>Frappe ERP Live Branch Admissions</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-r from-[#673AB7] to-[#512DA8] text-white shadow-xs">
                <ClipboardList className="h-5 w-5 text-white" />
              </span>
              Branch Sales Admissions Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comprehensive view of student admissions logged by sales representatives for{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {selectedBranch === "ALL" ? "All Branches" : selectedBranch}
              </strong>.
            </p>
          </div>

          {/* Branch Filter Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Building2 className="h-4 w-4 text-[#673AB7] dark:text-purple-400 shrink-0 ml-1" />
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#673AB7] cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">
                All Branches Overview
              </option>
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-white dark:bg-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Interactive 3D KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 mb-8">
          {/* Card 1: Total Admissions */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedTimeFilter("ALL")}
            className={`rounded-2xl border backdrop-blur-xl p-4 shadow-xs border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
              selectedTimeFilter === "ALL"
                ? "bg-purple-50/90 dark:bg-purple-950/60 border-[#673AB7] ring-2 ring-[#673AB7]/30"
                : "bg-white/90 dark:bg-slate-900/90 border-purple-100/80 dark:border-slate-800/80 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Admissions
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight my-1">
              {stats?.total_count ?? 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#673AB7] dark:text-purple-300 font-semibold">
              <ShieldCheck className="h-3 w-3 text-[#673AB7]" />
              <span>Click to view all student data</span>
            </div>
          </motion.div>

          {/* Card 2: Logged Today */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() =>
              setSelectedTimeFilter((prev) => (prev === "TODAY" ? "ALL" : "TODAY"))
            }
            className={`rounded-2xl border backdrop-blur-xl p-4 shadow-xs border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
              selectedTimeFilter === "TODAY"
                ? "bg-purple-50/90 dark:bg-purple-950/60 border-[#673AB7] ring-2 ring-[#673AB7]/30"
                : "bg-white/90 dark:bg-slate-900/90 border-purple-100/80 dark:border-slate-800/80 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Logged Today
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight my-1">
              {stats?.today_count ?? 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Sparkles className="h-3 w-3 text-[#673AB7]" />
              <span>Click to view today's student data</span>
            </div>
          </motion.div>

          {/* Card 3: This Month */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() =>
              setSelectedTimeFilter((prev) => (prev === "THIS_MONTH" ? "ALL" : "THIS_MONTH"))
            }
            className={`rounded-2xl border backdrop-blur-xl p-4 shadow-xs border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
              selectedTimeFilter === "THIS_MONTH"
                ? "bg-purple-50/90 dark:bg-purple-950/60 border-[#673AB7] ring-2 ring-[#673AB7]/30"
                : "bg-white/90 dark:bg-slate-900/90 border-purple-100/80 dark:border-slate-800/80 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                This Month
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight my-1">
              {stats?.this_month_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              <span>Click to view this month's student data</span>
            </div>
          </motion.div>

          {/* Card 4: Active Sales Reps */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedSalesRepFilter("ALL")}
            className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/80 dark:border-slate-800/80 backdrop-blur-xl p-4 shadow-xs border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between cursor-pointer hover:border-purple-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Sales Reps
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight my-1">
              {salesRepPerformance.length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              <span>Click to view sales reps & student entries</span>
            </div>
          </motion.div>
        </div>

        {/* Interactive Sales Representative Breakdown Cards */}
        <div className="mb-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/80 dark:border-slate-800/80 backdrop-blur-xl p-5 shadow-xs border-t-2 border-t-white dark:border-t-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#673AB7] dark:text-purple-400" />
                Sales Representatives Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Click any sales representative card below to view their student admission data.
              </p>
            </div>
            {selectedSalesRepFilter !== "ALL" && (
              <button
                onClick={() => setSelectedSalesRepFilter("ALL")}
                className="self-start sm:self-auto text-xs text-[#673AB7] dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Show All Sales Reps
              </button>
            )}
          </div>

          {salesRepPerformance.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              No sales representative entries recorded for this branch yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {salesRepPerformance.map((rep) => {
                const isSelected = selectedSalesRepFilter === rep.email;
                return (
                  <motion.div
                    key={rep.email}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSalesRepClick(rep.email)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-purple-50 dark:bg-purple-950/60 border-[#673AB7] ring-2 ring-[#673AB7]/30 shadow-sm"
                        : "bg-slate-50/80 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#673AB7] to-[#512DA8] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                          {rep.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rep.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {rep.email}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 dark:bg-purple-900/80 text-[#673AB7] dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                        {rep.count} Admissions
                      </span>
                    </div>

                    {/* Student Preview List inside the card */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Student Admissions Took:
                      </p>
                      <div className="space-y-1">
                        {rep.entries.slice(0, 3).map((st) => (
                          <div
                            key={st.name || st.student_name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentEntry(st);
                            }}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800/60 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {st.student_name}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 shrink-0">
                              {st.class_name}
                            </span>
                          </div>
                        ))}
                        {rep.entries.length > 3 && (
                          <p className="text-[10px] text-[#673AB7] dark:text-purple-400 font-semibold text-right pt-0.5">
                            +{rep.entries.length - 3} more students...
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Sales Admission Data Grid */}
        <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/90 dark:border-slate-800/90 backdrop-blur-2xl shadow-sm overflow-hidden border-t-2 border-t-white dark:border-t-slate-800">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Sales Admission Records
                </h2>
                {selectedTimeFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Showing: {selectedTimeFilter === "TODAY" ? "Today's Entries" : "This Month's Entries"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-rose-500"
                      onClick={() => setSelectedTimeFilter("ALL")}
                    />
                  </span>
                )}
                {selectedSalesRepFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Sales Rep: {selectedSalesRepFilter}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-rose-500"
                      onClick={() => setSelectedSalesRepFilter("ALL")}
                    />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Click any student row to view complete admission details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, program, or sales rep..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9.5 w-full pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#673AB7] font-medium"
                />
              </div>

              {/* Plan Filter */}
              <div className="relative w-full sm:w-36">
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="h-9.5 w-full px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#673AB7] font-medium cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Plans</option>
                  <option value="Basic" className="bg-white dark:bg-slate-900">Basic</option>
                  <option value="Intermediate" className="bg-white dark:bg-slate-900">Intermediate</option>
                  <option value="Advanced" className="bg-white dark:bg-slate-900">Advanced</option>
                </select>
              </div>

              {/* Sales Rep Filter */}
              <div className="relative w-full sm:w-44">
                <select
                  value={selectedSalesRepFilter}
                  onChange={(e) => setSelectedSalesRepFilter(e.target.value)}
                  className="h-9.5 w-full px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#673AB7] font-medium cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Sales Reps</option>
                  {salesRepPerformance.map((rep) => (
                    <option key={rep.email} value={rep.email} className="bg-white dark:bg-slate-900">
                      {rep.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            {isLoadingAdmissions ? (
              <div className="py-14 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#673AB7] dark:text-purple-400" />
                <span className="text-xs font-medium">Fetching sales entries from Frappe ERP...</span>
              </div>
            ) : filteredAdmissions.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No sales admission records found matching current filters.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Try clearing active KPI or sales rep filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-5">Entry ID / Doc</th>
                      <th className="py-3 px-5">Student Name</th>
                      <th className="py-3 px-5">Class / Program</th>
                      <th className="py-3 px-5">Plan</th>
                      <th className="py-3 px-5">Branch</th>
                      <th className="py-3 px-5">Sales Representative</th>
                      <th className="py-3 px-5">Admission Took Date</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredAdmissions.map((entry, idx) => (
                      <tr
                        key={entry.name || idx}
                        onClick={() => setSelectedStudentEntry(entry)}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-colors duration-150 cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-mono text-[11px] text-[#673AB7] dark:text-purple-400 font-bold group-hover:underline flex items-center gap-1">
                          {entry.name || `SAE-${idx + 1}`}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                          {entry.student_name}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300 font-medium">
                          {entry.class_name}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-[#673AB7] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {entry.plan}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 font-medium">
                          {entry.branch}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-slate-100">
                          {entry.sales_user_name || entry.sales_user || "Sales User"}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-mono">
                          {entry.admission_date}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            {entry.status || "Submitted"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spatial 3D Student Detail Modal */}
      <AnimatePresence>
        {selectedStudentEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/15 dark:from-purple-950/60 dark:to-slate-900/80 border-b border-purple-200/50 dark:border-purple-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-[#673AB7] to-[#512DA8] text-white shadow-xs">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Student Admission Details
                    </h3>
                    <p className="text-[11px] font-mono text-[#673AB7] dark:text-purple-300">
                      {selectedStudentEntry.name || "SAE-Record"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentEntry(null)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Student Name */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="h-3 w-3 text-[#673AB7]" /> Student Name
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedStudentEntry.student_name}
                    </p>
                  </div>

                  {/* Program / Class */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-[#673AB7]" /> Class / Program
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {selectedStudentEntry.class_name}
                    </p>
                  </div>

                  {/* Plan */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-[#673AB7]" /> Selected Plan
                    </p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-[#673AB7] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {selectedStudentEntry.plan}
                    </span>
                  </div>

                  {/* Branch */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-[#673AB7]" /> Branch
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      {selectedStudentEntry.branch}
                    </p>
                  </div>

                  {/* Admission Date */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#673AB7]" /> Took Date
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">
                      {selectedStudentEntry.admission_date}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> ERP Status
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {selectedStudentEntry.status || "Submitted"}
                    </span>
                  </div>
                </div>

                {/* Sales Representative Details */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#673AB7] dark:text-purple-300 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Sales Representative Info
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedStudentEntry.sales_user_name || "Sales Executive"}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {selectedStudentEntry.sales_user}
                    </span>
                  </div>
                </div>

                {/* Remarks */}
                {selectedStudentEntry.remarks && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <FileText className="h-3 w-3 text-slate-400" /> Notes / Remarks
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium italic">
                      "{selectedStudentEntry.remarks}"
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-right">
                <button
                  onClick={() => setSelectedStudentEntry(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
