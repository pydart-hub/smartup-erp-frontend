"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, User, School, Users, Phone, Mail,
  Calendar, Hash, Building2, AlertCircle, Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudent } from "@/lib/api/students";
import apiClient from "@/lib/api/client";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-light last:border-0">
      {icon && <span className="mt-0.5 text-text-tertiary flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary mb-0.5">{label}</p>
        <p className="text-sm text-text-primary font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold text-text-primary">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function StudentViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // ── Student data ──────────────────────────────────────────
  const { data: studentRes, isLoading, isError } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(id),
    staleTime: 60_000,
  });
  const student = studentRes?.data;

  // ── Latest program enrollment ─────────────────────────────
  const { data: enrollmentRes } = useQuery({
    queryKey: ["enrollment", id],
    queryFn: async () => {
      const { data } = await apiClient.get("/resource/Program Enrollment", {
        params: {
          filters: JSON.stringify([["student", "=", id], ["docstatus", "=", 1]]),
          fields: JSON.stringify(["name", "program", "academic_year", "student_batch_name", "enrollment_date"]),
          order_by: "enrollment_date desc",
          limit_page_length: 1,
        },
      });
      return data.data?.[0] ?? null;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  // ── Guardian details from first link ──────────────────────
  const guardianLink = student?.guardians?.[0];
  const { data: guardianRes } = useQuery({
    queryKey: ["guardian", guardianLink?.guardian],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Guardian/${encodeURIComponent(guardianLink!.guardian)}`);
      return data.data;
    },
    enabled: !!guardianLink?.guardian,
    staleTime: 120_000,
  });

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <BreadcrumbNav />
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-[10px]" />
          <Skeleton className="h-8 w-64 rounded" />
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
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

  const fullName = student.student_name || [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
  const enrollment = enrollmentRes;
  const guardian = guardianRes;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <BreadcrumbNav />

      {/* Back + Edit header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{fullName}</h1>
            <p className="text-xs text-text-tertiary">{student.name}</p>
          </div>
        </div>
        <Link href={`/dashboard/branch-manager/students/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Hero card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
              {initials(fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-text-primary">{fullName}</h2>
                <Badge variant={student.enabled === 1 ? "success" : "default"}>
                  {student.enabled === 1 ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-1">
                {student.custom_srr_id && (
                  <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> SRR {student.custom_srr_id}</span>
                )}
                {student.custom_branch && (
                  <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {student.custom_branch.replace("Smart Up ", "")}</span>
                )}
                {enrollment?.program && (
                  <span className="flex items-center gap-1.5"><School className="h-3.5 w-3.5" /> {enrollment.program}</span>
                )}
                {enrollment?.student_batch_name && (
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {enrollment.student_batch_name}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Personal Info */}
        <SectionCard title="Personal Information" icon={<User className="h-4 w-4" />}>
          <InfoRow label="Full Name" value={fullName} />
          <InfoRow label="Date of Birth" value={student.date_of_birth} icon={<Calendar className="h-3.5 w-3.5" />} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Blood Group" value={student.blood_group} />
          <InfoRow label="Email" value={student.student_email_id} icon={<Mail className="h-3.5 w-3.5" />} />
          <InfoRow label="Mobile" value={student.student_mobile_number} icon={<Phone className="h-3.5 w-3.5" />} />
        </SectionCard>

        {/* Academic Info */}
        <SectionCard title="Academic Details" icon={<School className="h-4 w-4" />}>
          <InfoRow label="Branch" value={student.custom_branch} icon={<Building2 className="h-3.5 w-3.5" />} />
          <InfoRow label="SRR ID" value={student.custom_srr_id} icon={<Hash className="h-3.5 w-3.5" />} />
          <InfoRow label="Class" value={enrollment?.program} />
          <InfoRow label="Academic Year" value={enrollment?.academic_year} />
          <InfoRow label="Batch" value={enrollment?.student_batch_name} />
          <InfoRow label="Enrollment Date" value={enrollment?.enrollment_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          <InfoRow label="Joining Date" value={student.joining_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          {enrollment?.name && (
            <InfoRow label="Enrollment ID" value={enrollment.name} />
          )}
        </SectionCard>

        {/* Guardian Info */}
        <SectionCard title="Guardian / Parent" icon={<Users className="h-4 w-4" />}>
          {guardianLink ? (
            <>
              <InfoRow label="Name" value={guardianLink.guardian_name} />
              <InfoRow label="Relation" value={guardianLink.relation} />
              {guardian ? (
                <>
                  <InfoRow label="Mobile" value={guardian.mobile_number} icon={<Phone className="h-3.5 w-3.5" />} />
                  <InfoRow label="Email" value={guardian.email_address} icon={<Mail className="h-3.5 w-3.5" />} />
                </>
              ) : (
                <div className="flex items-center gap-2 py-2 text-xs text-text-tertiary">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading guardian details…
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-tertiary py-2">No guardian linked.</p>
          )}
        </SectionCard>

      </div>
    </motion.div>
  );
}
