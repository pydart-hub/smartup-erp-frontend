"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  User,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  Loader2,
  PlusCircle,
  Filter,
  ShieldCheck,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBranches, getPrograms } from "@/lib/api/enrollment";
import {
  salesAdmissionSchema,
  type SalesAdmissionFormValues,
} from "@/lib/validators/salesAdmission";
import {
  createSalesAdmissionEntry,
  getSalesUserAdmissions,
  getSalesAdmissionStats,
} from "@/lib/api/salesAdmission";

const DEFAULT_PROGRAMS = [
  "Plus One Science",
  "Plus One Commerce",
  "Plus One Humanities",
  "Plus Two Science",
  "Plus Two Commerce",
  "Plus Two Humanities",
  "Class 10 (SSLC/CBSE)",
  "Class 9",
  "Class 8",
  "Repeaters Batch",
  "Custom Tuition",
];

const PLAN_OPTIONS = [
  { value: "Basic", label: "Basic" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

export default function SalesUserAdmissionsEntryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Today's date in YYYY-MM-DD
  const todayDate = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalesAdmissionFormValues>({
    resolver: zodResolver(salesAdmissionSchema),
    defaultValues: {
      student_name: "",
      class_name: "",
      plan: "Basic",
      branch: "",
      admission_date: todayDate,
      remarks: "",
    },
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  // Fetch programs from Frappe
  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
  });

  // Fetch sales user admissions
  const {
    data: admissions = [],
    isLoading: isLoadingAdmissions,
  } = useQuery({
    queryKey: ["sales-user-admissions", user?.email],
    queryFn: () => getSalesUserAdmissions(user?.email),
    enabled: !!user?.email,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["sales-user-admission-stats", user?.email],
    queryFn: () => getSalesAdmissionStats(user?.email),
    enabled: !!user?.email,
  });

  // Mutation for creating admission
  const createMutation = useMutation({
    mutationFn: (values: SalesAdmissionFormValues) =>
      createSalesAdmissionEntry(values, {
        email: user?.email || "sales.user@smartup.in",
        name: user?.name || "Sales User",
      }),
    onSuccess: (newRecord) => {
      toast.success(
        `Admission entry logged successfully for ${newRecord.student_name}!`
      );
      reset({
        student_name: "",
        class_name: "",
        plan: "Basic",
        branch: "",
        admission_date: todayDate,
        remarks: "",
      });
      queryClient.invalidateQueries({ queryKey: ["sales-user-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["sales-user-admission-stats"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to create admission entry."
      );
    },
  });

  const onSubmit = (data: SalesAdmissionFormValues) => {
    createMutation.mutate(data);
  };

  // Filtered admissions list
  const filteredAdmissions = admissions.filter((entry) => {
    const matchesSearch =
      entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.name && entry.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBranch =
      selectedBranchFilter === "ALL" || entry.branch === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 transition-colors duration-200 selection:bg-[#673AB7] selection:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Navigation Breadcrumb */}
        <BreadcrumbNav />

        {/* Spatial Brand Glass Header Workspace Banner */}
        <div className="mt-3 mb-8 rounded-3xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-purple-950/40 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-2xl p-5 sm:p-8 shadow-[0_16px_36px_rgba(103,58,183,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-purple-200/80 dark:border-purple-800/80 text-[11px] sm:text-xs font-semibold text-[#673AB7] dark:text-purple-300 shadow-sm backdrop-blur-md">
              <Database className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400 shrink-0" />
              <span>Frappe Cloud DocType Direct</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#673AB7] to-[#512DA8] text-white shadow-[0_8px_20px_rgba(103,58,183,0.35)] shrink-0">
                <UserPlus className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </span>
              Admission Entry Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Executive spatial workspace for recording and managing student admissions.
            </p>
          </div>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-slate-800 hover:border-purple-400 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-[0_10px_20px_rgba(103,58,183,0.08)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(103,58,183,0.18)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
          >
            <PlusCircle className="h-4 w-4 text-[#673AB7] dark:text-purple-400" />
            {isFormOpen ? "Hide Entry Panel" : "New Admission Entry"}
          </button>
        </div>

        {/* Compact KPI Cards fitting side-by-side in a single row on mobile screens */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-8 sm:mb-10">
          {/* Card 1 */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="relative rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/80 dark:border-slate-800/80 backdrop-blur-xl p-3 sm:p-7 shadow-[0_10px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 leading-tight">
                Today
              </span>
              <div className="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-100 dark:border-purple-900 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 sm:my-1">
              {stats?.today_count ?? 0}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#673AB7] dark:text-purple-300 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
              <span>Logged today by you</span>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="relative rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/80 dark:border-slate-800/80 backdrop-blur-xl p-3 sm:p-7 shadow-[0_10px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 leading-tight">
                <span className="sm:hidden">This Month</span>
                <span className="hidden sm:inline">This Month Admissions</span>
              </span>
              <div className="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-100 dark:border-purple-900 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 sm:my-1">
              {stats?.this_month_count ?? 0}
            </div>
            <div className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span>Cumulative for this month</span>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="relative rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/80 dark:border-slate-800/80 backdrop-blur-xl p-3 sm:p-7 shadow-[0_10px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 leading-tight">
                <span className="sm:hidden">Total</span>
                <span className="hidden sm:inline">Total Admissions Logged</span>
              </span>
              <div className="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-100 dark:border-purple-900 text-[#673AB7] dark:text-purple-300 shrink-0">
                <Award className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 sm:my-1">
              {stats?.total_count ?? 0}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#673AB7] dark:text-purple-300 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
              <span>Frappe Cloud DocType verified</span>
            </div>
          </motion.div>
        </div>

        {/* Soft Brand Glass Form Card (Mobile Responsive Layout) */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.3 }}
              className="mb-10"
            >
              <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/90 dark:border-slate-800/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(103,58,183,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800">
                {/* Mobile Responsive Header Bar */}
                <div className="px-5 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/15 dark:from-purple-950/60 dark:to-slate-900/80 border-b border-purple-200/50 dark:border-purple-900/50 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#673AB7] shadow-[0_0_10px_rgba(103,58,183,0.6)] animate-pulse shrink-0" />
                    <h2 className="font-bold text-base tracking-wide text-slate-900 dark:text-white">
                      Enter Student Details
                    </h2>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono text-[#673AB7] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-3 py-1 rounded-full border border-purple-200/80 dark:border-purple-800 self-start sm:self-auto">
                    DocType: Sales Admission Entry
                  </span>
                </div>

                <div className="p-5 sm:p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {/* Student Name */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
                          Student Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          placeholder="e.g. Rahul Sharma"
                          {...register("student_name")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium"
                        />
                        {errors.student_name && (
                          <p className="text-xs text-rose-500 mt-0.5">
                            {errors.student_name.message}
                          </p>
                        )}
                      </div>

                      {/* Class / Program */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
                          Class / Program <span className="text-rose-500">*</span>
                        </label>
                        <select
                          {...register("class_name")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium cursor-pointer"
                        >
                          <option value="" className="text-slate-400 bg-white dark:bg-slate-900">
                            -- Select Class / Program --
                          </option>
                          {programs.map((p) => (
                            <option key={p.name} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {p.name}
                            </option>
                          ))}
                          {programs.length === 0 &&
                            DEFAULT_PROGRAMS.map((prog) => (
                              <option key={prog} value={prog} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {prog}
                              </option>
                            ))}
                        </select>
                        {errors.class_name && (
                          <p className="text-xs text-rose-500 mt-0.5">
                            {errors.class_name.message}
                          </p>
                        )}
                      </div>

                      {/* Plan */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
                          Plan <span className="text-rose-500">*</span>
                        </label>
                        <select
                          {...register("plan")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium cursor-pointer"
                        >
                          {PLAN_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {p.label}
                            </option>
                          ))}
                        </select>
                        {errors.plan && (
                          <p className="text-xs text-rose-500 mt-0.5">
                            {errors.plan.message}
                          </p>
                        )}
                      </div>

                      {/* Branch */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
                          Branch <span className="text-rose-500">*</span>
                        </label>
                        <select
                          {...register("branch")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium cursor-pointer"
                        >
                          <option value="" className="text-slate-400 bg-white dark:bg-slate-900">
                            -- Select Branch --
                          </option>
                          {branches.map((b) => (
                            <option key={b.name} value={b.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {b.name}
                            </option>
                          ))}
                          {branches.length === 0 && (
                            <>
                              <option value="Smart Up Kadavanthara" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Smart Up Kadavanthara</option>
                              <option value="Smart Up Edappally" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Smart Up Edappally</option>
                              <option value="Smart Up Vennala" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Smart Up Vennala</option>
                            </>
                          )}
                        </select>
                        {errors.branch && (
                          <p className="text-xs text-rose-500 mt-0.5">
                            {errors.branch.message}
                          </p>
                        )}
                      </div>

                      {/* Admission Took Date */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400" />
                          Admission Took Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...register("admission_date")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium"
                        />
                        {errors.admission_date && (
                          <p className="text-xs text-rose-500 mt-0.5">
                            {errors.admission_date.message}
                          </p>
                        )}
                      </div>

                      {/* Remarks */}
                      <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          Remarks / Notes
                        </label>
                        <input
                          placeholder="Optional notes or details..."
                          {...register("remarks")}
                          className="h-12 sm:h-13 w-full rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] dark:focus:border-[#673AB7] focus:ring-2 focus:ring-[#673AB7]/20 transition-all duration-200 font-medium"
                        />
                      </div>
                    </div>

                    {/* Brand Primary Purple CTA Button (Stacked on mobile for touch UX) */}
                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          reset({
                            student_name: "",
                            class_name: "",
                            plan: "Basic",
                            branch: "",
                            admission_date: todayDate,
                            remarks: "",
                          })
                        }
                        className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-all cursor-pointer text-center"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#673AB7] to-[#512DA8] hover:from-[#512DA8] hover:to-[#4527A0] text-white font-bold text-sm shadow-[0_10px_25px_rgba(103,58,183,0.35)] hover:shadow-[0_15px_35px_rgba(103,58,183,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving Entry...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Save Admission Entry
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft Glass Table Section (Responsive Overflow Scroll) */}
        <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-purple-100/90 dark:border-slate-800/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(103,58,183,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800">
          <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Admissions Recorded
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Verified records stored in Frappe Cloud ERP under Sales User account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full pl-10 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] font-medium"
                />
              </div>

              {/* Branch Filter */}
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="h-11 w-full pl-9 pr-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#673AB7] font-medium cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.name} value={b.name} className="bg-white dark:bg-slate-900">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            {isLoadingAdmissions ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[#673AB7] dark:text-purple-400" />
                <span className="text-sm font-medium">Fetching entries from Frappe Cloud...</span>
              </div>
            ) : filteredAdmissions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No admission records found.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Fill out the form above to log your first student admission.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Entry ID / Doc</th>
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6">Class / Program</th>
                      <th className="py-4 px-6">Plan</th>
                      <th className="py-4 px-6">Branch</th>
                      <th className="py-4 px-6">Admission Took Date</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredAdmissions.map((entry, idx) => (
                      <tr
                        key={entry.name || idx}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-colors duration-150"
                      >
                        <td className="py-4 px-6 font-mono text-xs text-[#673AB7] dark:text-purple-400 font-bold">
                          {entry.name || `SAE-${idx + 1}`}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                          {entry.student_name}
                        </td>
                        <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">
                          {entry.class_name}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-[#673AB7] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {entry.plan}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {entry.branch}
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs font-mono">
                          {entry.admission_date}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
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
    </div>
  );
}
