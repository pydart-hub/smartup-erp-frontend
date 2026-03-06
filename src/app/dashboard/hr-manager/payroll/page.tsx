"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee, Search, FileText, Loader2, AlertCircle, TrendingUp,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSalarySlips, getPayrollEntries, type SalarySlip } from "@/lib/api/hr";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

const STATUS_TABS = ["All", "Draft", "Submitted", "Cancelled"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HRPayrollPage() {
  const { defaultCompany } = useAuth();
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // ── Salary Slips ──
  const { data: salaryRes, isLoading: loadingSlips } = useQuery({
    queryKey: ["hr-salary-slips", defaultCompany, statusTab],
    queryFn: () =>
      getSalarySlips({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        ...(statusTab !== "All" ? { status: statusTab } : {}),
        limit_page_length: 200,
      }),
    staleTime: 60_000,
  });

  // ── Payroll Entries ──
  const { data: payrollRes, isLoading: loadingPayroll } = useQuery({
    queryKey: ["hr-payroll-entries", defaultCompany],
    queryFn: () =>
      getPayrollEntries({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        limit_page_length: 10,
      }),
    staleTime: 60_000,
  });

  const slips = salaryRes?.data ?? [];
  const payrollEntries = payrollRes?.data ?? [];

  // Filter by search
  const filtered = useMemo(() => {
    if (!debouncedSearch) return slips;
    const q = debouncedSearch.toLowerCase();
    return slips.filter(
      (s) =>
        s.employee_name.toLowerCase().includes(q) ||
        s.employee.toLowerCase().includes(q) ||
        (s.department ?? "").toLowerCase().includes(q)
    );
  }, [slips, debouncedSearch]);

  // Aggregates
  const totalGross = slips.reduce((s, sl) => s + sl.gross_pay, 0);
  const totalDeductions = slips.reduce((s, sl) => s + sl.total_deduction, 0);
  const totalNet = slips.reduce((s, sl) => s + sl.net_pay, 0);

  function docstatusLabel(ds: number) {
    if (ds === 0) return "Draft";
    if (ds === 1) return "Submitted";
    return "Cancelled";
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">Payroll</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Salary slips and payroll processing overview
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{slips.length}</p>
            <p className="text-xs text-text-tertiary">Salary Slips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalGross)}</p>
            <p className="text-xs text-text-tertiary">Total Gross</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalDeductions)}</p>
            <p className="text-xs text-text-tertiary">Total Deductions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalNet)}</p>
            <p className="text-xs text-text-tertiary">Total Net Pay</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Payroll Entries */}
      {payrollEntries.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Payroll Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium">Entry</th>
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium">Period</th>
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium">Frequency</th>
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollEntries.map((pe) => (
                      <tr key={pe.name} className="border-b border-border-light last:border-0">
                        <td className="py-2 px-3 text-text-primary font-medium">{pe.name}</td>
                        <td className="py-2 px-3 text-text-secondary">
                          {formatDate(pe.start_date)} – {formatDate(pe.end_date)}
                        </td>
                        <td className="py-2 px-3 text-text-secondary">{pe.payroll_frequency}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={pe.docstatus === 1 ? "success" : pe.docstatus === 0 ? "warning" : "error"}
                            className="text-xs"
                          >
                            {docstatusLabel(pe.docstatus)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search salary slips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 bg-surface border border-border-light rounded-[10px] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all ${
                statusTab === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-app-bg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Salary Slips Table */}
      {loadingSlips ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-10 w-10 text-text-tertiary" />
            <p className="text-text-secondary">No salary slips found</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-app-bg">
                      <th className="text-left py-3 px-4 text-text-tertiary font-medium">Employee</th>
                      <th className="text-left py-3 px-4 text-text-tertiary font-medium">Department</th>
                      <th className="text-left py-3 px-4 text-text-tertiary font-medium">Period</th>
                      <th className="text-right py-3 px-4 text-text-tertiary font-medium">Gross</th>
                      <th className="text-right py-3 px-4 text-text-tertiary font-medium">Deductions</th>
                      <th className="text-right py-3 px-4 text-text-tertiary font-medium">Net Pay</th>
                      <th className="text-center py-3 px-4 text-text-tertiary font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((slip) => (
                      <tr key={slip.name} className="border-b border-border-light last:border-0 hover:bg-app-bg/50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-text-primary">{slip.employee_name}</p>
                          <p className="text-xs text-text-tertiary">{slip.employee}</p>
                        </td>
                        <td className="py-3 px-4 text-text-secondary">{slip.department ?? "—"}</td>
                        <td className="py-3 px-4 text-text-secondary text-xs">
                          {formatDate(slip.start_date)} – {formatDate(slip.end_date)}
                        </td>
                        <td className="py-3 px-4 text-right text-text-primary font-medium">
                          {formatCurrency(slip.gross_pay)}
                        </td>
                        <td className="py-3 px-4 text-right text-error">
                          {formatCurrency(slip.total_deduction)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-text-primary">
                          {formatCurrency(slip.net_pay)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={slip.docstatus === 1 ? "success" : slip.docstatus === 0 ? "warning" : "error"}
                            className="text-xs"
                          >
                            {docstatusLabel(slip.docstatus)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
