"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Users,
  School,
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { studentSchema, type StudentFormValues } from "@/lib/validators/student";
import { admitStudent, getAcademicYears, getBranches, getStudentGroups, getNextSrrId } from "@/lib/api/enrollment";
import { toast } from "sonner";

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
  { id: 2, label: "Academic", icon: School },
  { id: 3, label: "Guardian", icon: Users },
];

export default function NewStudentPage() {
  const router = useRouter();
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
      academic_year: "2025-2026",
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

  // ── Submit ────────────────────────────────────────────────────
  async function onSubmit(data: StudentFormValues) {
    try {
      const matchedGroup = studentGroups.find((g) => g.batch === data.student_batch_name);

      await admitStudent({
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
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
      });

      toast.success("Student admitted successfully!");
      router.push("/dashboard/branch-manager/students");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? "Failed to create student";
      toast.error(msg);
    }
  }

  async function nextStep() {
    const fieldsToValidate: Record<number, (keyof StudentFormValues)[]> = {
      1: ["first_name", "date_of_birth", "gender"],
      2: ["custom_branch", "program", "academic_year", "enrollment_date"],
    };
    const isValid = await trigger(fieldsToValidate[currentStep] ?? []);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, 3));
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
      <form onSubmit={handleSubmit(onSubmit)}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label="First Name *" placeholder="John" error={errors.first_name?.message} {...register("first_name")} />
                    <Input label="Middle Name" placeholder="William" {...register("middle_name")} />
                    <Input label="Last Name" placeholder="Doe" {...register("last_name")} />
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
                    <Input label="Blood Group" placeholder="O+" {...register("blood_group")} />
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

              {/* Step 2: Academic Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
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
                        {branches.map((b) => (
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

              {/* Step 3: Guardian Details */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
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
                        <option value="Guardian">Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
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
                      label="Guardian Email"
                      type="email"
                      placeholder="guardian@email.com"
                      leftIcon={<Mail className="h-4 w-4" />}
                      error={errors.guardian_email?.message}
                      {...register("guardian_email")}
                    />
                  </div>

                  {/* Admission summary */}
                  <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-sm space-y-1.5 text-text-secondary">
                    <p className="font-semibold text-text-primary mb-2">Admission Summary</p>
                    <p><span className="text-text-tertiary w-32 inline-block">Branch:</span> {watch("custom_branch") || "—"}</p>
                    <p><span className="text-text-tertiary w-32 inline-block">Class:</span> {watch("program") || "—"}</p>
                    <p><span className="text-text-tertiary w-32 inline-block">Academic Year:</span> {watch("academic_year") || "—"}</p>
                    <p><span className="text-text-tertiary w-32 inline-block">SRR ID:</span> {watch("custom_srr_id") || "—"}</p>
                    <p><span className="text-text-tertiary w-32 inline-block">Batch:</span> {watch("student_batch_name") || "Auto-assign"}</p>
                    <p><span className="text-text-tertiary w-32 inline-block">Enrollment Date:</span> {watch("enrollment_date") || "—"}</p>
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

              {currentStep < 3 ? (
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
