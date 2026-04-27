"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  RefreshCw,
  Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getInitials } from "@/lib/utils/formatters";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────

interface EmployeeLeaveBalance {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  company: string;
  date_of_joining: string;
  has_allocation: boolean;
  total_allocated: number;
  new_leaves_this_year: number;
  carry_forward_from_prev_year: number;
  used: number;
  available: number;
  accrued_to_date: number;
  months_elapsed: number;
  over_used: number;
  projected_carry_forward: number;
}

interface LeaveBalanceResponse {
  employees: EmployeeLeaveBalance[];
  year: number;
  company: string;
  leave_type: string;
}

// ── Animation variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Filter tab types ──────────────────────────────────────────────────────

const FILTER_TABS = ["All", "No Allocation", "Low Balance", "Over Used"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────

function availableBadge(available: number, has_allocation: boolean) {
  if (!has_allocation) return <Badge variant="outline">Not allocated</Badge>;
  if (available <= 0) return <Badge variant="error">0 days</Badge>;
  if (available < 3) return <Badge variant="warning">{available} days</Badge>;
  return <Badge variant="success">{available} days</Badge>;
}

function progressBar(used: number, total: number) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color =
    pct >= 90 ? "bg-error" : pct >= 60 ? "bg-warning" : "bg-success";
  return (
    <div className="w-full bg-app-bg rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function AvailableLeavesPage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterTab, setFilterTab] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [allocatingAll, setAllocatingAll] = useState(false);
  // "" means "all companies" — used when HR Manager has no company restriction
  const [selectedCompany, setSelectedCompany] = useState<string>(() => defaultCompany || "");

  // Derive company options for the selector
  const companyOptions: string[] = allowedCompanies.length > 0 ? allowedCompanies : [];

  // Effective company to pass to API (empty = all)
  const effectiveCompany = selectedCompany;

  // ── Fetch leave balances ──────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useQuery<LeaveBalanceResponse>({
    queryKey: ["leave-balance", effectiveCompany, year],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year) });
      if (effectiveCompany) params.set("company", effectiveCompany);
      const res = await fetch(`/api/hr/leave-allocation?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load leave balances");
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── Single-employee allocation mutation ──────────────────────────────

  const allocateMutation = useMutation({
    mutationFn: async (employee: string) => {
      const res = await fetch("/api/hr/leave-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: effectiveCompany, year, employee }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Allocation failed");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`Allocated ${result.results?.[0]?.carry_forward > 0
        ? `18 + ${result.results[0].carry_forward} (carry‑fwd)`
        : "18"} leaves`);
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Bulk allocation ───────────────────────────────────────────────────

  async function handleAllocateAll() {
    setAllocatingAll(true);
    try {
      const res = await fetch("/api/hr/leave-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: effectiveCompany, year }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Allocation failed");
      }
      const result = await res.json();
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setAllocatingAll(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────

  const allEmployees = data?.employees ?? [];

  const filtered = useMemo(() => {
    let list = allEmployees;

    if (filterTab === "No Allocation") {
      list = list.filter((e) => !e.has_allocation);
    } else if (filterTab === "Low Balance") {
      list = list.filter((e) => e.has_allocation && e.available < 3);
    } else if (filterTab === "Over Used") {
      list = list.filter((e) => e.over_used > 0);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.employee_name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.employee.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allEmployees, filterTab, debouncedSearch]);

  const stats = useMemo(() => {
    const withAlloc = allEmployees.filter((e) => e.has_allocation);
    const totalUsed = withAlloc.reduce((s, e) => s + e.used, 0);
    const totalAlloc = withAlloc.reduce((s, e) => s + e.total_allocated, 0);
    const totalAvail = withAlloc.reduce((s, e) => s + e.available, 0);
    const avgAvail =
      withAlloc.length > 0
        ? Math.round((totalAvail / withAlloc.length) * 10) / 10
        : 0;
    const noAlloc = allEmployees.filter((e) => !e.has_allocation).length;
    return {
      total: allEmployees.length,
      withAlloc: withAlloc.length,
      noAlloc,
      totalUsed: Math.round(totalUsed * 10) / 10,
      totalAlloc: Math.round(totalAlloc * 10) / 10,
      avgAvail,
    };
  }, [allEmployees]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Available Leaves
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Policy: 1.5 leaves/month (18/year) · Unused leaves carry forward
            </p>
          </div>

          {/* Year selector + Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Company selector — shown when HR Manager has no fixed company */}
            {companyOptions.length === 0 && (
              <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-[10px] px-3 py-1.5 h-9">
                <Building2 className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer min-w-[140px]"
                >
                  <option value="">All Branches</option>
                </select>
              </div>
            )}
            {companyOptions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-[10px] px-3 py-1.5 h-9">
                <Building2 className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer min-w-[140px]"
                >
                  <option value="">All Branches</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Year navigator */}
            <div className="flex items-center gap-1 bg-surface border border-border-light rounded-[10px] px-2 py-1">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="p-1 hover:text-primary transition-colors"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-text-primary px-2 min-w-[52px] text-center">
                {year}
              </span>
              <button
                onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
                disabled={year >= currentYear}
                className="p-1 hover:text-primary transition-colors disabled:opacity-30"
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleAllocateAll}
              disabled={allocatingAll || isLoading || stats.noAlloc === 0}
            >
              {allocatingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Allocate {year} Leaves
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Policy info banner */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start gap-3 bg-info-light border border-info/20 rounded-[12px] px-4 py-3">
          <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
          <p className="text-sm text-info">
            <strong>Leave Policy:</strong> Each employee accrues <strong>1.5 days/month</strong> = 18 days/year.
            Unused leaves from any month <strong>carry forward</strong> to the next month automatically.
            At year-end, the remaining balance carries forward to the next year.
          </p>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-text-tertiary">Employees</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
            {stats.noAlloc > 0 && (
              <p className="text-xs text-warning mt-0.5">
                {stats.noAlloc} need allocation
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck2 className="h-4 w-4 text-success" />
              <span className="text-xs text-text-tertiary">Avg. Available</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.avgAvail}</p>
            <p className="text-xs text-text-tertiary mt-0.5">days per employee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-info" />
              <span className="text-xs text-text-tertiary">Total Allocated</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.totalAlloc}</p>
            <p className="text-xs text-text-tertiary mt-0.5">days in {year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-warning" />
              <span className="text-xs text-text-tertiary">Total Used</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.totalUsed}</p>
            <p className="text-xs text-text-tertiary mt-0.5">days taken</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by name or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 bg-surface border border-border-light rounded-[10px] p-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count =
              tab === "No Allocation"
                ? stats.noAlloc
                : tab === "Low Balance"
                ? allEmployees.filter((e) => e.has_allocation && e.available < 3).length
                : tab === "Over Used"
                ? allEmployees.filter((e) => e.over_used > 0).length
                : stats.total;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all whitespace-nowrap ${
                  filterTab === tab
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab}
                {count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      filterTab === tab ? "bg-white/20" : "bg-app-bg"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Employee Leave Balance — {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading leave balances…</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-secondary">
                <AlertTriangle className="h-8 w-8 text-error" />
                <p className="text-sm">Failed to load leave balances</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-secondary">
                <CalendarCheck2 className="h-8 w-8 opacity-40" />
                <p className="text-sm">
                  {allEmployees.length === 0
                    ? "No active employees found"
                    : "No employees match this filter"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left px-5 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Employee
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide hidden md:table-cell">
                        Department
                      </th>
                      {!effectiveCompany && (
                        <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide hidden lg:table-cell">
                          Branch
                        </th>
                      )}
                      <th className="text-center px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Accrued to Date
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Allocated
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Used
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Available
                      </th>
                      <th className="text-right px-5 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wide">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {filtered.map((emp) => (
                      <tr
                        key={emp.employee}
                        className="hover:bg-app-bg/60 transition-colors group"
                      >
                        {/* Employee */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {getInitials(emp.employee_name)}
                            </div>
                            <div>
                              <p className="font-medium text-text-primary leading-tight">
                                {emp.employee_name}
                              </p>
                              <p className="text-[11px] text-text-tertiary">{emp.employee}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-text-secondary">{emp.department}</p>
                          {emp.designation !== "—" && (
                            <p className="text-[11px] text-text-tertiary">{emp.designation}</p>
                          )}
                        </td>

                        {/* Branch (only when viewing all companies) */}
                        {!effectiveCompany && (
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-text-secondary text-xs">{emp.company}</p>
                          </td>
                        )}

                        {/* Accrued to date */}
                        <td className="px-4 py-3 text-center">
                          <p className="font-semibold text-text-primary">{emp.accrued_to_date}</p>
                          <p className="text-[11px] text-text-tertiary">
                            {emp.months_elapsed.toFixed(1)} mo × 1.5
                          </p>
                        </td>

                        {/* Allocated */}
                        <td className="px-4 py-3 text-center">
                          {emp.has_allocation ? (
                            <div>
                              <p className="font-semibold text-text-primary">
                                {emp.total_allocated}
                              </p>
                              {emp.carry_forward_from_prev_year > 0 && (
                                <p className="text-[11px] text-success">
                                  +{emp.carry_forward_from_prev_year} c/f
                                </p>
                              )}
                              {progressBar(emp.used, emp.total_allocated)}
                            </div>
                          ) : (
                            <span className="text-text-tertiary text-xs">—</span>
                          )}
                        </td>

                        {/* Used */}
                        <td className="px-4 py-3 text-center">
                          <p className={`font-semibold ${emp.over_used > 0 ? "text-error" : "text-text-primary"}`}>
                            {emp.used}
                          </p>
                          {emp.over_used > 0 && (
                            <p className="text-[11px] text-error">
                              +{emp.over_used} advance
                            </p>
                          )}
                        </td>

                        {/* Available */}
                        <td className="px-4 py-3 text-center">
                          {availableBadge(emp.available, emp.has_allocation)}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3 text-right">
                          {!emp.has_allocation ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => allocateMutation.mutate(emp.employee)}
                              disabled={allocateMutation.isPending}
                            >
                              {allocateMutation.isPending &&
                              allocateMutation.variables === emp.employee ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <PlusCircle className="h-3 w-3" />
                              )}
                              Allocate
                            </Button>
                          ) : (
                            <span className="text-[11px] text-text-tertiary">
                              {emp.new_leaves_this_year} new
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly accrual legend */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Monthly Accrual Schedule — {year}
            </h3>
            <MonthlyAccrualGrid year={year} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ── Monthly Accrual Grid ──────────────────────────────────────────────────

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function MonthlyAccrualGrid({ year }: { year: number }) {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
      {MONTHS.map((month, idx) => {
        const isPast =
          year < currentYear ||
          (year === currentYear && idx < currentMonth);
        const isCurrent = year === currentYear && idx === currentMonth;
        const isFuture =
          year > currentYear ||
          (year === currentYear && idx > currentMonth);
        const cumulative = Math.round((idx + 1) * 1.5 * 10) / 10;

        return (
          <div
            key={month}
            className={`rounded-[10px] p-2.5 text-center border transition-all ${
              isCurrent
                ? "border-primary bg-primary/5"
                : isPast
                ? "border-success/20 bg-success/5"
                : "border-border-light bg-app-bg/60 opacity-60"
            }`}
          >
            <p className={`text-xs font-semibold ${isCurrent ? "text-primary" : isPast ? "text-success" : "text-text-tertiary"}`}>
              {month}
            </p>
            <p className="text-sm font-bold text-text-primary mt-0.5">+1.5</p>
            <p className="text-[10px] text-text-tertiary">{cumulative} total</p>
            {isFuture && (
              <span className="block text-[9px] text-text-tertiary mt-0.5">upcoming</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
