"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, User, School, Users, Phone, Mail,
  Calendar, Hash, Building2, AlertCircle, Loader2, IndianRupee, FileText,
  Clock, CreditCard, ExternalLink, UserX, KeyRound, Eye, EyeOff, RotateCcw, Copy, Check,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudent } from "@/lib/api/students";
import { getStudentGroups, getCourseSchedules } from "@/lib/api/courseSchedule";
import apiClient from "@/lib/api/client";
import { DiscontinueStudentModal } from "@/components/students/DiscontinueStudentModal";
import { getO2OHourlyRate } from "@/lib/utils/o2oFeeRates";
import { toast } from "sonner";

type O2OBillingAction = "sales-order" | "sales-invoice";

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

function parseAdmissionDiscountMeta(description?: string | null): { amount: number; remark?: string } | null {
  const text = description ?? "";

  const withReason = text.match(/Admission discount:\s*-₹([\d,]+)(?:\s*\|\s*Reason:\s*(.+))?/i);
  if (withReason) {
    const amount = Number((withReason[1] ?? "0").replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, remark: withReason[2]?.trim() || undefined };
    }
  }

  const withBracket = text.match(/Admission discount:\s*-₹([\d,]+)(?:\s*\(([^)]+)\))?/i);
  if (withBracket) {
    const amount = Number((withBracket[1] ?? "0").replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, remark: withBracket[2]?.trim() || undefined };
    }
  }

  return null;
}

function hoursBetween(fromTime?: string, toTime?: string): number {
  if (!fromTime || !toTime) return 0;
  const [fromH, fromM = "0", fromS = "0"] = fromTime.split(":");
  const [toH, toM = "0", toS = "0"] = toTime.split(":");
  const from = Number(fromH) * 3600 + Number(fromM) * 60 + Number(fromS);
  const to = Number(toH) * 3600 + Number(toM) * 60 + Number(toS);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return Number(((to - from) / 3600).toFixed(2));
}

export default function StudentViewPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId);
  const router = useRouter();

  // ── Discontinue modal state ───────────────────────────────
  const [showDiscontinue, setShowDiscontinue] = useState(false);

  // ── Parent login password state ───────────────────────────
  const [parentPassword, setParentPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [billingAction, setBillingAction] = useState<O2OBillingAction | null>(null);

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
          filters: JSON.stringify([["student", "=", id], ["docstatus", "!=", 2]]),
          fields: JSON.stringify(["name", "program", "academic_year", "student_batch_name", "enrollment_date", "custom_fee_structure", "custom_plan", "custom_no_of_instalments", "docstatus"]),
          order_by: "docstatus desc, enrollment_date desc",
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
      // Sync stored password to state
      if (data.data?.custom_portal_password) {
        setParentPassword(data.data.custom_portal_password);
      }
      return data.data;
    },
    enabled: !!guardianLink?.guardian,
    staleTime: 120_000,
  });

  // ── Fee Structure details from enrollment ─────────────────
  const feeStructureName = enrollmentRes?.custom_fee_structure;
  const { data: feeStructureRes } = useQuery({
    queryKey: ["fee-structure-detail", feeStructureName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Fee Structure/${encodeURIComponent(feeStructureName!)}`);
      return data.data;
    },
    enabled: !!feeStructureName,
    staleTime: 120_000,
  });

  // ── Sales Orders for this student's customer ──────────────
  const customerName = student?.customer;
  const { data: salesOrdersRes } = useQuery({
    queryKey: ["student-sales-orders", customerName],
    queryFn: async () => {
      const { data } = await apiClient.get("/resource/Sales Order", {
        params: {
          filters: JSON.stringify([["customer", "=", customerName], ["docstatus", "=", 1]]),
          fields: JSON.stringify(["name", "grand_total", "status", "transaction_date", "per_billed", "advance_paid", "custom_plan", "custom_no_of_instalments"]),
          order_by: "transaction_date desc",
          limit_page_length: 5,
        },
      });
      return data.data ?? [];
    },
    enabled: !!customerName,
    staleTime: 60_000,
  });

  // ── Sales Invoices for this student's customer ────────────
  const { data: salesInvoicesRes } = useQuery({
    queryKey: ["student-invoices", customerName],
    queryFn: async () => {
      const { data } = await apiClient.get("/resource/Sales Invoice", {
        params: {
          filters: JSON.stringify([["customer", "=", customerName], ["docstatus", "=", 1]]),
          fields: JSON.stringify(["name", "grand_total", "outstanding_amount", "posting_date", "due_date", "status"]),
          order_by: "due_date asc",
          limit_page_length: 20,
        },
      });
      return data.data ?? [];
    },
    enabled: !!customerName,
    staleTime: 60_000,
  });

  const latestSalesOrderName = salesOrdersRes?.[0]?.name;
  const { data: salesOrderDiscountMeta } = useQuery({
    queryKey: ["student-so-discount-meta", latestSalesOrderName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Sales Order/${encodeURIComponent(latestSalesOrderName!)}`);
      const rows = (data.data?.items ?? []) as Array<{ description?: string | null }>;
      let totalDiscount = 0;
      let remark: string | undefined;

      for (const row of rows) {
        const parsed = parseAdmissionDiscountMeta(row.description);
        if (!parsed) continue;
        totalDiscount += parsed.amount;
        if (!remark && parsed.remark) remark = parsed.remark;
      }

      return { totalDiscount, remark };
    },
    enabled: !!latestSalesOrderName,
    staleTime: 60_000,
  });

  // ── Student Groups (sections/divisions) ─────────────────
  const { data: studentGroupsRes } = useQuery({
    queryKey: ["student-groups-for-student", id],
    queryFn: async () => {
      const { data } = await apiClient.get("/resource/Student Group", {
        params: {
          filters: JSON.stringify([["Student Group Student", "student", "=", id]]),
          fields: JSON.stringify(["name", "student_group_name", "program", "batch"]),
          limit_page_length: 10,
        },
      });
      return (data.data ?? []) as Array<{ name: string; student_group_name?: string; program?: string; batch?: string }>;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: o2oBillingContext, isLoading: o2oBillingLoading } = useQuery({
    queryKey: ["student-o2o-billing-context", id, student?.custom_branch],
    queryFn: async () => {
      const groupsRes = await getStudentGroups({
        branch: student?.custom_branch || undefined,
        oneToOneOnly: true,
      });
      const group = (groupsRes.data ?? []).find(
        (row) => row.name.includes(`(${id})`) || row.student_group_name?.includes(id),
      );
      if (!group) return null;

      const schedulesRes = await getCourseSchedules({
        student_group: group.name,
        limit_page_length: 500,
      });
      const schedules = schedulesRes.data ?? [];
      const totalHours = Number(
        schedules.reduce((sum, row) => sum + hoursBetween(row.from_time, row.to_time), 0).toFixed(2),
      );
      const rate = getO2OHourlyRate(group.program || "");
      const amount = Number((totalHours * rate).toFixed(2));

      return {
        groupName: group.name,
        groupDisplayName: group.student_group_name || group.name,
        program: group.program,
        scheduleCount: schedules.length,
        totalHours,
        rate,
        amount,
      };
    },
    enabled: !!id && !!student?.custom_branch,
    staleTime: 60_000,
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
  const queryClient = useQueryClient();
  const isO2OStudent = Boolean(o2oBillingContext?.groupName);
  const hasSalesOrder = (salesOrdersRes?.length ?? 0) > 0;
  const hasSalesInvoice = (salesInvoicesRes?.length ?? 0) > 0;
  const canGenerateSalesOrder = isO2OStudent && !hasSalesOrder && (o2oBillingContext?.scheduleCount ?? 0) > 0;
  const canGenerateSalesInvoice = isO2OStudent && hasSalesOrder && !hasSalesInvoice && (o2oBillingContext?.scheduleCount ?? 0) > 0;

  async function handleRegenerateBilling(action: O2OBillingAction) {
    setBillingAction(action);
    try {
      const res = await fetch("/api/one-to-one/regenerate-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Billing regeneration failed.");
        return;
      }

      if (action === "sales-order") {
        toast.success(`Sales Order ${String((data as { salesOrderName?: string }).salesOrderName ?? "")} generated.`);
      } else {
        const inv = (data as { invoices?: string[] }).invoices?.[0] ?? "";
        toast.success(`Sales Invoice ${String(inv)} generated.`);
      }

      queryClient.invalidateQueries({ queryKey: ["student-sales-orders", customerName] });
      queryClient.invalidateQueries({ queryKey: ["student-invoices", customerName] });
      queryClient.invalidateQueries({ queryKey: ["student-so-discount-meta"] });
    } finally {
      setBillingAction(null);
    }
  }

  // Check if student is already discontinued
  const isDiscontinued = student.enabled === 0 && !!student.custom_discontinuation_date;

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
        <div className="flex items-center gap-2">
          {student.enabled === 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscontinue(true)}
              className="!border-warning/40 !text-warning hover:!bg-warning/5 gap-1.5"
            >
              <UserX className="h-4 w-4" />
              Discontinue
            </Button>
          )}
          <Link href={`/dashboard/branch-manager/students/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
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
                <Badge variant={student.enabled === 1 ? "success" : isDiscontinued ? "error" : "default"}>
                  {student.enabled === 1 ? "Active" : isDiscontinued ? "Discontinued" : "Inactive"}
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
          {student.custom_student_type && (
            <InfoRow label="Student Type" value={student.custom_student_type} />
          )}
          <InfoRow label="Email" value={student.student_email_id} icon={<Mail className="h-3.5 w-3.5" />} />
          <InfoRow label="Mobile" value={student.student_mobile_number} icon={<Phone className="h-3.5 w-3.5" />} />
          {student.custom_disabilities && (
            <InfoRow label="Disabilities / Special Needs" value={student.custom_disabilities} icon={<AlertCircle className="h-3.5 w-3.5" />} />
          )}
        </SectionCard>

        {/* Academic Info */}
        <SectionCard title="Academic Details" icon={<School className="h-4 w-4" />}>
          <InfoRow label="Branch" value={student.custom_branch} icon={<Building2 className="h-3.5 w-3.5" />} />
          <InfoRow label="SRR ID" value={student.custom_srr_id} icon={<Hash className="h-3.5 w-3.5" />} />
          <InfoRow label="Class" value={enrollment?.program} />
          <InfoRow label="Academic Year" value={enrollment?.academic_year} />
          <InfoRow label="Batch" value={enrollment?.student_batch_name} />
          {(studentGroupsRes ?? []).length > 0 && (
            <InfoRow
              label="Student Group"
              value={(studentGroupsRes ?? []).map((g) => g.student_group_name || g.name).join(", ")}
              icon={<Users className="h-3.5 w-3.5" />}
            />
          )}
          <InfoRow label="Enrollment Date" value={enrollment?.enrollment_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          <InfoRow label="Joining Date" value={student.joining_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          {enrollment?.name && (
            <InfoRow label="Enrollment ID" value={enrollment.name} />
          )}
          {enrollment?.custom_plan && (
            <InfoRow label="Fee Plan" value={enrollment.custom_plan} />
          )}
          {enrollment?.custom_no_of_instalments && (
            <InfoRow label="Instalments" value={
              enrollment.custom_no_of_instalments === "1" ? "One-Time" : `${enrollment.custom_no_of_instalments} Instalments`
            } />
          )}
        </SectionCard>

        {/* Fee Structure */}
        {feeStructureRes && (
          <SectionCard title="Fee Structure" icon={<IndianRupee className="h-4 w-4" />}>
            <InfoRow label="Structure" value={feeStructureRes.name} icon={<FileText className="h-3.5 w-3.5" />} />
            <InfoRow label="Program" value={feeStructureRes.program} />
            <InfoRow label="Academic Year" value={feeStructureRes.academic_year} />
            {(feeStructureRes.components ?? []).map((comp: { fees_category: string; amount: number }, idx: number) => (
              <InfoRow key={idx} label={comp.fees_category} value={`₹${(comp.amount ?? 0).toLocaleString("en-IN")}`} />
            ))}
            <div className="flex items-center justify-between py-2.5 border-t border-border-light mt-1">
              <span className="text-sm font-semibold text-text-primary">Total Amount</span>
              <span className="text-sm font-bold text-primary">₹{(feeStructureRes.total_amount ?? 0).toLocaleString("en-IN")}</span>
            </div>
          </SectionCard>
        )}

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

              {/* Parent Login Credentials */}
              {guardian?.email_address && (
                <div className="mt-3 pt-3 border-t border-border-light">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-text-primary">Parent Login</span>
                  </div>
                  <div className="rounded-lg bg-app-bg border border-border-light p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-text-tertiary">Login Email</p>
                        <p className="text-sm font-medium text-text-primary">{guardian.email_address}</p>
                      </div>
                    </div>
                    {parentPassword ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-text-tertiary">Password</p>
                          <p className="text-sm font-mono font-medium text-text-primary">
                            {showPassword ? parentPassword : "••••••••••"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowPassword((v) => !v)}
                            className="p-1.5 rounded-md hover:bg-border-light transition-colors text-text-secondary"
                            title={showPassword ? "Hide" : "Show"}
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(parentPassword);
                              setCopiedPwd(true);
                              setTimeout(() => setCopiedPwd(false), 2000);
                            }}
                            className="p-1.5 rounded-md hover:bg-border-light transition-colors text-text-secondary"
                            title="Copy password"
                          >
                            {copiedPwd ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary italic">No password stored. Click Reset to set one.</p>
                    )}
                    <button
                      disabled={resettingPwd}
                      onClick={async () => {
                        setResettingPwd(true);
                        try {
                          const res = await fetch("/api/admin/reset-parent-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ email: guardian.email_address }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setParentPassword(data.password);
                            setShowPassword(true);
                          } else {
                            alert(data.error || "Failed to reset password");
                          }
                        } catch {
                          alert("Network error");
                        } finally {
                          setResettingPwd(false);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {resettingPwd ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      {parentPassword ? "Reset Password" : "Set Password"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-tertiary py-2">No guardian linked.</p>
          )}
        </SectionCard>

      </div>

      {/* One-to-One billing recovery */}
      {isO2OStudent && (!hasSalesOrder || !hasSalesInvoice) && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-primary"><CreditCard className="h-4 w-4" /></span>
                <h3 className="font-semibold text-text-primary">One-to-One Billing Recovery</h3>
              </div>
              <Badge variant="warning">One-to-One</Badge>
            </div>

            {o2oBillingLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading scheduled-course summary…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs mb-4">
                  <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                    <p className="text-text-tertiary">Student Group</p>
                    <p className="font-medium text-text-primary truncate" title={o2oBillingContext?.groupDisplayName || "—"}>
                      {o2oBillingContext?.groupDisplayName || "—"}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                    <p className="text-text-tertiary">Scheduled Sessions</p>
                    <p className="font-semibold text-text-primary">{o2oBillingContext?.scheduleCount ?? 0}</p>
                  </div>
                  <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                    <p className="text-text-tertiary">Total Hours</p>
                    <p className="font-semibold text-text-primary">{(o2oBillingContext?.totalHours ?? 0).toFixed(2)}h</p>
                  </div>
                  <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                    <p className="text-text-tertiary">Estimated Billing</p>
                    <p className="font-semibold text-text-primary">₹{(o2oBillingContext?.amount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {(canGenerateSalesOrder || canGenerateSalesInvoice || !hasSalesOrder || !hasSalesInvoice) && (
                  <div className="rounded-[12px] border border-warning/20 bg-warning/5 p-4">
                    <p className="text-sm font-medium text-text-primary mb-1">Missing billing documents can be rebuilt from scheduled courses.</p>
                    <p className="text-xs text-text-secondary mb-3">
                      This uses the existing One-to-One schedules to recalculate fee amount at ₹{(o2oBillingContext?.rate ?? 0).toLocaleString("en-IN")}/hr.
                    </p>
                    {(o2oBillingContext?.scheduleCount ?? 0) === 0 ? (
                      <p className="text-xs text-text-tertiary">No scheduled courses found yet, so billing cannot be regenerated.</p>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {canGenerateSalesOrder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateBilling("sales-order")}
                            disabled={billingAction !== null}
                          >
                            {billingAction === "sales-order" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            Generate Sales Order
                          </Button>
                        )}
                        {canGenerateSalesInvoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateBilling("sales-invoice")}
                            disabled={billingAction !== null}
                          >
                            {billingAction === "sales-invoice" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            Generate Sales Invoice
                          </Button>
                        )}
                        {!canGenerateSalesOrder && !canGenerateSalesInvoice && hasSalesOrder && hasSalesInvoice && (
                          <p className="text-xs text-success">Sales Order and Sales Invoice already exist for this student.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee & Payments Section */}
      {(salesOrdersRes?.length > 0 || salesInvoicesRes?.length > 0) && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary"><CreditCard className="h-4 w-4" /></span>
                <h3 className="font-semibold text-text-primary">Fee & Payments</h3>
              </div>
              {salesOrdersRes?.[0]?.name && (
                <Link href={`/dashboard/branch-manager/sales-orders/${encodeURIComponent(salesOrdersRes[0].name)}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Order
                  </Button>
                </Link>
              )}
            </div>

            {/* SO summary */}
            {salesOrdersRes?.length > 0 && (() => {
              const so = salesOrdersRes[0];
              // Aggregate ALL submitted SOs so totals stay consistent when a student has multiple orders
              const soTotalGrand = (salesOrdersRes as { grand_total: number }[]).reduce((s, o) => s + (o.grand_total ?? 0), 0);
              const invTotal = salesInvoicesRes?.reduce((s: number, i: { grand_total: number }) => s + i.grand_total, 0) ?? 0;
              const invOutstanding = salesInvoicesRes?.reduce((s: number, i: { outstanding_amount: number }) => s + i.outstanding_amount, 0) ?? 0;
              const paid = invTotal - invOutstanding;
              const pct = soTotalGrand > 0 ? Math.min(100, Math.round((paid / soTotalGrand) * 100)) : 0;
              const totalDiscount = salesOrderDiscountMeta?.totalDiscount ?? 0;
              const discountRemark = salesOrderDiscountMeta?.remark;
              const originalTotalFees = soTotalGrand + totalDiscount;
              const multipleOrders = salesOrdersRes.length > 1;
              return (
                <div className="rounded-[12px] border border-border-light bg-app-bg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono text-primary">{so.name}</span>
                      {multipleOrders && <span className="text-[10px] text-text-tertiary ml-2">+{salesOrdersRes.length - 1} more order{salesOrdersRes.length > 2 ? "s" : ""}</span>}
                      {so.custom_plan && <Badge variant="info" className="ml-2">{so.custom_plan}</Badge>}
                      {so.custom_no_of_instalments && <Badge variant="default" className="ml-1">{so.custom_no_of_instalments}x</Badge>}
                    </div>
                    <span className="text-lg font-bold text-text-primary">₹{soTotalGrand.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                    <span>Paid: <strong className="text-success">₹{paid.toLocaleString("en-IN")}</strong></span>
                    <span>Outstanding: <strong className="text-error">₹{invOutstanding.toLocaleString("en-IN")}</strong></span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                    <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                      <p className="text-text-tertiary">Overall Total Fees</p>
                      <p className="font-semibold text-text-primary">₹{originalTotalFees.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                      <p className="text-text-tertiary">Overall Discount</p>
                      <p className="font-semibold text-amber-700">- ₹{totalDiscount.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                      <p className="text-text-tertiary">Why Discount</p>
                      <p className="font-medium text-text-primary truncate" title={discountRemark || "—"}>{discountRemark || "—"}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-1">{pct}% collected</p>
                </div>
              );
            })()}

            {/* Invoice list */}
            {salesInvoicesRes?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left pb-2 font-semibold text-text-secondary text-xs">Invoice</th>
                      <th className="text-left pb-2 font-semibold text-text-secondary text-xs">Due Date</th>
                      <th className="text-right pb-2 font-semibold text-text-secondary text-xs">Amount</th>
                      <th className="text-right pb-2 font-semibold text-text-secondary text-xs">Outstanding</th>
                      <th className="text-right pb-2 font-semibold text-text-secondary text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesInvoicesRes.map((inv: { name: string; due_date?: string; posting_date: string; grand_total: number; outstanding_amount: number; status: string }) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const dueDate = inv.due_date ?? inv.posting_date;
                      const isPaid = inv.outstanding_amount <= 0;
                      const isOverdue = !isPaid && dueDate < todayStr;
                      return (
                        <tr key={inv.name} className="border-b border-border-light last:border-0">
                          <td className="py-2 text-xs font-mono text-text-primary">{inv.name}</td>
                          <td className="py-2">
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-error font-semibold" : "text-text-secondary"}`}>
                              {isOverdue && <Clock className="h-3 w-3 shrink-0" />}
                              {new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              {isOverdue && <span className="text-[9px] font-bold ml-0.5">OVERDUE</span>}
                            </span>
                          </td>
                          <td className="py-2 text-right text-xs font-semibold text-text-primary">₹{inv.grand_total.toLocaleString("en-IN")}</td>
                          <td className="py-2 text-right text-xs">
                            {isPaid ? (
                              <span className="text-success">—</span>
                            ) : (
                              <span className="font-semibold text-error">₹{inv.outstanding_amount.toLocaleString("en-IN")}</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <Badge variant={isPaid ? "success" : isOverdue ? "error" : "warning"}>
                              {isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!salesInvoicesRes?.length && salesOrdersRes?.length > 0 && (
              <p className="text-xs text-text-tertiary text-center py-3">Invoices will appear here once generated.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Discontinuation Info Card */}
      {isDiscontinued && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-error"><UserX className="h-4 w-4" /></span>
              <h3 className="font-semibold text-text-primary">Discontinuation Details</h3>
            </div>
            <div className="bg-error/5 border border-error/20 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-text-tertiary mb-0.5">Date</p>
                  <p className="text-sm font-medium text-text-primary">
                    {student.custom_discontinuation_date
                      ? new Date(student.custom_discontinuation_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary mb-0.5">Reason</p>
                  <p className="text-sm font-medium text-text-primary">
                    {student.custom_discontinuation_reason || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary mb-0.5">Remarks</p>
                  <p className="text-sm font-medium text-text-primary">
                    {student.custom_discontinuation_remarks || "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discontinue Modal */}
      {showDiscontinue && student && (
        <DiscontinueStudentModal
          student={student}
          onClose={() => setShowDiscontinue(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["student", id] });
            queryClient.invalidateQueries({ queryKey: ["student-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["student-sales-orders"] });
          }}
        />
      )}
    </motion.div>
  );
}
