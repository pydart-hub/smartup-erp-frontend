"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createBatch, getStudentBatchNames } from "@/lib/api/batches";
import { getClasses } from "@/lib/api/batches";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import { getAcademicYears } from "@/lib/api/enrollment";
import type { ClassLevel } from "@/lib/types/batch";
import { toast } from "sonner";

export default function NewBatchPage() {
  const router = useRouter();
  const { defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();

  // Options
  const [programs, setPrograms] = useState<ClassLevel[]>([]);
  const [batchNames, setBatchNames] = useState<string[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form state
  const [form, setForm] = useState({
    student_group_name: "",
    program: "",
    academic_year: selectedYear || "",
    batch: "",
    max_strength: "60",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // Load options on mount
  useEffect(() => {
    Promise.all([getClasses({ limit_page_length: 100 }), getStudentBatchNames(), getAcademicYears()])
      .then(([classesRes, batches, years]) => {
        setPrograms(classesRes.data);
        setBatchNames(batches);
        const yearNames = years.map((y) => (typeof y === "string" ? y : (y as { name: string }).name));
        setAcademicYears(yearNames);
        if (!form.academic_year && yearNames.length > 0) {
          setForm((f) => ({ ...f, academic_year: yearNames[0] }));
        }
      })
      .catch(() => toast.error("Failed to load form options"))
      .finally(() => setLoadingOptions(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate() {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.student_group_name.trim()) e.student_group_name = "Group name is required";
    if (!form.program) e.program = "Program is required";
    if (!form.academic_year) e.academic_year = "Academic year is required";
    if (!form.batch) e.batch = "Batch code is required";
    const strength = parseInt(form.max_strength, 10);
    if (isNaN(strength) || strength < 1) e.max_strength = "Enter a valid capacity (≥ 1)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await createBatch({
        student_group_name: form.student_group_name.trim(),
        program: form.program,
        academic_year: form.academic_year,
        batch: form.batch,
        max_strength: parseInt(form.max_strength, 10),
        custom_branch: defaultCompany ?? undefined,
      });
      toast.success(`Batch "${res.data.student_group_name}" created successfully`);
      router.push(
        `/dashboard/branch-manager/batches/${encodeURIComponent(res.data.name)}`
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { exception?: string; message?: string } } })
          ?.response?.data?.exception ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create batch. Check the details and try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Back link */}
      <Link
        href="/dashboard/branch-manager/batches"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batches
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create New Batch</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Set up a new student group batch for a class
        </p>
      </div>

      {loadingOptions ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Batch Group Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Batch Name <span className="text-error">*</span>
                </label>
                <Input
                  placeholder="e.g. VYT-10th-25-1"
                  value={form.student_group_name}
                  onChange={(e) => field("student_group_name", e.target.value)}
                />
                {errors.student_group_name && (
                  <p className="text-xs text-error mt-1">{errors.student_group_name}</p>
                )}
                <p className="text-xs text-text-tertiary mt-1">
                  Convention: {"{BRANCH}-{CLASS}-{YY}-{SEQ}"} e.g. CHL-10th-25-1
                </p>
              </div>

              {/* Program */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Class (Program) <span className="text-error">*</span>
                </label>
                <select
                  className="w-full rounded-[10px] border border-border-input bg-app-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.program}
                  onChange={(e) => field("program", e.target.value)}
                >
                  <option value="">Select a program...</option>
                  {programs.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.program_name || p.name}
                    </option>
                  ))}
                </select>
                {errors.program && (
                  <p className="text-xs text-error mt-1">{errors.program}</p>
                )}
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Academic Year <span className="text-error">*</span>
                </label>
                <select
                  className="w-full rounded-[10px] border border-border-input bg-app-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.academic_year}
                  onChange={(e) => field("academic_year", e.target.value)}
                >
                  <option value="">Select academic year...</option>
                  {academicYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {errors.academic_year && (
                  <p className="text-xs text-error mt-1">{errors.academic_year}</p>
                )}
              </div>

              {/* Batch Code */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Batch Code <span className="text-error">*</span>
                </label>
                <select
                  className="w-full rounded-[10px] border border-border-input bg-app-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.batch}
                  onChange={(e) => field("batch", e.target.value)}
                >
                  <option value="">Select batch code...</option>
                  {batchNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.batch && (
                  <p className="text-xs text-error mt-1">{errors.batch}</p>
                )}
              </div>

              {/* Max Strength */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Max Capacity <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  placeholder="60"
                  value={form.max_strength}
                  onChange={(e) => field("max_strength", e.target.value)}
                />
                {errors.max_strength && (
                  <p className="text-xs text-error mt-1">{errors.max_strength}</p>
                )}
              </div>

              {/* Branch (read-only) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Branch
                </label>
                <Input
                  value={defaultCompany ?? ""}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Automatically set from your account
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" size="md" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {submitting ? "Creating..." : "Create Batch"}
                </Button>
                <Link href="/dashboard/branch-manager/batches">
                  <Button type="button" variant="outline" size="md">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </motion.div>
  );
}
