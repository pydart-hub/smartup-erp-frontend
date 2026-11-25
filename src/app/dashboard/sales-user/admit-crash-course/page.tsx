"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Sparkles,
  Zap,
  Building,
  CheckCircle2,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  crashCourseAdmissionSchema,
  type CrashCourseAdmissionFormValues,
} from "@/lib/validators/crashCourseAdmission";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseClass,
  type CrashCourseLanguage,
  type CrashCourseBatchSummary,
  type CrashCourseAdmissionResult,
} from "@/lib/types/crashCourse";
import {
  calculateCrashCourseFee,
  formatINR,
  isLanguageAddonAllowed,
} from "@/lib/utils/crashCoursePricing";
import {
  admitCrashCourseStudent,
  getCrashCourseBatches,
  createCrashCourseBatch,
} from "@/lib/api/crashCourse";
import { CrashCourseFeeSummaryCard } from "@/components/crash-course/CrashCourseFeeSummaryCard";
import { LanguageSelector } from "@/components/crash-course/LanguageSelector";
import { BatchCapacityGauge } from "@/components/crash-course/BatchCapacityGauge";

const STEPS = [
  { id: 1, label: "Student Info", subtitle: "Personal Profile", icon: User },
  { id: 2, label: "Guardian Details", subtitle: "Parent & Login", icon: Users },
  { id: 3, label: "Academic & Batch", subtitle: "Class & Schedule", icon: School },
  { id: 4, label: "Fee & Payment", subtitle: "Billing & Mode", icon: CreditCard },
];

export default function AdmitCrashCoursePage() {
  const router = useRouter();
  const pathname = usePathname();
  const studentsListPath = pathname.includes("/branch-manager")
    ? "/dashboard/branch-manager/students"
    : "/dashboard/sales-user/students";
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admissionResult, setAdmissionResult] =
    useState<CrashCourseAdmissionResult | null>(null);

  const [batches, setBatches] = useState<CrashCourseBatchSummary[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CrashCourseAdmissionFormValues>({
    resolver: zodResolver(crashCourseAdmissionSchema) as any,
    defaultValues: {
      first_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "Male",
      student_email_id: "",
      student_mobile_number: "",
      aadhaar_number: "",
      custom_school_name: "",
      custom_place: "",
      guardian_name: "",
      guardian_email: "",
      guardian_mobile: "",
      guardian_relation: "Father",
      guardian_password: "",
      branch: CRASH_COURSE_BRANCHES[0].company,
      class_level: "10th",
      academic_year: "2026-2027",
      batch_name: "",
      selected_languages: [],
      payment_mode: "Cash",
      paid_amount: 0,
      payment_reference: "",
    },
    mode: "onBlur",
  });

  const selectedBranch = watch("branch");
  const selectedClass = watch("class_level");
  const selectedLanguages = watch("selected_languages");
  const selectedBatch = watch("batch_name");

  // Load batches whenever branch or class changes
  useEffect(() => {
    let isMounted = true;
    async function loadBatches() {
      if (!selectedBranch || !selectedClass) return;
      setLoadingBatches(true);
      try {
        const list = await getCrashCourseBatches({
          branch: selectedBranch,
          class_level: selectedClass,
        });
        if (isMounted) {
          setBatches(list);
          if (list.length > 0) {
            // Pick first non-full batch or default
            const available = list.find((b) => !b.is_full) || list[0];
            setValue("batch_name", available.name);
          }
        }
      } catch (err) {
        console.error("Failed to load batches:", err);
      } finally {
        if (isMounted) setLoadingBatches(false);
      }
    }
    loadBatches();
    return () => {
      isMounted = false;
    };
  }, [selectedBranch, selectedClass, setValue]);

  // Clean languages when switching to Plus One or Plus Two
  useEffect(() => {
    if (!isLanguageAddonAllowed(selectedClass) && selectedLanguages.length > 0) {
      setValue("selected_languages", []);
    }
  }, [selectedClass, selectedLanguages, setValue]);

  // Compute live fee breakdown
  const feeBreakdown = useMemo(() => {
    return calculateCrashCourseFee({
      classLevel: selectedClass,
      selectedLanguages,
    });
  }, [selectedClass, selectedLanguages]);

  // Auto-sync paid amount default with grand total
  useEffect(() => {
    setValue("paid_amount", feeBreakdown.grandTotal);
  }, [feeBreakdown.grandTotal, setValue]);

  // Handle step navigation validation
  async function nextStep() {
    let fieldsToValidate: (keyof CrashCourseAdmissionFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = [
        "first_name",
        "date_of_birth",
        "gender",
        "student_mobile_number",
        "student_email_id",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "guardian_name",
        "guardian_email",
        "guardian_mobile",
        "guardian_relation",
      ];
    } else if (currentStep === 3) {
      fieldsToValidate = ["branch", "class_level"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleCreateNewBatch() {
    if (!selectedBranch || !selectedClass) return;
    setCreatingBatch(true);
    try {
      const nextBatchNumber = batches.length + 1;
      const created = await createCrashCourseBatch({
        branch: selectedBranch,
        class_level: selectedClass,
        batch_number: nextBatchNumber,
      });
      setBatches((prev) => [...prev, created]);
      setValue("batch_name", created.name);
      toast.success(`Created ${created.student_group_name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create batch";
      toast.error(msg);
    } finally {
      setCreatingBatch(false);
    }
  }

  const activeBatchSummary = useMemo(() => {
    return batches.find((b) => b.name === selectedBatch) || batches[0];
  }, [batches, selectedBatch]);

  async function onSubmit(data: CrashCourseAdmissionFormValues) {
    setIsSubmitting(true);
    try {
      const result = await admitCrashCourseStudent(data);
      setAdmissionResult(result);
      toast.success("Crash Course admission completed successfully!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Admission failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // If admission completed, render success celebration view
  if (admissionResult) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Admission Successful!
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Student has been officially enrolled in SmartUp Crash Course 2026–27
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface text-left grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-4">
            <div>
              <span className="text-text-muted block">Student Name</span>
              <span className="font-semibold text-text-primary text-sm">
                {admissionResult.student_name}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">SRR ID</span>
              <span className="font-semibold text-primary text-sm">
                {admissionResult.srr_id}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">Class & Phase</span>
              <span className="font-semibold text-text-primary text-sm">
                {admissionResult.breakdown.classLevel} (Phases 1 & 2)
              </span>
            </div>
            <div>
              <span className="text-text-muted block">Batch</span>
              <span className="font-medium text-text-primary">
                {admissionResult.student_group}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">Invoice</span>
              <span className="font-medium text-text-primary">
                {admissionResult.invoice || "Pending"}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">WhatsApp Invoice</span>
              <span
                className={`font-semibold ${
                  admissionResult.whatsapp_sent
                    ? "text-emerald-600"
                    : "text-text-muted"
                }`}
              >
                {admissionResult.whatsapp_sent ? "Sent to Parent" : "Queued"}
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                setAdmissionResult(null);
                setCurrentStep(1);
              }}
            >
              Admit Another Student
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(studentsListPath)}
            >
              Go to Students List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Zap className="w-3.5 h-3.5" />
            <span>Crash Course 2026–27 Admission</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-1">
            New Student Enrollment
          </h1>
          <p className="text-sm text-text-muted">
            Mon–Sat, 6:15 AM – 8:00 AM • Palluruthy, Thoppumpady & Fort Kochi
          </p>
        </div>
      </div>

      {/* Minimalist Line & Circle Stepper matching reference */}
      <div className="w-full py-1">
        <div className="relative max-w-xl mx-auto px-6">
          {/* Background Connecting Line */}
          <div className="absolute top-[13px] left-10 right-10 h-[2px] bg-gray-200 dark:bg-slate-700 z-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%`,
              }}
            />
          </div>

          {/* Steps Row */}
          <div className="relative z-10 flex items-start justify-between">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              const stepNum = String(step.id).padStart(2, "0");

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center text-center cursor-default"
                >
                  <button
                    type="button"
                    disabled={currentStep < step.id}
                    onClick={() => {
                      if (isDone) setCurrentStep(step.id);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200 ${
                      isDone || isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/30 cursor-pointer"
                        : "bg-surface dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-400 cursor-not-allowed"
                    } ${isActive ? "ring-4 ring-primary/20 scale-105" : ""}`}
                  >
                    {isDone || isActive ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <span>{stepNum}</span>
                    )}
                  </button>

                  {/* Label */}
                  <div className="mt-1.5 text-center">
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap block transition-colors ${
                        isActive
                          ? "text-primary font-bold"
                          : isDone
                          ? "text-text-primary"
                          : "text-text-muted"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Content & Sticky Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Student Information */}
            {currentStep === 1 && (
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    Step 1: Student Profile
                  </h3>
                  <p className="text-xs text-text-muted">
                    Enter the student personal details
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    placeholder="Enter first name"
                    {...register("first_name")}
                    error={errors.first_name?.message}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Enter last name"
                    {...register("last_name")}
                    error={errors.last_name?.message}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth *"
                    type="date"
                    {...register("date_of_birth")}
                    error={errors.date_of_birth?.message}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">
                      Gender *
                    </label>
                    <select
                      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      {...register("gender")}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Student Mobile Number"
                    placeholder="10-digit mobile"
                    {...register("student_mobile_number")}
                    error={errors.student_mobile_number?.message}
                  />
                  <Input
                    label="Student Email (Optional)"
                    placeholder="student@example.com"
                    {...register("student_email_id")}
                    error={errors.student_email_id?.message}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="School Name"
                    placeholder="e.g. St. Albert's HSS"
                    {...register("custom_school_name")}
                  />
                  <Input
                    label="Place / Locality"
                    placeholder="e.g. Palluruthy"
                    {...register("custom_place")}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Guardian Details */}
            {currentStep === 2 && (
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    Step 2: Guardian Details & Parent Portal Access
                  </h3>
                  <p className="text-xs text-text-muted">
                    Parent phone and email receive fee invoices & exam reports
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Guardian Full Name *"
                    placeholder="Enter parent/guardian name"
                    {...register("guardian_name")}
                    error={errors.guardian_name?.message}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">
                      Relation *
                    </label>
                    <select
                      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      {...register("guardian_relation")}
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Guardian Mobile * (WhatsApp)"
                    placeholder="10-digit mobile number"
                    {...register("guardian_mobile")}
                    error={errors.guardian_mobile?.message}
                  />
                  <Input
                    label="Guardian Email *"
                    placeholder="parent@example.com"
                    type="email"
                    {...register("guardian_email")}
                    error={errors.guardian_email?.message}
                  />
                </div>

                <Input
                  label="Parent Portal Password (Optional)"
                  placeholder="Create password for parent app login"
                  type="password"
                  {...register("guardian_password")}
                  error={errors.guardian_password?.message}
                />
              </div>
            )}

            {/* Step 3: Academic & Batch */}
            {currentStep === 3 && (
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-5">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    Step 3: Branch, Class & Batch Selection
                  </h3>
                  <p className="text-xs text-text-muted">
                    Crash Course operates strictly across 3 branches with 20–50 students/class
                  </p>
                </div>

                {/* Branch Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Branch * (Participating Locations)
                  </label>
                  <select
                    className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    {...register("branch")}
                  >
                    {CRASH_COURSE_BRANCHES.map((b) => (
                      <option key={b.company} value={b.company}>
                        {b.label} ({b.company})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Target Class *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["9th", "10th", "Plus One", "Plus Two"] as CrashCourseClass[]).map(
                      (cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setValue("class_level", cls)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            selectedClass === cls
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                              : "border-border hover:bg-muted/40 text-text-secondary"
                          }`}
                        >
                          <span className="block text-sm">{cls}</span>
                          <span className="text-[11px] text-text-muted font-normal">
                            {cls === "Plus Two"
                              ? "Ext. to Feb 13"
                              : "PCM Revision"}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Batch Capacity Gauge */}
                {activeBatchSummary && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-text-secondary">
                        Assigned Batch (Max 50 Students)
                      </label>
                      <button
                        type="button"
                        onClick={handleCreateNewBatch}
                        disabled={creatingBatch}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        {creatingBatch ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>New Batch</span>
                      </button>
                    </div>

                    <BatchCapacityGauge batch={activeBatchSummary} />
                  </div>
                )}

                {/* Optional Sunday Languages for 9th and 10th */}
                <LanguageSelector
                  classLevel={selectedClass}
                  selectedLanguages={selectedLanguages}
                  onChange={(langs) => setValue("selected_languages", langs)}
                />
              </div>
            )}

            {/* Step 4: Fee & Payment Confirmation */}
            {currentStep === 4 && (
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-5">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    Step 4: Fee Breakdown & Payment Details
                  </h3>
                  <p className="text-xs text-text-muted">
                    Generate the official Sales Order and Invoice
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">
                      Payment Mode
                    </label>
                    <select
                      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      {...register("payment_mode")}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / Google Pay</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Razorpay">Online Payment Link</option>
                    </select>
                  </div>

                  <Input
                    label="Amount Collected Today (₹)"
                    type="number"
                    {...register("paid_amount", { valueAsNumber: true })}
                    error={errors.paid_amount?.message}
                  />
                </div>

                <Input
                  label="Payment Reference / Receipt #"
                  placeholder="e.g. UPI Ref / Cash receipt number"
                  {...register("payment_reference")}
                />

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Automated Actions Upon Submit:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-text-secondary pl-1">
                    <li>Creates Student and Guardian in Frappe</li>
                    <li>Enrolls student with Category &quot;Crash Course&quot;</li>
                    <li>Guarantees 20–50 batch size limit</li>
                    <li>Generates official Sales Order and submitted Sales Invoice</li>
                    <li>Delivers invoice payment link to Parent via WhatsApp</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step Navigation Buttons */}
            <div className="pt-4 flex justify-between items-center">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  className="flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Admission...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Complete Admission</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Sticky Column: Fee Breakdown */}
        <div className="space-y-4">
          <CrashCourseFeeSummaryCard breakdown={feeBreakdown} />
        </div>
      </div>
    </div>
  );
}
