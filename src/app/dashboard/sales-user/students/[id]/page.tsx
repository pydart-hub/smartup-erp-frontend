"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, School, Users, Phone, Mail,
  Calendar, Hash, Building2, AlertCircle, Loader2, IndianRupee, FileText,
  Clock, CreditCard,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
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

export default function SalesUserStudentDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId);
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

  // ── Guardian details ──────────────────────────────────────
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

  // ── Fee Structure details ─────────────────────────────────
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

  // ── Sales Orders ──────────────────────────────────────────
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

  // ── Sales Invoices ────────────────────────────────────────
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

  // ── Loading ───────────────────────────────────────────────
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
  const isDiscontinued = student.enabled === 0 && !!student.custom_discontinuation_date;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <BreadcrumbNav />

      {/* Back header — NO edit or discontinue buttons */}
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
          <InfoRow label="Enrollment Date" value={enrollment?.enrollment_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          <InfoRow label="Joining Date" value={student.joining_date} icon={<Calendar className="h-3.5 w-3.5" />} />
          {enrollment?.name && <InfoRow label="Enrollment ID" value={enrollment.name} />}
          {enrollment?.custom_plan && <InfoRow label="Fee Plan" value={enrollment.custom_plan} />}
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
            </>
          ) : (
            <p className="text-sm text-text-tertiary py-2">No guardian linked.</p>
          )}
        </SectionCard>
      </div>

      {/* Fee & Payments Section */}
      {(salesOrdersRes?.length > 0 || salesInvoicesRes?.length > 0) && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-primary"><CreditCard className="h-4 w-4" /></span>
              <h3 className="font-semibold text-text-primary">Fee & Payments</h3>
            </div>

            {/* SO summary */}
            {salesOrdersRes?.length > 0 && (() => {
              const so = salesOrdersRes[0];
              const invTotal = salesInvoicesRes?.reduce((s: number, i: { grand_total: number }) => s + i.grand_total, 0) ?? 0;
              const invOutstanding = salesInvoicesRes?.reduce((s: number, i: { outstanding_amount: number }) => s + i.outstanding_amount, 0) ?? 0;
              const paid = invTotal - invOutstanding;
              const pct = so.grand_total > 0 ? Math.round((paid / so.grand_total) * 100) : 0;
              return (
                <div className="rounded-[12px] border border-border-light bg-app-bg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono text-primary">{so.name}</span>
                      {so.custom_plan && <Badge variant="info" className="ml-2">{so.custom_plan}</Badge>}
                      {so.custom_no_of_instalments && <Badge variant="default" className="ml-1">{so.custom_no_of_instalments}x</Badge>}
                    </div>
                    <span className="text-lg font-bold text-text-primary">₹{so.grand_total.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                    <span>Paid: <strong className="text-success">₹{paid.toLocaleString("en-IN")}</strong></span>
                    <span>Outstanding: <strong className="text-error">₹{invOutstanding.toLocaleString("en-IN")}</strong></span>
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

      {/* Discontinuation Info */}
      {isDiscontinued && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-error"><AlertCircle className="h-4 w-4" /></span>
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
    </motion.div>
  );
}
