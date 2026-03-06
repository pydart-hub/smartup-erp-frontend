"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Users,
  School,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Lock,
  Banknote,
  Wifi,
  Tag,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { studentSchema, type StudentFormValues } from "@/lib/validators/student";
import { admitStudent, getAcademicYears, getBranches, getStudentGroups, getNextSrrId } from "@/lib/api/enrollment";
import { getFeeStructures } from "@/lib/api/fees";
import type { FeeConfigEntry, PaymentOptionSummary } from "@/lib/types/fee";
import { getAllPaymentOptions } from "@/lib/utils/feeSchedule";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

// ── Reusable styled select wrapper ──────────────────────────────
function SelectField({
  label, error, children, required,
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-secondary">
        {label}{required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50";

const STEPS = [
  { id: 1, label: "Student Info", icon: User },
  { id: 2, label: "Guardian", icon: Users },
  { id: 3, label: "Academic", icon: School },
  { id: 4, label: "Fee Details", icon: CreditCard },
];

const PLAN_OPTIONS = [
  { value: "Basic", label: "Basic", description: "Standard curriculum" },
  { value: "Intermediate", label: "Intermediate", description: "Enhanced learning" },
  { value: "Advanced", label: "Advanced", description: "Premium programme" },
];

export default function NewStudentPage() {
  const router = useRouter();
  const { defaultCompany, allowedCompanies } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      enrollment_date: new Date().toISOString().split("T")[0],
      gender: "Male",
      academic_year: "2026-2027",
      custom_branch: defaultCompany || "",
      custom_plan: "",
      custom_no_of_instalments: "",
      custom_mode_of_payment: undefined as unknown as "Cash" | "Online",
    },
  });

  const selectedBranch = watch("custom_branch");
  const selectedProgram = watch("program");

  // Reset dependent fields when branch changes
  const prevBranchRef = useRef(selectedBranch);
  useEffect(() => {
    if (prevBranchRef.current !== selectedBranch) {
      prevBranchRef.current = selectedBranch;
      setValue("program", "");
      setValue("student_batch_name", "");
      setValue("custom_srr_id", ""); // will be re-filled by query below
    }
  }, [selectedBranch, setValue]);

  // ── Auto-fill next SRR ID when branch selected ───────────────
  const { data: nextSrrId, isFetching: loadingSrrId } = useQuery({
    queryKey: ["next-srr-id", selectedBranch],
    queryFn: () => getNextSrrId(selectedBranch),
    enabled: !!selectedBranch,
    staleTime: 10_000,
  });

  // Populate form field when the fetched value arrives
  useEffect(() => {
    if (nextSrrId) setValue("custom_srr_id", nextSrrId);
  }, [nextSrrId, setValue]);

  // ── Reference data ────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: getAcademicYears,
    staleTime: Infinity,
  });

  // ── Programs available in the selected branch ─────────────────
  const { data: branchGroupsRes, isFetching: loadingBranchPrograms } = useQuery({
    queryKey: ["branch-programs", selectedBranch],
    queryFn: () =>
      getStudentGroups({
        custom_branch: selectedBranch,
        limit_page_length: 200,
      }),
    enabled: !!selectedBranch,
    staleTime: 60_000,
  });

  const branchPrograms = useMemo(() => {
    const seen = new Set<string>();
    return (branchGroupsRes?.data ?? [])
      .filter((g) => g.program && !seen.has(g.program!) && seen.add(g.program!))
      .map((g) => g.program!);
  }, [branchGroupsRes]);

  // ── Student groups for selected branch+program ────────────────
  const { data: studentGroupsRes } = useQuery({
    queryKey: ["student-groups", selectedBranch, selectedProgram],
    queryFn: () =>
      getStudentGroups({
        custom_branch: selectedBranch,
        program: selectedProgram,
        limit_page_length: 20,
      }),
    enabled: !!(selectedBranch && selectedProgram),
    staleTime: 30_000,
  });

  const studentGroups = useMemo(() => studentGroupsRes?.data ?? [], [studentGroupsRes]);

  const batchOptions = useMemo(() => {
    const seen = new Set<string>();
    return studentGroups
      .filter((g) => g.batch && !seen.has(g.batch!) && seen.add(g.batch!))
      .map((g) => g.batch!);
  }, [studentGroups]);

  // ── Fee structure lookup ──────────────────────────────────────
  const selectedPlan = watch("custom_plan");
  const selectedInstalments = watch("custom_no_of_instalments");
  const selectedAcademicYear = watch("academic_year");
  const selectedModeOfPayment = watch("custom_mode_of_payment");

  // Fee Structure program names may differ from Student Group program names
  // e.g. Student Group uses "11th Science State" but Fee Structure uses "11th State"
  const feeProgram = useMemo(() => {
    if (!selectedProgram) return "";
    // Strip "Science " when it appears between the class number and board
    // "11th Science State" → "11th State", "11th Science CBSE" stays as-is (exists in both)
    return selectedProgram.replace(/^(\d+th) Science (State)$/i, "$1 $2");
  }, [selectedProgram]);

  // Fetch all submitted fee structures for the selected branch + program
  const { data: feeStructuresRes, isFetching: loadingFeeStructures } = useQuery({
    queryKey: ["fee-structures", selectedBranch, feeProgram, selectedAcademicYear],
    queryFn: () =>
      getFeeStructures({
        company: selectedBranch,
        program: feeProgram,
        academic_year: selectedAcademicYear,
        docstatus: 1,
      }),
    enabled: !!(selectedBranch && feeProgram && selectedAcademicYear),
    staleTime: 60_000,
  });

  const feeStructures = useMemo(() => feeStructuresRes?.data ?? [], [feeStructuresRes]);

  // Derive available plans from fetched structures
  const availablePlans = useMemo(() => {
    const plans = new Set<string>();
    feeStructures.forEach((fs) => { if (fs.custom_plan) plans.add(fs.custom_plan); });
    return Array.from(plans);
  }, [feeStructures]);

  // Fetch XLSX per-instalment pricing when plan is selected
  const { data: feeConfigRes, isFetching: loadingFeeConfig } = useQuery({
    queryKey: ["fee-config", selectedBranch, selectedProgram, selectedPlan],
    queryFn: async () => {
      const params = new URLSearchParams({
        company: selectedBranch,
        program: selectedProgram,
        plan: selectedPlan,
      });
      const res = await fetch(`/api/fee-config?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as FeeConfigEntry;
    },
    enabled: !!(selectedBranch && selectedProgram && selectedPlan),
    staleTime: 60_000,
  });

  const feeConfig: FeeConfigEntry | null = feeConfigRes ?? null;

  // Generate payment option summaries from XLSX data
  const selectedEnrollmentDate = watch("enrollment_date");
  const paymentOptions: PaymentOptionSummary[] = useMemo(() => {
    if (!feeConfig) return [];
    return getAllPaymentOptions(feeConfig, selectedAcademicYear, selectedEnrollmentDate);
  }, [feeConfig, selectedAcademicYear, selectedEnrollmentDate]);

  // Selected payment option details
  const selectedOption: PaymentOptionSummary | null = useMemo(() => {
    if (!selectedInstalments || paymentOptions.length === 0) return null;
    return paymentOptions.find((o) => o.instalments === Number(selectedInstalments)) ?? null;
  }, [paymentOptions, selectedInstalments]);

  // Match fee structure from selections (still needed for SO creation)
  const matchedFeeStructure = useMemo(() => {
    if (!selectedPlan || !selectedInstalments) return null;
    return feeStructures.find(
      (fs) =>
        fs.custom_plan === selectedPlan &&
        fs.custom_no_of_instalments === selectedInstalments
    ) ?? null;
  }, [feeStructures, selectedPlan, selectedInstalments]);

  // Auto-set fee_structure in form when resolved
  useEffect(() => {
    const name = matchedFeeStructure?.name ?? "";
    setValue("fee_structure", name);
  }, [matchedFeeStructure, setValue]);

  // Reset instalment selection when plan changes
  const prevPlanRef = useRef(selectedPlan);
  useEffect(() => {
    if (prevPlanRef.current !== selectedPlan) {
      prevPlanRef.current = selectedPlan;
      setValue("custom_no_of_instalments", "");
    }
  }, [selectedPlan, setValue]);

  // ── Submit ────────────────────────────────────────────────────
  async function onSubmit(data: StudentFormValues) {
    try {
      const matchedGroup = studentGroups.find((g) => g.batch === data.student_batch_name);

      const result = await admitStudent({
        first_name: data.full_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        blood_group: data.blood_group,
        student_email_id: data.student_email_id,
        student_mobile_number: data.student_mobile_number,
        custom_branch: data.custom_branch,
        custom_srr_id: data.custom_srr_id,
        program: data.program,
        academic_year: data.academic_year,
        student_batch_name: data.student_batch_name,
        enrollment_date: data.enrollment_date,
        studentGroupName: matchedGroup?.name,
        guardian_name: data.guardian_name,
        guardian_email: data.guardian_email,
        guardian_mobile: data.guardian_mobile,
        guardian_relation: data.guardian_relation,
        guardian_password: data.guardian_password,
        fee_structure: data.fee_structure,
        custom_plan: data.custom_plan,
        custom_no_of_instalments: data.custom_no_of_instalments,
        custom_mode_of_payment: data.custom_mode_of_payment,
        instalmentSchedule: selectedOption?.schedule.map((s) => ({
          amount: s.amount,
          dueDate: s.dueDate,
          label: s.label,
        })),
      });

      const soMsg = result.salesOrder ? ` SO: ${result.salesOrder}.` : "";
      const invMsg = result.invoices?.length ? ` ${result.invoices.length} invoice(s) created.` : "";
      toast.success(`Student admitted successfully!${soMsg}${invMsg}`);

      // Show warnings for non-blocking failures (SO/invoice issues)
      if (result.warnings?.length) {
        for (const w of result.warnings) {
          toast.warning(w, { duration: 8000 });
        }
      }

      router.push("/dashboard/branch-manager/students");
    } catch (err: unknown) {
      // Frappe validation errors (HTTP 417) encode the real message in
      // `_server_messages` as a JSON-encoded array of {message} objects.
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      let msg = "Failed to create student";
      // Check for our own typed errors thrown inside admitStudent
      if ((err as { __type?: string }).__type === "duplicate_email") {
        msg = (err as Error).message;
      } else if (data) {
        // Handle DuplicateEntryError specifically
        if (String(data.exc_type) === "DuplicateEntryError" ||
            String(data.exception ?? "").includes("DuplicateEntryError")) {
          msg = "A student with this SRR ID already exists at this branch. Please use a different SRR ID.";
        } else if (String(data.exc_type) === "UniqueValidationError" ||
            String(data.exception ?? "").includes("UniqueValidationError")) {
          msg = "A student with this email address already exists. Please use a different email.";
        } else if (typeof data._server_messages === "string") {
          try {
            const parsed: { message: string }[] = JSON.parse(data._server_messages as string);
            msg = parsed.map((m) => m.message).join(" ") || msg;
          } catch {
            msg = String(data._server_messages);
          }
        } else if (typeof data.message === "string") {
          msg = data.message;
        } else if (typeof data.exception === "string") {
          // Strip Python traceback prefix: "frappe.exceptions.ValidationError: ..."
          msg = (data.exception as string).split("\n")[0].replace(/^.*?:\s*/, "");
        }
      } else {
        msg = (err as Error)?.message ?? msg;
      }
      toast.error(msg);
    }
  }

  // (selectedPaymentType was removed — replaced by selectedPlan / selectedInstalments above)

  async function nextStep() {
    const fieldsToValidate: Record<number, (keyof StudentFormValues)[]> = {
      1: ["full_name", "date_of_birth", "gender"],
      2: ["guardian_name", "guardian_mobile", "guardian_relation", "guardian_email", "guardian_password"],
      3: ["custom_branch", "program", "academic_year", "enrollment_date"],
    };
    const isValid = await trigger(fieldsToValidate[currentStep] ?? []);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, 4));
  }

  // Navigate to the step that contains the failing field so the user can see the error
  function handleFormError(formErrors: FieldErrors<StudentFormValues>) {
    const step1Keys: (keyof StudentFormValues)[] = [
      "full_name", "date_of_birth", "gender",
      "blood_group", "student_email_id", "student_mobile_number",
    ];
    const step2Keys: (keyof StudentFormValues)[] = [
      "guardian_name", "guardian_mobile", "guardian_relation", "guardian_email", "guardian_password",
    ];
    const step3Keys: (keyof StudentFormValues)[] = [
      "custom_branch", "program", "academic_year", "enrollment_date", "custom_srr_id", "student_batch_name",
    ];
    const errorKeys = Object.keys(formErrors) as (keyof StudentFormValues)[];
    if (errorKeys.some((k) => step1Keys.includes(k))) {
      setCurrentStep(1);
      toast.error("Please fix the errors in Student Info (Step 1)");
    } else if (errorKeys.some((k) => step2Keys.includes(k))) {
      setCurrentStep(2);
      toast.error("Please fix the errors in Guardian Info (Step 2)");
    } else if (errorKeys.some((k) => step3Keys.includes(k))) {
      setCurrentStep(3);
      toast.error("Please fix the errors in Academic Details (Step 3)");
    }
    // Payment field errors are on Step 4 (currently visible) — show inline
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Student Admission</h1>
          <p className="text-sm text-text-secondary">Fill in the details to register a new student</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div className={`w-12 h-0.5 rounded ${isCompleted ? "bg-primary" : "bg-border-input"}`} />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-primary text-white"
                      : isActive
                      ? "bg-primary-light text-primary border-2 border-primary"
                      : "bg-app-bg text-text-tertiary"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isActive ? "text-primary" : "text-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, handleFormError)}
        onKeyDown={(e) => {
          // Prevent Enter from submitting the form on intermediate steps
          if (e.key === "Enter" && currentStep < 4) e.preventDefault();
        }}
      >
        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Student Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Student Information</h3>
                    <p className="text-sm text-text-secondary mt-0.5">Basic personal details</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <Input label="Name *" placeholder="Full Name" error={errors.full_name?.message} {...register("full_name")} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Date of Birth *"
                      type="date"
                      leftIcon={<Calendar className="h-4 w-4" />}
                      error={errors.date_of_birth?.message}
                      {...register("date_of_birth")}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-text-secondary">Gender *</label>
                      <select
                        className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        {...register("gender")}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <p className="text-xs text-error">{errors.gender.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-text-secondary">Blood Group</label>
                      <select
                        className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        {...register("blood_group")}
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="student@email.com"
                      leftIcon={<Mail className="h-4 w-4" />}
                      error={errors.student_email_id?.message}
                      {...register("student_email_id")}
                    />
                    <Input
                      label="Mobile Number"
                      placeholder="+91 9876543210"
                      leftIcon={<Phone className="h-4 w-4" />}
                      {...register("student_mobile_number")}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Guardian Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Guardian / Parent Details</h3>
                    <p className="text-sm text-text-secondary mt-0.5">Primary guardian information</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Guardian Name *" placeholder="Full name" error={errors.guardian_name?.message} {...register("guardian_name")} />
                    <SelectField label="Relation" required error={errors.guardian_relation?.message}>
                      <select className={selectCls} {...register("guardian_relation")}>
                        <option value="">Select relation</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Others">Others</option>
                      </select>
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Guardian Mobile *"
                      placeholder="+91 9876543210"
                      leftIcon={<Phone className="h-4 w-4" />}
                      error={errors.guardian_mobile?.message}
                      {...register("guardian_mobile")}
                    />
                    <Input
                      label="Guardian Email *"
                      type="email"
                      placeholder="guardian@email.com"
                      leftIcon={<Mail className="h-4 w-4" />}
                      error={errors.guardian_email?.message}
                      {...register("guardian_email")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Parent Login Password *"
                      type="password"
                      placeholder="Min 8 characters"
                      leftIcon={<Lock className="h-4 w-4" />}
                      error={errors.guardian_password?.message}
                      hint="This will be used to create a parent login account"
                      {...register("guardian_password")}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Academic Details */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Academic Details</h3>
                    <p className="text-sm text-text-secondary mt-0.5">Class, branch, and enrollment info</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Branch" required error={errors.custom_branch?.message}>
                      <select className={selectCls} {...register("custom_branch")}>
                        <option value="">Select branch</option>
                        {(allowedCompanies.length > 0
                          ? branches.filter((b) => allowedCompanies.includes(b.name))
                          : branches
                        ).map((b) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </SelectField>

                    <SelectField label="Class" required error={errors.program?.message}>
                      <select
                        className={selectCls}
                        disabled={!selectedBranch || loadingBranchPrograms}
                        {...register("program")}
                      >
                        {!selectedBranch ? (
                          <option value="">Select branch first</option>
                        ) : loadingBranchPrograms ? (
                          <option value="">Loading…</option>
                        ) : branchPrograms.length === 0 ? (
                          <option value="">No classes found for this branch</option>
                        ) : (
                          <>
                            <option value="">Select class</option>
                            {branchPrograms.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Academic Year" required error={errors.academic_year?.message}>
                      <select className={selectCls} {...register("academic_year")}>
                        <option value="">Select year</option>
                        {academicYears.map((y) => (
                          <option key={y.name} value={y.name}>{y.name}</option>
                        ))}
                      </select>
                    </SelectField>

                    <Input
                      label="Enrollment Date *"
                      type="date"
                      leftIcon={<Calendar className="h-4 w-4" />}
                      error={errors.enrollment_date?.message}
                      {...register("enrollment_date")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="SRR ID *"
                      placeholder={loadingSrrId ? "Loading…" : "e.g. 550"}
                      error={errors.custom_srr_id?.message}
                      hint="Auto-suggested — edit if needed"
                      {...register("custom_srr_id")}
                    />
                  </div>

                  {selectedBranch && selectedProgram && (
                    <SelectField label="Batch (optional — auto-assign if empty)">
                      <select className={selectCls} {...register("student_batch_name")}>
                        <option value="">Auto-assign to available batch</option>
                        {batchOptions.map((b) => {
                          const group = studentGroups.find((g) => g.batch === b);
                          const count = group?.students?.length ?? "—";
                          const max = group?.max_strength ?? 60;
                          return (
                            <option key={b} value={b}>
                              {b} ({count}/{max} students)
                            </option>
                          );
                        })}
                      </select>
                    </SelectField>
                  )}

                  {selectedBranch && selectedProgram && studentGroups.length > 0 && (
                    <div className="bg-brand-wash rounded-[10px] p-4 border border-primary/10">
                      <p className="text-sm text-primary font-medium">
                        {studentGroups.length} batch{studentGroups.length !== 1 ? "es" : ""} available for {selectedProgram} at {selectedBranch.replace("Smart Up ", "")}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {studentGroups.map((g) => (
                          <span key={g.name} className="text-xs bg-white border border-primary/20 text-primary rounded-full px-2 py-0.5">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBranch && selectedProgram && studentGroups.length === 0 && (
                    <div className="bg-warning/10 rounded-[10px] p-4 border border-warning/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-warning">
                        No batches found for {selectedProgram} at {selectedBranch.replace("Smart Up ", "")}. The student will be enrolled without a batch assignment.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: Fee Details */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Fee Details</h3>
                    <p className="text-sm text-text-secondary mt-0.5">
                      Select a fee plan and instalment option
                      {!selectedBranch || !selectedProgram
                        ? " — please select branch & class in Step 3 first"
                        : ""}
                    </p>
                  </div>

                  {/* No fee structures available warning */}
                  {selectedBranch && selectedProgram && !loadingFeeStructures && feeStructures.length === 0 && (
                    <div className="bg-warning/10 rounded-[10px] p-4 border border-warning/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-warning">
                        No fee structures found for {selectedProgram} at {selectedBranch.replace("Smart Up ", "")} ({selectedAcademicYear}). Please contact the administrator.
                      </p>
                    </div>
                  )}

                  {/* Loading state */}
                  {loadingFeeStructures && (
                    <div className="flex items-center justify-center py-8 gap-2 text-text-tertiary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading fee structures…</span>
                    </div>
                  )}

                  {/* Plan selection */}
                  {feeStructures.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Fee Plan *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {PLAN_OPTIONS.filter((p) => availablePlans.includes(p.value)).map((plan) => {
                          const isSelected = selectedPlan === plan.value;
                          return (
                            <label
                              key={plan.value}
                              className={`relative flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border-input bg-surface hover:border-border-input/80"
                              }`}
                            >
                              <input
                                type="radio"
                                value={plan.value}
                                {...register("custom_plan")}
                                className="sr-only"
                              />
                              <span className={`text-sm font-semibold ${
                                isSelected ? "text-primary" : "text-text-secondary"
                              }`}>
                                {plan.label}
                              </span>
                              <span className="text-xs text-text-tertiary text-center">{plan.description}</span>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {errors.custom_plan && <p className="text-xs text-error">{errors.custom_plan.message}</p>}
                    </div>
                  )}

                  {/* Payment Option Selection (replaces old instalment picker) */}
                  {selectedPlan && paymentOptions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <label className="text-sm font-medium text-text-secondary">Payment Option *</label>
                      {loadingFeeConfig ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-text-tertiary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading pricing…</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {paymentOptions.map((opt) => {
                            const isSelected = selectedInstalments === String(opt.instalments);
                            const isBestValue = opt.instalments === 1;
                            return (
                              <label
                                key={opt.instalments}
                                className={`relative flex flex-col p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border-input bg-surface hover:border-primary/30"
                                }`}
                              >
                                <input
                                  type="radio"
                                  value={String(opt.instalments)}
                                  {...register("custom_no_of_instalments")}
                                  className="sr-only"
                                />
                                {isBestValue && (
                                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-green-500 text-white rounded-full">
                                    Best Value
                                  </span>
                                )}
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-primary"}`}>
                                    {opt.label}
                                  </span>
                                  <span className={`text-base font-bold ${isSelected ? "text-primary" : "text-text-primary"}`}>
                                    ₹{opt.total.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                {(opt.savings ?? 0) > 0 && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <Tag className="h-3 w-3 text-green-600" />
                                    <span className="text-xs text-green-600 font-medium">
                                      Save ₹{(opt.savings ?? 0).toLocaleString("en-IN")} vs annual fee
                                    </span>
                                  </div>
                                )}
                                {opt.instalments > 1 && (
                                  <div className="text-xs text-text-tertiary mt-1">
                                    {opt.schedule.map((s, i) => (
                                      <span key={i}>
                                        {s.label}: ₹{s.amount.toLocaleString("en-IN")}
                                        {i < opt.schedule.length - 1 ? " · " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {errors.custom_no_of_instalments && (
                        <p className="text-xs text-error">{errors.custom_no_of_instalments.message}</p>
                      )}
                    </motion.div>
                  )}

                  {/* Instalment Schedule Detail */}
                  {selectedOption && selectedOption.instalments > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="bg-brand-wash rounded-[12px] border border-primary/10 overflow-hidden">
                        <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-primary">Payment Schedule</p>
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {selectedOption.label} — {selectedOption.schedule.length} payments
                            </p>
                          </div>
                          <span className="text-lg font-bold text-primary">
                            ₹{selectedOption.total.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="divide-y divide-primary/5">
                          {selectedOption.schedule.map((inst) => (
                            <div key={inst.index} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                                  {inst.index}
                                </div>
                                <div>
                                  <span className="text-sm text-text-secondary">{inst.label}</span>
                                  <span className="text-xs text-text-tertiary ml-2">
                                    Due {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                </div>
                              </div>
                              <span className="text-sm font-medium text-text-primary">
                                ₹{inst.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Mode of Payment */}
                  {selectedInstalments && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Mode of Payment *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { value: "Cash" as const, label: "Cash", description: "Pay at branch counter", icon: Banknote },
                          { value: "Online" as const, label: "Online", description: "Pay via Razorpay", icon: Wifi },
                        ]).map((opt) => {
                          const isSelected = selectedModeOfPayment === opt.value;
                          const Icon = opt.icon;
                          return (
                            <label
                              key={opt.value}
                              className={`relative flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border-input bg-surface hover:border-border-input/80"
                              }`}
                            >
                              <input
                                type="radio"
                                value={opt.value}
                                {...register("custom_mode_of_payment")}
                                className="sr-only"
                              />
                              <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-text-tertiary"}`} />
                              <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-secondary"}`}>
                                {opt.label}
                              </span>
                              <span className="text-xs text-text-tertiary text-center">{opt.description}</span>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {errors.custom_mode_of_payment && (
                        <p className="text-xs text-error">{errors.custom_mode_of_payment.message}</p>
                      )}
                    </div>
                  )}

                  {/* Admission summary */}
                  <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-sm space-y-1.5 text-text-secondary">
                    <p className="font-semibold text-text-primary mb-2">Admission Summary</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Student:</span> {watch("full_name") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Guardian:</span> {watch("guardian_name") || "—"}{watch("guardian_relation") ? ` (${watch("guardian_relation")})` : ""}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Branch:</span> {watch("custom_branch") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Class:</span> {watch("program") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Academic Year:</span> {watch("academic_year") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">SRR ID:</span> {watch("custom_srr_id") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Batch:</span> {watch("student_batch_name") || "Auto-assign"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Enrollment Date:</span> {watch("enrollment_date") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Fee Plan:</span> {selectedPlan || "—"}</p>
                    <p>
                      <span className="text-text-tertiary w-36 inline-block">Instalments:</span>
                      {selectedInstalments ? (selectedInstalments === "1" ? "One-Time" : `${selectedInstalments} Instalments`) : "—"}
                    </p>
                    <p><span className="text-text-tertiary w-36 inline-block">Payment Mode:</span> {selectedModeOfPayment || "—"}</p>
                    {selectedOption && (
                      <p><span className="text-text-tertiary w-36 inline-block">Total Fee:</span> <span className="font-semibold text-primary">₹{selectedOption.total.toLocaleString("en-IN")}</span></p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button type="button" variant="primary" onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Check className="h-4 w-4" /> Submit Admission</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  );
}
