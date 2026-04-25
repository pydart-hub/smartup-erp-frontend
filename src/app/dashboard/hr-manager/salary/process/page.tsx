"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, PlayCircle, Loader2, AlertCircle,
  CheckCircle2, Users, Coins, ArrowLeft, Trash2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSalaryRecords,
  createSalaryRecord,
  deleteSalaryRecord,
  getRecentPeriods,
  formatPeriod,
  calculateSalary,
} from "@/lib/api/salary";
import {
  getEmployees,
  createEmployeePayableAccount,
  updateEmployeePayableAccount,
} from "@/lib/api/employees";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProcessSalaryPage() {
  const { defaultCompany } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const periods = getRecentPeriods(12);
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);

  // ── Companies (for abbr lookup) ──
  const { data: companiesRes } = useQuery({
    queryKey: ["companies-abbr"],
    queryFn: async () => {
      const { data } = await import("@/lib/api/client").then(m =>
        m.default.get("/resource/Company?fields=[\"name\",\"abbr\"]&limit_page_length=50")
      );
      return data as { data: { name: string; abbr: string }[] };
    },
    staleTime: 300_000,
  });

  const companyAbbrMap = useMemo(() => {
    const map: Record<string, string> = {};
    companiesRes?.data?.forEach((c) => { map[c.name] = c.abbr; });
    return map;
  }, [companiesRes]);

  // ── Active employees ──
  const { data: staffRes, isLoading: loadingStaff } = useQuery({
    queryKey: ["hr-salary-staff", defaultCompany],
    queryFn: () =>
      getEmployees({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        status: "Active",
        limit_page_length: 300,
      }),
    staleTime: 60_000,
  });

  // ── Existing records for selected period ──
  const { data: recordsRes, isLoading: loadingRecords } = useQuery({
    queryKey: ["hr-salary-records", defaultCompany, selectedPeriod.year, selectedPeriod.month],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        salary_year: selectedPeriod.year,
        salary_month: selectedPeriod.month,
      }),
    staleTime: 30_000,
  });

  const staff = staffRes?.data ?? [];
  const existingRecords = recordsRes?.data ?? [];

  const alreadyGeneratedIds = useMemo(
    () => new Set(existingRecords.map((r) => r.custom_employee ?? r.staff)),
    [existingRecords]
  );

  const missingStaff = useMemo(
    () => staff.filter((s) => !alreadyGeneratedIds.has(s.name)),
    [staff, alreadyGeneratedIds]
  );

  const isFullyGenerated = missingStaff.length === 0 && staff.length > 0;
  const isLoading = loadingStaff || loadingRecords;

  // ── Generate salary records ──
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  async function handleClear() {
    if (existingRecords.length === 0) return;
    setClearing(true);
    let deleted = 0;
    let failed = 0;
    for (const rec of existingRecords) {
      try {
        await deleteSalaryRecord(rec.name);
        deleted++;
      } catch {
        failed++;
      }
    }
    setClearing(false);
    setShowClearConfirm(false);
    queryClient.invalidateQueries({
      queryKey: ["hr-salary-records", defaultCompany, selectedPeriod.year, selectedPeriod.month],
    });
    if (failed === 0) {
      toast.success(`Cleared ${deleted} salary records for ${selectedPeriod.label}`);
    } else {
      toast.warning(`Deleted ${deleted} records, ${failed} failed`);
    }
  }

  async function handleGenerate() {
    if (missingStaff.length === 0) return;
    setGenerating(true);
    let created = 0;
    let failed = 0;

    for (const s of missingStaff) {
      try {
        const basic = s.custom_basic_salary ?? 0;
        const { lopDeduction, netSalary } = calculateSalary(basic, 0, 26);

        // ── Ensure payable account exists (create once per employee) ──
        let payableAccount = s.custom_payable_account;
        if (!payableAccount) {
          const abbr = companyAbbrMap[s.company] ?? s.company;
          try {
            payableAccount = await createEmployeePayableAccount(s.employee_name, s.company, abbr);
            await updateEmployeePayableAccount(s.name, payableAccount);
          } catch {
            // Account may already exist — ignore and continue
          }
        }

        await createSalaryRecord({
          staff: s.name,
          custom_employee: s.name,
          company: s.company,
          salary_month: selectedPeriod.month,
          salary_year: selectedPeriod.year,
          total_working_days: 26,
          lop_days: 0,
          basic_salary: basic,
          lop_deduction: lopDeduction,
          net_salary: netSalary,
          status: "Draft",
        });
        created++;
      } catch {
        failed++;
      }
    }

    setGenerating(false);
    queryClient.invalidateQueries({
      queryKey: ["hr-salary-records", defaultCompany, selectedPeriod.year, selectedPeriod.month],
    });

    if (failed === 0) {
      toast.success(`Generated ${created} salary records for ${selectedPeriod.label}`);
      router.push(
        `/dashboard/hr-manager/salary/${selectedPeriod.year}/${selectedPeriod.month}`
      );
    } else {
      toast.warning(`Generated ${created} records, ${failed} failed`);
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hr-manager/salary">
            <button className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Process Salary</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Generate monthly salary records for your branch staff
            </p>
          </div>
        </div>
      </motion.div>

      {/* Period Selector */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Select Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {periods.map((period) => (
                <button
                  key={`${period.year}-${period.month}`}
                  onClick={() => { setSelectedPeriod(period); setShowClearConfirm(false); }}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                    selectedPeriod.year === period.year &&
                    selectedPeriod.month === period.month
                      ? "border-primary bg-primary text-white"
                      : "border-border-input text-text-secondary hover:border-primary/50 hover:bg-surface-secondary"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preview — {selectedPeriod.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-text-tertiary py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking...</span>
              </div>
            ) : staff.length === 0 ? (
              <div className="flex items-center gap-2 text-warning py-4">
                <AlertCircle className="h-4 w-4" />
                <span>No active staff found. Add staff first.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-surface-secondary rounded-lg text-center">
                    <p className="text-xl font-bold text-text-primary">{staff.length}</p>
                    <p className="text-xs text-text-tertiary">Total Staff</p>
                  </div>
                  <div className="p-3 bg-success-light rounded-lg text-center">
                    <p className="text-xl font-bold text-success">{existingRecords.length}</p>
                    <p className="text-xs text-text-tertiary">Already Generated</p>
                  </div>
                  <div className="p-3 bg-warning-light rounded-lg text-center">
                    <p className="text-xl font-bold text-warning">{missingStaff.length}</p>
                    <p className="text-xs text-text-tertiary">Pending</p>
                  </div>
                </div>

                {/* Total basic preview */}
                <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Total Basic (all staff)
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(
                      missingStaff.reduce((s, e) => s + (e.custom_basic_salary ?? 0), 0)
                    )}
                  </span>
                </div>

                {/* Already generated notice */}
                {isFullyGenerated ? (
                  <div className="flex items-center gap-3 p-4 bg-success-light rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <div>
                      <p className="font-medium text-success">All records generated!</p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        Salary records for {selectedPeriod.label} are ready. You can now enter LOP days.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Staff to be generated */}
                    <p className="text-sm font-medium text-text-secondary">
                      Will generate records for ({missingStaff.length}):
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {missingStaff.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between px-3 py-2 bg-surface-secondary rounded-lg text-sm"
                        >
                          <span className="text-text-primary">{s.employee_name}</span>
                          <span className="text-text-tertiary">
                            {formatCurrency(s.custom_basic_salary ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="flex gap-3 pt-2">
                  {isFullyGenerated ? (
                    <Link
                      href={`/dashboard/hr-manager/salary/${selectedPeriod.year}/${selectedPeriod.month}`}
                      className="flex-1 sm:flex-none"
                    >
                      <Button className="w-full sm:w-auto">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Open Salary Sheet
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={handleGenerate}
                      disabled={generating || missingStaff.length === 0}
                      className="flex-1 sm:flex-none"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Generate {missingStaff.length} Records
                        </>
                      )}
                    </Button>
                  )}

                  {/* Clear button — shown whenever records exist */}
                  {existingRecords.length > 0 && !showClearConfirm && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowClearConfirm(true)}
                      className="text-error hover:bg-error/10 border border-error/30"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Records
                    </Button>
                  )}
                </div>

                {/* Inline confirmation */}
                {showClearConfirm && (
                  <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
                    <p className="text-sm text-text-primary flex-1">
                      Delete all <span className="font-semibold">{existingRecords.length}</span> salary records
                      for <span className="font-semibold">{selectedPeriod.label}</span>? This cannot be undone.
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                        disabled={clearing}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClear}
                        disabled={clearing}
                        className="px-3 py-1.5 text-sm font-medium bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {clearing ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...</>
                        ) : (
                          <><Trash2 className="h-3.5 w-3.5" /> Confirm Delete</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
