"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, Pencil, Building2,
  Briefcase, Coins, Loader2, AlertCircle, ChevronDown,
  ChevronRight, Info, Landmark,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees } from "@/lib/api/employees";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatCurrency, getInitials } from "@/lib/utils/formatters";
import type { Employee } from "@/lib/api/employees";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const STATUS_TABS = ["Active", "Inactive", "All"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function branchLabel(company: string) {
  return company.replace(/^Smart Up\s*/i, "").trim() || company;
}

interface BranchGroup {
  branch: string;
  employees: Employee[];
  totalBasic: number;
  unset: number;
}

export default function StaffListPage() {
  const { defaultCompany } = useAuth();
  const [statusTab, setStatusTab] = useState<StatusTab>("Active");
  const [search, setSearch] = useState("");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);

  const { data: empRes, isLoading, isError } = useQuery({
    queryKey: ["hr-employee-list", defaultCompany, statusTab],
    queryFn: () =>
      getEmployees({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        ...(statusTab !== "All" ? { status: statusTab } : {}),
        limit_page_length: 300,
      }),
    staleTime: 60_000,
  });

  const allEmployees = empRes?.data ?? [];

  // ── Group by branch ──
  const branchGroups = useMemo<BranchGroup[]>(() => {
    const q = debouncedSearch.toLowerCase();
    const map = new Map<string, Employee[]>();
    for (const e of allEmployees) {
      const key = e.company ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      const emp = map.get(key)!;
      if (
        !q ||
        e.employee_name.toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q)
      ) {
        emp.push(e);
      }
    }
    return Array.from(map.entries())
      .map(([branch, employees]) => ({
        branch,
        employees,
        totalBasic: employees.reduce((s, e) => s + (e.custom_basic_salary ?? 0), 0),
        unset: employees.filter((e) => !e.custom_basic_salary).length,
      }))
      .filter((g) => g.employees.length > 0)
      .sort((a, b) => branchLabel(a.branch).localeCompare(branchLabel(b.branch)));
  }, [allEmployees, debouncedSearch]);

  const totalEmployees = allEmployees.length;
  const totalBasic = allEmployees.reduce((s, e) => s + (e.custom_basic_salary ?? 0), 0);
  const totalBranches = useMemo(() => new Set(allEmployees.map((e) => e.company)).size, [allEmployees]);

  function toggleBranch(branch: string) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branch)) next.delete(branch);
      else next.add(branch);
      return next;
    });
  }

  function expandAll() {
    setExpandedBranches(new Set(branchGroups.map((g) => g.branch)));
  }
  function collapseAll() {
    setExpandedBranches(new Set());
  }

  const allExpanded = branchGroups.length > 0 && expandedBranches.size === branchGroups.length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Staff Registry</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Branch-wise employee view — set basic salary for payroll
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start gap-3 p-3 bg-info/10 border border-info/20 rounded-lg text-sm text-text-secondary">
          <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
          <span>
            Employees are managed in the <strong>Frappe Cloud backend</strong>.
            Click a branch to see its staff and set their <strong>basic salary</strong>.
          </span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-text-primary">{totalEmployees}</p>
            <p className="text-xs text-text-tertiary">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-5 w-5 text-info mx-auto mb-1" />
            <p className="text-2xl font-bold text-text-primary">{totalBranches}</p>
            <p className="text-xs text-text-tertiary">Branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-text-primary">{formatCurrency(totalBasic)}</p>
            <p className="text-xs text-text-tertiary">Total Basic</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters + expand toggle */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusTab === tab
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search name, designation..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isLoading && branchGroups.length > 0 && (
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        )}
      </motion.div>

      {/* Branch list */}
      <motion.div variants={itemVariants} className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading employees...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load employees</span>
          </div>
        ) : branchGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-tertiary">
            <Building2 className="h-10 w-10 opacity-30" />
            <p>No employees found</p>
          </div>
        ) : (
          branchGroups.map((group) => {
            const isOpen = expandedBranches.has(group.branch);
            return (
              <div key={group.branch} className="rounded-xl border border-border-main overflow-hidden">
                {/* Branch header — clickable */}
                <button
                  onClick={() => toggleBranch(group.branch)}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-surface hover:bg-surface-secondary transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">{branchLabel(group.branch)}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-tertiary">
                      <span>{group.employees.length} staff</span>
                      <span>·</span>
                      <span>{formatCurrency(group.totalBasic)} / month</span>
                      {group.unset > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-warning">{group.unset} salary not set</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Employees — animated expand */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-border-main border-t border-border-main">
                        {group.employees.map((emp) => (
                          <Link
                            key={emp.name}
                            href={`/dashboard/hr-manager/salary/staff/${encodeURIComponent(emp.name)}`}
                            className="flex items-center gap-4 px-5 py-3 hover:bg-surface-secondary transition-colors group"
                          >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                              {getInitials(emp.employee_name)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary text-sm">
                                  {emp.employee_name}
                                </span>
                                <Badge variant={emp.status === "Active" ? "success" : "outline"} className="text-xs">
                                  {emp.status}
                                </Badge>
                              </div>
                              {emp.designation && (
                                <span className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                                  <Briefcase className="h-3 w-3" />
                                  {emp.designation}
                                </span>
                              )}
                            </div>

                            {/* Salary */}
                            <div className="text-right flex-shrink-0">
                              {emp.custom_basic_salary ? (
                                <>
                                  <p className="font-semibold text-text-primary text-sm">
                                    {formatCurrency(emp.custom_basic_salary)}
                                  </p>
                                  <p className="text-xs text-text-tertiary">Basic / Month</p>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-warning text-xs">
                                  <Pencil className="h-3 w-3" />
                                  Set salary
                                </span>
                              )}
                              {emp.custom_payable_account && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-primary/70 mt-1"
                                  title={emp.custom_payable_account}
                                >
                                  <Landmark className="h-3 w-3" />
                                  Payable A/C
                                </span>
                              )}
                            </div>

                            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}


