"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  CalendarRange, 
  Download, 
  Search, 
  GraduationCap, 
  Users, 
  Sparkles, 
  TrendingUp, 
  Layers,
  FileBarChart,
  RefreshCw,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import { 
  getAllBranches, 
  getActiveStudentCount, 
  getDiscontinuedStudentCount, 
  getStudentCountByPlan, 
  getStudentCountByType,
  getActiveStudentCountForBranch,
  getDiscontinuedStudentCountForBranch,
  getStudentCountByTypeForBranch,
  getStudentCountByPlanForBranch,
  getConvertedDemoStudentCount
} from "@/lib/api/director";
import apiClient from "@/lib/api/client";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function StudentReportPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState("");

  const isFiltering = startDate !== "" && endDate !== "";

  // Date helpers
  const handleQuickSelect = (type: "this-month" | "last-30" | "this-year" | "clear") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (type === "clear") {
      setStartDate("");
      setEndDate("");
    } else if (type === "this-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    } else if (type === "last-30") {
      const past30 = new Date(today.setDate(today.getDate() - 30));
      const past30Str = new Date(past30.getTime() - past30.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
      setStartDate(past30Str);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (type === "this-year") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const firstDayStr = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    }
  };

  // Queries for top cards
  const { data: totalActive, isLoading: loadTotalActive } = useQuery({
    queryKey: ["report-total-active", startDate, endDate],
    queryFn: () => getActiveStudentCount(startDate, endDate),
    staleTime: 60_000,
  });

  const { data: totalDiscontinued, isLoading: loadTotalDiscontinued } = useQuery({
    queryKey: ["report-total-discontinued", startDate, endDate],
    queryFn: () => getDiscontinuedStudentCount(startDate, endDate),
    staleTime: 60_000,
  });

  // Table query - aggregates data for all branches concurrently
  const { data: branchRows, isLoading: loadingTable, isError: tableError } = useQuery({
    queryKey: ["report-table-data", startDate, endDate],
    queryFn: async () => {
      const branches = await getAllBranches();
      const activeBranches = branches.filter((b) => b.name !== "Smart Up");
      
      const promises = activeBranches.map(async (b) => {
        // Fetch active and discontinued counts
        const [active, disc] = await Promise.all([
          getActiveStudentCountForBranch(b.name, startDate, endDate),
          getDiscontinuedStudentCountForBranch(b.name, startDate, endDate)
        ]);

        // Fetch student IDs admitted in date range to map their classes
        const filters: any[] = [["custom_branch", "=", b.name]];
        if (startDate && endDate) {
          filters.push(["joining_date", ">=", startDate]);
          filters.push(["joining_date", "<=", endDate]);
        }
        
        const studentsRes = await apiClient.get("/resource/Student", {
          params: {
            fields: JSON.stringify(["name"]),
            filters: JSON.stringify(filters),
            limit_page_length: 1000,
          },
        });
        
        const studentIds: string[] = (studentsRes.data?.data ?? []).map((s: any) => s.name);
        
        const classCounts = { c8: 0, c9: 0, c10: 0, c11: 0, c12: 0, other: 0 };
        
        if (studentIds.length > 0) {
          const chunkSize = 50;
          const peRows: any[] = [];
          for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const peRes = await apiClient.get("/resource/Program Enrollment", {
              params: {
                fields: JSON.stringify(["student", "program"]),
                filters: JSON.stringify([["student", "in", chunk]]),
                limit_page_length: 500,
              },
            });
            peRows.push(...(peRes.data?.data ?? []));
          }
          
          const seen = new Set<string>();
          for (const pe of peRows) {
            if (seen.has(pe.student)) continue;
            seen.add(pe.student);
            
            const prog = (pe.program || "").toLowerCase();
            if (prog.includes("8")) classCounts.c8++;
            else if (prog.includes("9")) classCounts.c9++;
            else if (prog.includes("10")) classCounts.c10++;
            else if (prog.includes("11")) classCounts.c11++;
            else if (prog.includes("12")) classCounts.c12++;
            else classCounts.other++;
          }

          // Fallback: search Student Groups for students who don't have a Program Enrollment
          const missingIds = studentIds.filter((id) => !seen.has(id));
          if (missingIds.length > 0) {
            const sgChunkSize = 40;
            const matchedGroups: any[] = [];
            for (let i = 0; i < missingIds.length; i += sgChunkSize) {
              const chunk = missingIds.slice(i, i + sgChunkSize);
              try {
                const sgRes = await apiClient.get("/resource/Student Group", {
                  params: {
                    fields: JSON.stringify(["name", "program"]),
                    filters: JSON.stringify([["Student Group Student", "student", "in", chunk]]),
                    limit_page_length: 200,
                  },
                });
                matchedGroups.push(...(sgRes.data?.data ?? []));
              } catch (e) {
                console.error("Failed to query student groups fallback", e);
              }
            }

            for (const group of matchedGroups) {
              try {
                const groupDetailRes = await apiClient.get(`/resource/Student Group/${encodeURIComponent(group.name)}`);
                const groupDoc = groupDetailRes.data?.data;
                if (groupDoc && groupDoc.students) {
                  for (const member of groupDoc.students) {
                    if (missingIds.includes(member.student) && !seen.has(member.student)) {
                      seen.add(member.student);
                      const prog = (group.program || "").toLowerCase();
                      if (prog.includes("8")) classCounts.c8++;
                      else if (prog.includes("9")) classCounts.c9++;
                      else if (prog.includes("10")) classCounts.c10++;
                      else if (prog.includes("11")) classCounts.c11++;
                      else if (prog.includes("12")) classCounts.c12++;
                      else classCounts.other++;
                    }
                  }
                }
              } catch (e) {
                console.error("Failed to fetch student group details fallback", e);
              }
            }
          }
          
          classCounts.other += studentIds.length - seen.size;
        }

        return {
          branchName: b.name,
          abbr: b.abbr,
          total: active + disc,
          active,
          disc,
          class8: classCounts.c8,
          class9: classCounts.c9,
          class10: classCounts.c10,
          class11: classCounts.c11,
          class12: classCounts.c12,
          other: classCounts.other
        };
      });
      
      return Promise.all(promises);
    },
    staleTime: 60_000,
  });

  const totalAll = (totalActive ?? 0) + (totalDiscontinued ?? 0);

  // Filter branch table rows based on search input
  const filteredRows = (branchRows ?? []).filter((row) =>
    row.branchName.toLowerCase().includes(search.toLowerCase()) ||
    row.abbr.toLowerCase().includes(search.toLowerCase())
  );

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!branchRows || branchRows.length === 0) return;
    
    const headers = [
      "Branch", 
      "Abbreviation", 
      "Total Admitted", 
      "Active", 
      "Discontinued", 
      "Class 8", 
      "Class 9", 
      "Class 10", 
      "Class 11", 
      "Class 12",
      "Other/NA"
    ];

    const rows = branchRows.map((r) => [
      `"${r.branchName}"`,
      `"${r.abbr}"`,
      r.total,
      r.active,
      r.disc,
      r.class8,
      r.class9,
      r.class10,
      r.class11,
      r.class12,
      r.other
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `student_admission_report_${startDate || "all"}_to_${endDate || "all"}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative isolate space-y-6 px-4 py-6 md:px-6"
    >
      {/* Decorative Blur Background Components */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-cyan-400/10" />
      <div className="pointer-events-none absolute top-44 -left-20 h-80 w-80 rounded-full bg-secondary/10 blur-3xl dark:bg-sky-400/10" />

      {/* Header bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/director/students" className="flex items-center gap-1 text-xs text-text-tertiary hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Students
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-cyan-400/25 bg-surface/80 dark:bg-slate-900/70 px-3 py-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary dark:text-cyan-200/80">Report View</span>
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Student Admission Report</h1>
            <p className="text-sm text-text-secondary mt-0.5">Filter registration statistics by joining date range</p>
          </div>
        </div>
      </div>

      {/* Date Filter Panel */}
      <motion.div variants={itemVariants}>
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-slate-900/90 shadow-md">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              {/* Custom Range Inputs */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-48 px-3.5 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full sm:w-48 px-3.5 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Quick Preset Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect("this-month")}
                  className="rounded-lg text-[10px] font-bold tracking-wider uppercase"
                >
                  This Month
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect("last-30")}
                  className="rounded-lg text-[10px] font-bold tracking-wider uppercase"
                >
                  Last 30 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickSelect("this-year")}
                  className="rounded-lg text-[10px] font-bold tracking-wider uppercase"
                >
                  This Year
                </Button>
                {isFiltering && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleQuickSelect("clear")}
                    className="rounded-lg text-[10px] font-bold tracking-wider uppercase text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-red-200/50"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main stats block */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Admitted */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-slate-900/90">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary leading-none tabular-nums">
                {loadTotalActive || loadTotalDiscontinued ? (
                  <span className="inline-block w-12 h-6 bg-border-light rounded animate-pulse" />
                ) : (
                  <AnimatedNumber value={totalAll} />
                )}
              </p>
              <p className="text-[10px] text-text-tertiary mt-1 uppercase font-bold tracking-wider">Admitted Students</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Students */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-slate-900/90">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-black text-success leading-none tabular-nums">
                {loadTotalActive ? (
                  <span className="inline-block w-12 h-6 bg-border-light rounded animate-pulse" />
                ) : (
                  <AnimatedNumber value={totalActive ?? 0} />
                )}
              </p>
              <p className="text-[10px] text-text-tertiary mt-1 uppercase font-bold tracking-wider">Active Students</p>
            </div>
          </CardContent>
        </Card>

        {/* Discontinued Students */}
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-slate-900/90">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <X className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-2xl font-black text-error leading-none tabular-nums">
                {loadTotalDiscontinued ? (
                  <span className="inline-block w-12 h-6 bg-border-light rounded animate-pulse" />
                ) : (
                  <AnimatedNumber value={totalDiscontinued ?? 0} />
                )}
              </p>
              <p className="text-[10px] text-text-tertiary mt-1 uppercase font-bold tracking-wider">Discontinued Students</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>



      {/* Branch Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-slate-900/90 shadow-md">
          <CardContent className="p-0">
            {/* Table controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  placeholder="Search branch table..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleExportCSV}
                  disabled={loadingTable || !branchRows || branchRows.length === 0}
                  className="flex items-center gap-2 w-full sm:w-auto rounded-xl shadow-sm text-xs font-bold uppercase py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Table element */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-4 py-4 text-center">Total Admitted</th>
                    <th className="px-4 py-4 text-center">Active</th>
                    <th className="px-4 py-4 text-center">Discontinued</th>
                    <th className="px-4 py-4 text-center">Class 8</th>
                    <th className="px-4 py-4 text-center">Class 9</th>
                    <th className="px-4 py-4 text-center">Class 10</th>
                    <th className="px-4 py-4 text-center">Class 11</th>
                    <th className="px-4 py-4 text-center">Class 12</th>
                    <th className="px-4 py-4 text-center">Other/NA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {loadingTable ? (
                    [...Array(5)].map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200/60 dark:bg-slate-800/80 rounded" /></td>
                        {[...Array(9)].map((_, i) => (
                          <td key={i} className="px-4 py-4 text-center"><div className="h-4 w-8 bg-slate-100 dark:bg-slate-800/50 rounded mx-auto" /></td>
                        ))}
                      </tr>
                    ))
                  ) : tableError ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-error font-medium">
                        Failed to load branch admission breakdown. Please check server logs.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-text-tertiary">
                        No admission records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr 
                        key={row.branchName} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-text-primary">
                          <div>{row.branchName.replace("Smart Up ", "")}</div>
                          <div className="text-[10px] text-text-tertiary font-normal tracking-wide mt-0.5">{row.abbr}</div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-350 tabular-nums">{row.total}</td>
                        <td className="px-4 py-4 text-center font-bold text-success tabular-nums">{row.active}</td>
                        <td className="px-4 py-4 text-center font-bold text-error tabular-nums">{row.disc}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.class8}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.class9}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.class10}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.class11}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.class12}</td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums">{row.other}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
