"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Users,
  School,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  BookUser,
  IndianRupee,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { admitStudent, getAcademicYears, getBranches, getStudentGroups } from "@/lib/api/enrollment";
import apiClient from "@/lib/api/client";
import { parseO2OHourlyRate } from "@/lib/utils/o2oFeeRates";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

// ── O2O supported programs ──────────────────────────────────────
// ── Steps ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Student Info", icon: User },
  { id: 2, label: "Guardian", icon: Users },
  { id: 3, label: "Academic", icon: School },
];

// ── Styled helpers ───────────────────────────────────────────────
function SelectField({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-secondary">
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 w-full";

// ── Form state ───────────────────────────────────────────────────
interface O2OFormState {
  // Step 1 — Student
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  student_mobile_number: string;
  custom_place: string;
  custom_school_name: string;
  // Step 2 — Guardian
  guardian_name: string;
  guardian_email: string;
  guardian_mobile: string;
  guardian_relation: string;
  guardian_password: string;
  // Step 3 — Academic
  custom_branch: string;
  program: string;
  academic_year: string;
  hourly_rate: string;
}

const EMPTY_FORM: O2OFormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  student_mobile_number: "",
  custom_place: "",
  custom_school_name: "",
  guardian_name: "",
  guardian_email: "",
  guardian_mobile: "",
  guardian_relation: "Father",
  guardian_password: "",
  custom_branch: "",
  program: "",
  academic_year: "",
  hourly_rate: "",
};

export default function AdmitOneToOnePage() {
  return (
    <Suspense>
      <O2OAdmitContent />
    </Suspense>
  );
}

function O2OAdmitContent() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.includes("/branch-manager")
    ? "/dashboard/branch-manager"
    : "/dashboard/sales-user";

  const { defaultCompany, allowedCompanies } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<O2OFormState>({
    ...EMPTY_FORM,
    custom_branch: defaultCompany ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof O2OFormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successStudent, setSuccessStudent] = useState<{
    name: string;
    student_name: string;
    o2oGroup: string;
    ratePerHour?: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [rateTouched, setRateTouched] = useState(false);

  // Auto-redirect to one-to-one schedule setup 3 seconds after successful admission
  useEffect(() => {
    if (!successStudent) return;
    setCountdown(3);
    const redirectRate = successStudent.ratePerHour;
    const scheduleUrl = `${basePath}/course-schedule/one-to-one?group=${encodeURIComponent(successStudent.o2oGroup)}${redirectRate ? `&rate=${encodeURIComponent(String(redirectRate))}` : ""}`;
    const countdownTimer = setInterval(() => {
      setCountdown((c) => Math.max(c - 1, 0));
    }, 1000);
    const redirectTimer = setTimeout(() => {
      router.push(scheduleUrl);
    }, 3000);

    return () => {
      clearInterval(countdownTimer);
      clearTimeout(redirectTimer);
    };
  }, [successStudent, router, basePath]);

  // ── Data queries ─────────────────────────────────────────────
  const { data: allBranchesRes } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const allBranches = allBranchesRes ?? [];
  const branches = (() => {
    if (!allBranches.length) return [];

    if (allowedCompanies?.length) {
      const filtered = allBranches.filter((b) => allowedCompanies.includes(b.name));
      if (filtered.length > 0) return filtered;
    }

    if (defaultCompany) {
      const filtered = allBranches.filter((b) => b.name === defaultCompany);
      if (filtered.length > 0) return filtered;
    }

    return allBranches;
  })();

  useEffect(() => {
    if (form.custom_branch) return;
    if (defaultCompany && branches.some((branch) => branch.name === defaultCompany)) {
      setForm((prev) => ({ ...prev, custom_branch: defaultCompany }));
      return;
    }
    if (branches.length === 1) {
      setForm((prev) => ({ ...prev, custom_branch: branches[0].name }));
    }
  }, [branches, defaultCompany, form.custom_branch]);

  const { data: academicYearsRes } = useQuery({
    queryKey: ["academic-years"],
    queryFn: getAcademicYears,
  });
  const academicYears = academicYearsRes ?? [];

  const { data: defaultRateRes } = useQuery({
    queryKey: ["o2o-default-rate", form.program],
    queryFn: async () => {
      const res = await fetch(`/api/one-to-one/default-rate?program=${encodeURIComponent(form.program)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String((data as { error?: string }).error ?? "Failed to load default rate"));
      }
      return data as { rate: number };
    },
    enabled: !!form.program,
    staleTime: 60_000,
  });

  const { data: batchGroupsRes, isFetching: loadingBatchGroups } = useQuery({
    queryKey: ["o2o-batch-groups", form.custom_branch, form.program, form.academic_year],
    queryFn: () =>
      getStudentGroups({
        custom_branch: form.custom_branch,
        program: form.program,
        academic_year: form.academic_year,
        limit_page_length: 100,
      }),
    enabled: !!(form.custom_branch && form.program && form.academic_year),
    staleTime: 30_000,
  });

  const resolvedBatchGroup = (batchGroupsRes?.data ?? [])
    .filter((group) => group.name && group.batch && !group.disabled)
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  // ── Helpers ──────────────────────────────────────────────────
  function set<K extends keyof O2OFormState>(key: K, value: O2OFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const defaultRatePerHour = defaultRateRes?.rate ?? null;
  const manualRatePerHour = parseO2OHourlyRate(form.hourly_rate);
  const ratePerHour = manualRatePerHour ?? defaultRatePerHour;

  useEffect(() => {
    if (!form.program || !defaultRatePerHour) return;
    if (!rateTouched || !form.hourly_rate.trim()) {
      setForm((prev) => ({
        ...prev,
        hourly_rate: String(defaultRatePerHour),
      }));
    }
  }, [defaultRatePerHour, form.program, form.hourly_rate, rateTouched]);

  // ── Validation per step ──────────────────────────────────────
  function validateStep(step: number): boolean {
    const errs: Partial<Record<keyof O2OFormState, string>> = {};

    if (step === 1) {
      if (!form.first_name.trim()) errs.first_name = "First name is required";
      if (!form.date_of_birth) errs.date_of_birth = "Date of birth is required";
      if (!form.gender) errs.gender = "Gender is required";
      if (form.student_mobile_number && !/^\d{10}$/.test(form.student_mobile_number)) {
        errs.student_mobile_number = "Mobile must be 10 digits";
      }
    }

    if (step === 2) {
      if (!form.guardian_name.trim()) errs.guardian_name = "Guardian name is required";
      if (!form.guardian_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardian_email)) {
        errs.guardian_email = "Valid email is required";
      }
      if (!/^\d{10}$/.test(form.guardian_mobile)) {
        errs.guardian_mobile = "Mobile must be 10 digits";
      }
      if (!form.guardian_relation.trim()) errs.guardian_relation = "Relation is required";
      if (form.guardian_password.length < 8) {
        errs.guardian_password = "Password must be at least 8 characters";
      }
    }

    if (step === 3) {
      if (!form.custom_branch) errs.custom_branch = "Branch is required";
      if (!form.program) errs.program = "Class is required";
      if (!form.academic_year) errs.academic_year = "Academic year is required";
      if (!form.hourly_rate.trim()) {
        errs.hourly_rate = "Hourly rate is required";
      } else if (!manualRatePerHour) {
        errs.hourly_rate = "Enter a valid hourly rate";
      }
      if (form.custom_branch && form.program && form.academic_year && !loadingBatchGroups && !resolvedBatchGroup) {
        errs.program = "No active batch group exists for this branch, class, and academic year";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    setCurrentStep((s) => s - 1);
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validateStep(3)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const matchedGroup = resolvedBatchGroup;
      const finalRatePerHour = parseO2OHourlyRate(form.hourly_rate);

      if (!matchedGroup?.name || !matchedGroup.batch) {
        throw new Error(
          "No active batch group is configured for this branch, class, and academic year. Create one first, then retry One-to-One admission."
        );
      }
      if (!finalRatePerHour) {
        throw new Error("Enter a valid hourly rate before completing One-to-One admission.");
      }

      // Find branch abbreviation for O2O group name
      const branchAbbr =
        branches.find((b) => b.name === form.custom_branch)?.abbr ?? form.custom_branch;

      // 1. Admit student (no upfront SO/invoice; O2O billing is duration-based after scheduling)
      const result = await admitStudent({
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        student_mobile_number: form.student_mobile_number || undefined,
        custom_place: form.custom_place || undefined,
        custom_school_name: form.custom_school_name || undefined,
        custom_student_type: "Fresher",
        custom_branch: form.custom_branch,
        custom_branch_abbr: branchAbbr,
        program: form.program,
        academic_year: form.academic_year,
        student_batch_name: matchedGroup.batch,
        enrollment_date: today,
        studentGroupName: matchedGroup.name,
        guardian_name: form.guardian_name,
        guardian_email: form.guardian_email,
        guardian_mobile: form.guardian_mobile,
        guardian_relation: form.guardian_relation,
        guardian_password: form.guardian_password,
        o2oHourlyRate: finalRatePerHour,
        isFreeAccess: false,
        skipAutoBilling: true,
      });

      const studentId = result.student.name;
      const studentName = result.student.student_name;

      // 2. Create personal O2O Student Group (resilient)
      // Group name format: "{studentName} ({studentId})" — unique and human-readable
      const desiredO2OGroupName = `${studentName} (${studentId})`;
      let o2oGroupName = desiredO2OGroupName;
      try {
        const createPayload: Record<string, unknown> = {
          student_group_name: desiredO2OGroupName,
          academic_year: form.academic_year,
          program: form.program,
          custom_branch: form.custom_branch,
          custom_is_one_to_one: 1,
          custom_o2o_rate_per_class: finalRatePerHour,
          custom_o2o_rate_per_hour: finalRatePerHour,
          students: [
            {
              doctype: "Student Group Student",
              student: studentId,
              student_name: studentName,
              active: 1,
            },
          ],
        };

        // If PE has a batch name, use standard Batch mode. Otherwise use Activity mode.
        const peBatchName = result.programEnrollment.student_batch_name?.trim();
        if (peBatchName) {
          createPayload.group_based_on = "Batch";
          createPayload.batch = peBatchName;
        } else {
          createPayload.group_based_on = "Activity";
        }

        const created = await apiClient.post<{ data?: { name?: string } }>(
          "/resource/Student Group",
          createPayload,
        );

        const createdName = created?.data?.data?.name;
        if (createdName) {
          o2oGroupName = createdName;
        }
      } catch (sgErr) {
        // Try recovery by finding group by the label we attempted to create.
        try {
          const search = await apiClient.get<{ data?: Array<{ name: string }> }>(
            `/resource/Student Group?fields=${encodeURIComponent(
              JSON.stringify(["name"]),
            )}&filters=${encodeURIComponent(
              JSON.stringify([
                ["student_group_name", "=", desiredO2OGroupName],
                ["custom_branch", "=", form.custom_branch],
                ["program", "=", form.program],
              ]),
            )}&limit_page_length=1`,
          );
          const recovered = search.data?.data?.[0]?.name;
          if (recovered) {
            o2oGroupName = recovered;
          } else {
            throw sgErr;
          }
        } catch {
          // Group creation failure is non-blocking — student already admitted
          const msg =
            (sgErr as { response?: { data?: { exception?: string } } })?.response?.data
              ?.exception ?? String(sgErr);
          console.warn("[O2O] Student Group creation failed (non-blocking):", msg);
          toast.warning(
            `Student admitted but could not create One-to-One group. Please create group "${desiredO2OGroupName}" manually.`
          );
        }
      }

      // 3. Mark PE as One-to-One (non-blocking — custom field may not exist yet)
      try {
        await apiClient.put(
          `/resource/Program Enrollment/${encodeURIComponent(result.programEnrollment.name)}`,
          {
            custom_fee_mode: "One-to-One",
            custom_o2o_student_group: o2oGroupName,
            custom_o2o_rate_per_class: finalRatePerHour,
            custom_o2o_rate_per_hour: finalRatePerHour,
          }
        );
      } catch {
        // Fields may not exist on the backend yet — non-blocking
      }

      try {
        await apiClient.put(
          `/resource/Student Group/${encodeURIComponent(o2oGroupName)}`,
          {
            custom_o2o_rate_per_class: finalRatePerHour,
            custom_o2o_rate_per_hour: finalRatePerHour,
          }
        );
      } catch {
        // Non-blocking: fallback save route below still attempts persistence.
      }

      const ratePersistRes = await fetch("/api/one-to-one/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rate: finalRatePerHour,
          studentGroupName: o2oGroupName,
          programEnrollmentName: result.programEnrollment.name,
        }),
      });
      const ratePersistData = await ratePersistRes.json().catch(() => ({}));
      if (!ratePersistRes.ok) {
        const err = String((ratePersistData as { error?: string }).error ?? "Failed to save One-to-One hourly rate.");
        throw new Error(err);
      }

      setSuccessStudent({
        name: studentId,
        student_name: studentName,
        o2oGroup: o2oGroupName,
        ratePerHour: finalRatePerHour,
      });
      toast.success(`${studentName} admitted for One-to-One tuition`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Admission failed. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────
  if (successStudent) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-8 text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admission Complete</h2>
            <p className="text-gray-500 mt-1 text-sm">
              {successStudent.student_name} is now enrolled for One-to-One tuition.
            </p>
          </div>
          <div className="w-full bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Student ID</span>
              <span className="font-mono font-medium">{successStudent.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Personal Group</span>
              <span className="font-mono font-medium text-xs">{successStudent.o2oGroup}</span>
            </div>
            {ratePerHour && (
              <div className="flex justify-between">
                <span className="text-gray-500">Rate</span>
                <span className="font-medium text-emerald-700">₹{manualRatePerHour ?? ratePerHour}/hr</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Redirecting to One-to-One Schedule in {countdown}s…
          </p>
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={() =>
                router.push(
                  `${basePath}/course-schedule/one-to-one?group=${encodeURIComponent(successStudent.o2oGroup)}${manualRatePerHour ? `&rate=${encodeURIComponent(String(manualRatePerHour))}` : ""}`
                )
              }
              className="w-full"
            >
              Go to One-to-One Schedule Now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSuccessStudent(null);
                setForm({ ...EMPTY_FORM, custom_branch: defaultCompany ?? "" });
                setRateTouched(false);
                setCurrentStep(1);
              }}
              className="w-full"
            >
              Admit Another Student
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main wizard ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <BookUser className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">One-to-One Admission</h1>
          <p className="text-sm text-gray-500">Individual tuition — hourly billing</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    active ? "text-violet-700" : done ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        {/* ── Step 1: Student Info ─────────────────────────────── */}
        {currentStep === 1 && (
          <>
            <h2 className="text-base font-semibold text-gray-800">Student Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                error={errors.first_name}
                placeholder="e.g. Arjun"
              />
              <Input
                label="Last Name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="e.g. Kumar"
              />
              <Input
                label="Date of Birth *"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                error={errors.date_of_birth}
              />
              <SelectField label="Gender *" error={errors.gender} required>
                <select
                  className={selectCls}
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </SelectField>
              <Input
                label="Mobile Number"
                value={form.student_mobile_number}
                onChange={(e) => set("student_mobile_number", e.target.value)}
                error={errors.student_mobile_number}
                placeholder="10-digit number"
                maxLength={10}
              />
              <Input
                label="Place / Locality"
                value={form.custom_place}
                onChange={(e) => set("custom_place", e.target.value)}
                placeholder="e.g. Thrissur"
              />
              <Input
                label="School Name"
                value={form.custom_school_name}
                onChange={(e) => set("custom_school_name", e.target.value)}
                placeholder="e.g. St. Joseph's HSS"
                className="sm:col-span-2"
              />
            </div>
          </>
        )}

        {/* ── Step 2: Guardian ─────────────────────────────────── */}
        {currentStep === 2 && (
          <>
            <h2 className="text-base font-semibold text-gray-800">Guardian / Parent Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Guardian Name *"
                value={form.guardian_name}
                onChange={(e) => set("guardian_name", e.target.value)}
                error={errors.guardian_name}
                placeholder="e.g. Rajan Kumar"
                className="sm:col-span-2"
              />
              <Input
                label="Email Address *"
                type="email"
                value={form.guardian_email}
                onChange={(e) => set("guardian_email", e.target.value)}
                error={errors.guardian_email}
                placeholder="parent@email.com"
              />
              <Input
                label="Mobile Number *"
                value={form.guardian_mobile}
                onChange={(e) => set("guardian_mobile", e.target.value)}
                error={errors.guardian_mobile}
                placeholder="10-digit number"
                maxLength={10}
              />
              <SelectField label="Relation *" error={errors.guardian_relation} required>
                <select
                  className={selectCls}
                  value={form.guardian_relation}
                  onChange={(e) => set("guardian_relation", e.target.value)}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </SelectField>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  Parent Portal Password *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.guardian_password}
                    onChange={(e) => set("guardian_password", e.target.value)}
                    error={errors.guardian_password}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Academic ─────────────────────────────────── */}
        {currentStep === 3 && (
          <>
            <h2 className="text-base font-semibold text-gray-800">Academic Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Branch *" error={errors.custom_branch} required>
                <select
                  className={selectCls}
                  value={form.custom_branch}
                  onChange={(e) => set("custom_branch", e.target.value)}
                  disabled={
                    allowedCompanies !== undefined && allowedCompanies.length === 1
                  }
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </SelectField>

              <SelectField label="Class / Program *" error={errors.program} required>
                <select
                  className={selectCls}
                  value={form.program}
                  onChange={(e) => set("program", e.target.value)}
                >
                  <option value="">Select class</option>
                  <optgroup label="Plus One / Plus Two">
                    <option value="11th Science State">11th Science State</option>
                    <option value="11th Science CBSE">11th Science CBSE</option>
                    <option value="11th State">11th State</option>
                    <option value="12th Science State">12th Science State</option>
                    <option value="12th Science CBSE">12th Science CBSE</option>
                  </optgroup>
                  <optgroup label="8th / 9th / 10th">
                    <option value="10th State">10th State</option>
                    <option value="10th CBSE">10th CBSE</option>
                    <option value="9th State">9th State</option>
                    <option value="9th CBSE">9th CBSE</option>
                    <option value="8th State">8th State</option>
                    <option value="8th CBSE">8th CBSE</option>
                  </optgroup>
                </select>
              </SelectField>

              <SelectField label="Academic Year *" error={errors.academic_year} required>
                <select
                  className={selectCls}
                  value={form.academic_year}
                  onChange={(e) => set("academic_year", e.target.value)}
                >
                  <option value="">Select year</option>
                  {academicYears.map((y) => (
                    <option key={y.name} value={y.name}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </SelectField>

              <Input
                label="Hourly Rate *"
                type="number"
                min="1"
                step="1"
                value={form.hourly_rate}
                onChange={(e) => {
                  setRateTouched(true);
                  set("hourly_rate", e.target.value);
                }}
                error={errors.hourly_rate}
                hint={defaultRatePerHour ? `Suggested default for ${form.program || "this class"}: ₹${defaultRatePerHour}/hr` : "Enter the agreed hourly tuition amount"}
                placeholder="e.g. 200"
              />

              {form.custom_branch && form.program && form.academic_year && (
                <div className="sm:col-span-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm">
                  {loadingBatchGroups ? (
                    <div className="flex items-center gap-2 text-violet-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resolving academic batch for this one-to-one admission...
                    </div>
                  ) : resolvedBatchGroup ? (
                    <div className="space-y-1 text-violet-900">
                      <p className="font-medium">Admission batch will be linked automatically</p>
                      <p>
                        Batch group: <span className="font-semibold">{resolvedBatchGroup.name}</span>
                      </p>
                      <p>
                        Batch code: <span className="font-semibold">{resolvedBatchGroup.batch}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        No active batch group was found for this branch, class, and academic year.
                        One-to-One admission cannot complete until one exists.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Rate badge */}
              {ratePerHour && (
                <div className="sm:col-span-2 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                  <IndianRupee className="h-5 w-5 text-violet-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-violet-800">
                      ₹{ratePerHour} per hour
                    </p>
                    <p className="text-xs text-violet-600">
                      Monthly invoice = total session hours × ₹{ratePerHour}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/new-admission`)}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Admitting…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Admit Student
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
