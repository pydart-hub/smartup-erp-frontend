"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, User, School, Users, Loader2, AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudent, updateStudent } from "@/lib/api/students";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";

// ── Schema ──────────────────────────────────────────────────────
const editSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().optional(),
  student_email_id: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  student_mobile_number: z.string().optional(),
  custom_branch: z.string().optional(),
  enabled: z.enum(["0", "1"]).optional(),
  custom_student_type: z.enum(["Fresher", "Existing", "Rejoining", "Demo", ""]).optional(),
  // Guardian fields (stored separately in Guardian doctype)
  guardian_name: z.string().optional(),
  guardian_mobile: z.string().optional(),
  guardian_email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  guardian_relation: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

// ── Reusable styled select ───────────────────────────────────────
const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-light">
      <span className="text-primary">{icon}</span>
      <h3 className="font-semibold text-text-primary">{title}</h3>
    </div>
  );
}

export default function StudentEditPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Fetch student ─────────────────────────────────────────
  const { data: studentRes, isLoading, isError } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(id),
    staleTime: 60_000,
  });
  const student = studentRes?.data;

  // ── Fetch guardian ────────────────────────────────────────
  const guardianLink = student?.guardians?.[0];
  const { data: guardian } = useQuery({
    queryKey: ["guardian", guardianLink?.guardian],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Guardian/${encodeURIComponent(guardianLink!.guardian)}`);
      return data.data;
    },
    enabled: !!guardianLink?.guardian,
    staleTime: 120_000,
  });

  // ── Form ──────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  // Pre-fill form when data loads
  useEffect(() => {
    if (!student) return;
    reset({
      first_name: student.first_name ?? "",
      middle_name: student.middle_name ?? "",
      last_name: student.last_name ?? "",
      date_of_birth: student.date_of_birth ?? "",
      gender: student.gender ?? "",
      blood_group: student.blood_group ?? "",
      student_email_id: student.student_email_id ?? "",
      student_mobile_number: student.student_mobile_number ?? "",
      custom_branch: student.custom_branch ?? "",
      enabled: String(student.enabled) as "0" | "1",
      custom_student_type: (student.custom_student_type as EditFormValues["custom_student_type"]) ?? "",
    });
  }, [student, reset]);

  // Fill guardian fields when guardian loads
  useEffect(() => {
    if (!guardian || !guardianLink) return;
    reset((prev) => ({
      ...prev,
      guardian_name: guardianLink.guardian_name ?? "",
      guardian_mobile: guardian.mobile_number ?? "",
      guardian_email: guardian.email_address ?? "",
      guardian_relation: guardianLink.relation ?? "",
    }));
  }, [guardian, guardianLink, reset]);

  // ── Save mutation ──────────────────────────────────────────
  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: async (values: EditFormValues) => {
      // 1. Update Student
      await updateStudent(id, {
        first_name: values.first_name,
        middle_name: values.middle_name,
        last_name: values.last_name,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        blood_group: values.blood_group,
        student_email_id: values.student_email_id,
        student_mobile_number: values.student_mobile_number,
        custom_branch: values.custom_branch,
        enabled: (values.enabled !== undefined ? Number(values.enabled) : undefined) as 0 | 1 | undefined,
        custom_student_type: values.custom_student_type || undefined,
      });

      // 2. Update Guardian if exists
      if (guardianLink?.guardian) {
        await apiClient.put(`/resource/Guardian/${encodeURIComponent(guardianLink.guardian)}`, {
          guardian_name: values.guardian_name,
          mobile_number: values.guardian_mobile,
          email_address: values.guardian_email,
        });
        // Also update relation in the student's guardians child row
        if (values.guardian_relation !== guardianLink.relation) {
          const currentGuardians = student?.guardians?.map((g) =>
            g.guardian === guardianLink.guardian
              ? { ...g, relation: values.guardian_relation }
              : g
          );
          await updateStudent(id, { guardians: currentGuardians } as never);
        }
      }
    },
    onSuccess: () => {
      // Invalidate so view page refreshes
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["guardian", guardianLink?.guardian] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
      router.push(`/dashboard/branch-manager/students/${id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? "Failed to save changes";
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <BreadcrumbNav />
        <Skeleton className="h-10 w-48 rounded" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-error">
        <AlertCircle className="h-8 w-8" />
        <p className="font-medium">Student not found</p>
        <button onClick={() => router.back()} className="text-sm text-primary underline mt-2">Go back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Edit Student</h1>
            <p className="text-xs text-text-tertiary">{student.name}</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit((data) => save(data))}
          loading={isPending}
          disabled={!isDirty && !isPending}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit((data) => save(data))} className="space-y-5">

        {/* Personal Info */}
        <Card>
          <CardContent className="p-6">
            <SectionHeader icon={<User className="h-4 w-4" />} title="Personal Information" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="First Name *" error={errors.first_name?.message} {...register("first_name")} />
                <Input label="Middle Name" {...register("middle_name")} />
                <Input label="Last Name" {...register("last_name")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Date of Birth" type="date" {...register("date_of_birth")} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Gender</label>
                  <select className={selectCls} {...register("gender")}>
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input label="Blood Group" placeholder="O+" {...register("blood_group")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  error={errors.student_email_id?.message}
                  {...register("student_email_id")}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <Input label="Mobile" {...register("student_mobile_number")} disabled className="opacity-60 cursor-not-allowed" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardContent className="p-6">
            <SectionHeader icon={<School className="h-4 w-4" />} title="Academic Details" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Branch" {...register("custom_branch")} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Student Type</label>
                <select className={selectCls} {...register("custom_student_type")}>
                  <option value="">— Select —</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Existing">Existing</option>
                  <option value="Rejoining">Rejoining</option>
                  <option value="Demo">Demo</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <select className={selectCls} {...register("enabled")}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">
              To change class or batch, update the Program Enrollment record in Frappe directly.
            </p>
          </CardContent>
        </Card>

        {/* Guardian */}
        <Card>
          <CardContent className="p-6">
            <SectionHeader icon={<Users className="h-4 w-4" />} title="Guardian / Parent" />
            {guardianLink ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Guardian Name" {...register("guardian_name")} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">Relation</label>
                    <select className={selectCls} {...register("guardian_relation")}>
                      <option value="">— Select —</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Mobile" {...register("guardian_mobile")} />
                  <Input
                    label="Email"
                    type="email"
                    error={errors.guardian_email?.message}
                    {...register("guardian_email")}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">No guardian linked to this student.</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom save bar */}
        <div className="flex justify-end gap-3 pt-2 pb-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
