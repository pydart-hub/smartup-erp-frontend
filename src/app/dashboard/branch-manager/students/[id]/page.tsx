"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, User, School, Users, Phone, Mail,
  Calendar, Hash, Building2, AlertCircle, Loader2, IndianRupee, FileText,
  Clock, CreditCard, ExternalLink, UserX, KeyRound, Eye, EyeOff, RotateCcw, Copy, Check,
  GraduationCap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudent } from "@/lib/api/students";
import { getStudentGroups, getCourseSchedules } from "@/lib/api/courseSchedule";
import { getSalesInvoices } from "@/lib/api/sales";
import apiClient from "@/lib/api/client";
import { DiscontinueStudentModal } from "@/components/students/DiscontinueStudentModal";
import { ConvertDemoModal } from "@/components/students/ConvertDemoModal";
import { StudentTransactionHistory } from "@/components/fees/StudentTransactionHistory";
import { SendReceiptModal } from "@/components/fees/SendReceiptModal";
import { resolveO2OHourlyRate } from "@/lib/utils/o2oFeeRates";
import { extractO2ORateFromRecord } from "@/lib/utils/o2oRateField";
import { formatBillingMonthLabel, getBillingMonthKey, resolveBilledScheduleNames } from "@/lib/utils/o2oBillingMetadata";
import { selectPrimarySalesOrder, sortSalesOrdersForDisplay } from "@/lib/utils/salesOrderSelection";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
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

async function resolveStoredO2ORate(
  studentId: string,
  program: string,
  studentGroupName?: string,
  groupRate?: unknown,
): Promise<number> {
  try {
    const params = new URLSearchParams({
      studentId,
      program,
      ...(studentGroupName ? { studentGroupName } : {}),
    });
    const res = await fetch(`/api/one-to-one/rate?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof (data as { rate?: unknown }).rate === "number") {
      return Number((data as { rate: number }).rate);
    }
  } catch {
    // fall through
  }

  try {
    const peRes = await apiClient.get<{ data?: Array<Record<string, unknown>> }>(
      `/resource/Program Enrollment?fields=${encodeURIComponent(JSON.stringify(["custom_o2o_rate_per_class", "custom_o2o_rate_per_hour"]))}&filters=${encodeURIComponent(JSON.stringify([["student", "=", studentId], ["docstatus", "!=", 2]]))}&order_by=${encodeURIComponent("enrollment_date desc, creation desc")}&limit_page_length=1`,
    );
    const peRate = extractO2ORateFromRecord(peRes.data?.data?.[0]);
    return resolveO2OHourlyRate(program, peRate ?? groupRate);
  } catch {
    if (groupRate != null) return resolveO2OHourlyRate(program, groupRate);
    try {
      const res = await fetch(`/api/one-to-one/default-rate?program=${encodeURIComponent(program)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof (data as { rate?: unknown }).rate === "number") {
        return Number((data as { rate: number }).rate);
      }
    } catch {
      // fall through
    }
    return resolveO2OHourlyRate(program, groupRate);
  }
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

function monthSortDesc(a: string, b: string): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

function formatInvoiceDueDate(date: string): string {
  return formatDate(date, "dd MMM yyyy");
}

export default function StudentViewPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId);
  const router = useRouter();

  // ── Discontinue modal state ───────────────────────────────
  const [showDiscontinue, setShowDiscontinue] = useState(false);

  // ── Convert Demo modal state ──────────────────────────────
  const [showConvertDemo, setShowConvertDemo] = useState(false);

  // ── Send Receipt modal state ──────────────────────────────
  const [showSendReceipt, setShowSendReceipt] = useState(false);

  // ── Parent login password state ───────────────────────────
  const [parentPassword, setParentPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [billingAction, setBillingAction] = useState<O2OBillingAction | null>(null);
  const [selectedBillingMonth, setSelectedBillingMonth] = useState("");
  const [billingRate, setBillingRate] = useState("");

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
          fields: JSON.stringify(["name", "grand_total", "status", "transaction_date", "creation", "modified", "per_billed", "advance_paid", "custom_plan", "custom_no_of_instalments"]),
          order_by: "transaction_date desc, creation desc",
          limit_page_length: 5,
        },
      });
      return sortSalesOrdersForDisplay(data.data ?? []);
    },
    enabled: !!customerName,
    staleTime: 60_000,
  });

  const primarySalesOrder = selectPrimarySalesOrder(salesOrdersRes);
  const primarySalesOrderName = primarySalesOrder?.name;
  const submittedSalesOrderNames = (salesOrdersRes ?? []).map((so: { name: string }) => so.name);

  // ── Sales Invoices linked to the latest displayed Sales Order ────────────
  const { data: salesInvoicesRes } = useQuery({
    queryKey: ["student-invoices", submittedSalesOrderNames.join("|")],
    queryFn: async () => {
      if (submittedSalesOrderNames.length === 0) return [];
      const allInvoices = await Promise.all(
        submittedSalesOrderNames.map(async (salesOrderName) => {
          const res = await getSalesInvoices({
            sales_order: salesOrderName,
            docstatus: 1,
            order_by: "due_date asc",
            limit_page_length: 20,
          });
          return (res.data ?? []).map((invoice) => ({
            ...invoice,
            sales_order: salesOrderName,
          }));
        }),
      );
        return allInvoices
          .flat()
          .sort((a, b) => {
            const aDate = Date.parse(a.due_date ?? a.posting_date ?? "");
            const bDate = Date.parse(b.due_date ?? b.posting_date ?? "");
            return (aDate || 0) - (bDate || 0);
          });
    },
    enabled: submittedSalesOrderNames.length > 0,
    staleTime: 60_000,
  });
  const salesInvoices = salesInvoicesRes ?? [];

  const latestPaidInvoice = [...salesInvoices]
    .filter((inv) => inv.outstanding_amount <= 0 || inv.status === "Paid")
    .sort((a, b) => {
      const aDate = Date.parse(a.posting_date ?? a.due_date ?? "");
      const bDate = Date.parse(b.posting_date ?? b.due_date ?? "");
      return (bDate || 0) - (aDate || 0);
    })[0] ?? null;

  const { data: salesOrderDiscountMeta } = useQuery({
    queryKey: ["student-so-discount-meta", primarySalesOrderName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Sales Order/${encodeURIComponent(primarySalesOrderName!)}`);
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
    enabled: !!primarySalesOrderName,
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
      const soListRes = await apiClient.get<{ data?: Array<{ name: string }> }>("/resource/Sales Order", {
        params: {
          filters: JSON.stringify([["customer", "=", student?.customer || ""], ["docstatus", "=", 1]]),
          fields: JSON.stringify(["name"]),
          limit_page_length: 100,
          order_by: "creation desc",
        },
      });
      const detailedSalesOrders: Array<{
        name: string;
        transaction_date?: string;
        creation?: string;
        items?: Array<{ description?: string | null }>;
      }> = [];
      for (const so of soListRes.data?.data ?? []) {
        try {
          const soDetail = await apiClient.get<{ data?: { transaction_date?: string; creation?: string; items?: Array<{ description?: string | null }> } }>(
            `/resource/Sales Order/${encodeURIComponent(so.name)}`,
          );
          detailedSalesOrders.push({
            name: so.name,
            transaction_date: soDetail.data?.data?.transaction_date,
            creation: soDetail.data?.data?.creation,
            items: soDetail.data?.data?.items ?? [],
          });
        } catch {
          // ignore per-order detail failures
        }
      }
      const billedScheduleNames = resolveBilledScheduleNames({
        schedules,
        salesOrders: detailedSalesOrders,
      });
      const totalHours = Number(
        schedules.reduce((sum, row) => sum + hoursBetween(row.from_time, row.to_time), 0).toFixed(2),
      );
      const rate = await resolveStoredO2ORate(
        id,
        group.program || "",
        group.name,
        extractO2ORateFromRecord((group ?? null) as unknown as Record<string, unknown> | null),
      );
      const amount = Number((totalHours * rate).toFixed(2));
      const monthly = [...new Set(schedules.map((row) => getBillingMonthKey(row.schedule_date)).filter((v): v is string => !!v))]
        .sort(monthSortDesc)
        .map((monthKey) => {
          const monthSchedules = schedules.filter((row) => getBillingMonthKey(row.schedule_date) === monthKey);
          const unbilledSchedules = monthSchedules.filter((row) => !billedScheduleNames.has(row.name));
          const monthHours = Number(
            monthSchedules.reduce((sum, row) => sum + hoursBetween(row.from_time, row.to_time), 0).toFixed(2),
          );
          const unbilledHours = Number(
            unbilledSchedules.reduce((sum, row) => sum + hoursBetween(row.from_time, row.to_time), 0).toFixed(2),
          );
          return {
            monthKey,
            label: formatBillingMonthLabel(monthKey),
            scheduleCount: monthSchedules.length,
            totalHours: monthHours,
            unbilledCount: unbilledSchedules.length,
            unbilledHours,
            unbilledAmount: Number((unbilledHours * rate).toFixed(2)),
          };
        });

      return {
        groupName: group.name,
        groupDisplayName: group.student_group_name || group.name,
        program: group.program,
        scheduleCount: schedules.length,
        totalHours,
        rate,
        amount,
        monthly,
      };
    },
    enabled: !!id && !!student?.custom_branch,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!o2oBillingContext?.monthly?.length) return;
    if (selectedBillingMonth && o2oBillingContext.monthly.some((m) => m.monthKey === selectedBillingMonth)) return;
    const firstUnbilled = o2oBillingContext.monthly.find((m) => m.unbilledCount > 0)?.monthKey;
    setSelectedBillingMonth(firstUnbilled ?? o2oBillingContext.monthly[0].monthKey);
  }, [o2oBillingContext, selectedBillingMonth]);

  useEffect(() => {
    if (!o2oBillingContext?.rate) return;
    if (billingRate.trim()) return;
    setBillingRate(String(o2oBillingContext.rate));
  }, [o2oBillingContext, billingRate]);

  // ── queryClient — must be called before any early returns ──
  const queryClient = useQueryClient();

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
  const hasRegularOrder = (salesOrdersRes ?? []).some(
    (so: { custom_plan?: string }) => ["Basic", "Intermediate", "Advanced"].includes((so.custom_plan ?? "").trim()),
  );
  const hasDemoLikeOrder = (salesOrdersRes ?? []).some(
    (so: { custom_plan?: string }) => !["Basic", "Intermediate", "Advanced"].includes((so.custom_plan ?? "").trim()),
  );
  const isConvertedStudent = student.custom_student_type !== "Demo" && hasRegularOrder && hasDemoLikeOrder;
  const isO2OStudent = Boolean(o2oBillingContext?.groupName);
  const selectedMonthlyBilling = o2oBillingContext?.monthly?.find((m) => m.monthKey === selectedBillingMonth) ?? null;
  const parsedBillingRate = Number(billingRate);
  const canGenerateSalesOrder = isO2OStudent && (selectedMonthlyBilling?.unbilledCount ?? 0) > 0;

  async function handleRegenerateBilling(action: O2OBillingAction) {
    if (!Number.isFinite(parsedBillingRate) || parsedBillingRate <= 0) {
      toast.error("Enter a valid hourly rate before generating monthly billing.");
      return;
    }
    setBillingAction(action);
    try {
      const res = await fetch("/api/one-to-one/regenerate-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: id,
          action,
          billingMonth: selectedBillingMonth,
          rate: parsedBillingRate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Billing regeneration failed.");
        return;
      }

      if (action === "sales-order") {
        const salesOrderName = String((data as { salesOrderName?: string }).salesOrderName ?? "");
        const invoiceName = String((data as { invoices?: string[] }).invoices?.[0] ?? "");
        toast.success(
          invoiceName
            ? `Sales Order ${salesOrderName} and Sales Invoice ${invoiceName} generated.`
            : `Sales Order ${salesOrderName} generated.`,
        );
      } else {
        const inv = (data as { invoices?: string[] }).invoices?.[0] ?? "";
        toast.success(`Sales Invoice ${String(inv)} generated.`);
      }

      queryClient.invalidateQueries({ queryKey: ["student-sales-orders", customerName] });
      queryClient.invalidateQueries({ queryKey: ["student-invoices", customerName] });
      queryClient.invalidateQueries({ queryKey: ["student-so-discount-meta"] });
      queryClient.invalidateQueries({ queryKey: ["student-o2o-billing-context", id, student?.custom_branch] });
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
          {student.enabled === 1 && student.custom_student_type === "Demo" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConvertDemo(true)}
              className="!border-primary/40 !text-primary hover:!bg-primary/5 gap-1.5"
            >
              <GraduationCap className="h-4 w-4" />
              Convert to Regular
            </Button>
          )}
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
                {isConvertedStudent && (
                  <Badge variant="outline" className="border-cyan-300 text-cyan-700 bg-cyan-50">
                    Converted
                  </Badge>
                )}
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
          <InfoRow label="School Name" value={student.custom_school_name} icon={<GraduationCap className="h-3.5 w-3.5" />} />
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
      {isO2OStudent && (
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
                    <p className="text-text-tertiary">Reference Rate</p>
                    <p className="font-semibold text-text-primary">₹{(o2oBillingContext?.rate ?? 0).toLocaleString("en-IN")}/hr</p>
                  </div>
                </div>

                <div className="rounded-[10px] border border-border-light bg-surface p-3 mb-4">
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-xs font-medium text-text-secondary">Billing Month</label>
                      <select
                        className="h-9 rounded-[8px] border border-border-input bg-white px-3 text-sm text-text-primary"
                        value={selectedBillingMonth}
                        onChange={(e) => setSelectedBillingMonth(e.target.value)}
                      >
                        {(o2oBillingContext?.monthly ?? []).map((month) => (
                          <option key={month.monthKey} value={month.monthKey}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-text-secondary">Hourly Rate</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="h-9 w-36 rounded-[8px] border border-border-input bg-white px-3 text-sm text-text-primary"
                        value={billingRate}
                        onChange={(e) => setBillingRate(e.target.value)}
                      />
                    </div>
                  </div>
                  {selectedMonthlyBilling && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs mt-3">
                      <div className="rounded-[8px] border border-border-light bg-app-bg p-2.5">
                        <p className="text-text-tertiary">Month Sessions</p>
                        <p className="font-semibold text-text-primary">{selectedMonthlyBilling.scheduleCount}</p>
                      </div>
                      <div className="rounded-[8px] border border-border-light bg-app-bg p-2.5">
                        <p className="text-text-tertiary">Month Hours</p>
                        <p className="font-semibold text-text-primary">{selectedMonthlyBilling.totalHours.toFixed(2)}h</p>
                      </div>
                      <div className="rounded-[8px] border border-border-light bg-app-bg p-2.5">
                        <p className="text-text-tertiary">Unbilled Sessions</p>
                        <p className="font-semibold text-text-primary">{selectedMonthlyBilling.unbilledCount}</p>
                      </div>
                      <div className="rounded-[8px] border border-border-light bg-app-bg p-2.5">
                        <p className="text-text-tertiary">Unbilled Amount</p>
                        <p className="font-semibold text-text-primary">
                          ₹{Number((selectedMonthlyBilling.unbilledHours * (Number.isFinite(parsedBillingRate) && parsedBillingRate > 0 ? parsedBillingRate : 0)).toFixed(2)).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[12px] border border-warning/20 bg-warning/5 p-4">
                  <p className="text-sm font-medium text-text-primary mb-1">Monthly One-to-One billing is generated from unbilled schedules only.</p>
                  <p className="text-xs text-text-secondary mb-3">
                    This uses only the selected month&apos;s schedules and excludes schedule rows that were already included in earlier One-to-One Sales Orders.
                  </p>
                  {(selectedMonthlyBilling?.scheduleCount ?? 0) === 0 ? (
                    <p className="text-xs text-text-tertiary">No scheduled courses found for this month.</p>
                  ) : (selectedMonthlyBilling?.unbilledCount ?? 0) === 0 ? (
                    <p className="text-xs text-success">All schedules in {selectedMonthlyBilling?.label} are already billed.</p>
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
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee & Payments Section */}
      {((salesOrdersRes?.length ?? 0) > 0 || salesInvoices.length > 0) && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary"><CreditCard className="h-4 w-4" /></span>
                <h3 className="font-semibold text-text-primary">Fee & Payments</h3>
              </div>
              <div className="flex items-center gap-2">
                {latestPaidInvoice && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSendReceipt(true)}
                    className="!border-success/40 !text-success hover:!bg-success/5 gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send Receipt
                  </Button>
                )}
                {primarySalesOrderName && (
                  <Link href={`/dashboard/branch-manager/sales-orders/${encodeURIComponent(primarySalesOrderName)}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Latest Order
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* SO summary */}
            {(salesOrdersRes ?? []).length > 0 && (
              <div className="space-y-3 mb-4">
                {(salesOrdersRes ?? []).map((so: { name: string; grand_total?: number; custom_plan?: string; custom_no_of_instalments?: string }) => {
                  const linkedInvoices = salesInvoices.filter((inv: { sales_order?: string }) => inv.sales_order === so.name);
                  const soTotalGrand = so.grand_total ?? 0;
                  const invTotal = linkedInvoices.reduce((s: number, i: { grand_total: number }) => s + i.grand_total, 0);
                  const invOutstanding = linkedInvoices.reduce((s: number, i: { outstanding_amount: number; grand_total: number }) => s + Math.min(i.outstanding_amount, i.grand_total), 0);
                  const displayedTotal = invTotal > 0 ? invTotal : soTotalGrand;
                  const paid = invTotal - invOutstanding;
                  const pct = displayedTotal > 0 ? Math.min(100, Math.round((paid / displayedTotal) * 100)) : 0;
                  const totalDiscount = so.name === primarySalesOrderName ? (salesOrderDiscountMeta?.totalDiscount ?? 0) : 0;
                  const discountRemark = so.name === primarySalesOrderName ? salesOrderDiscountMeta?.remark : undefined;
                  const originalTotalFees = displayedTotal + totalDiscount;
                  return (
                    <div key={so.name} className="rounded-[12px] border border-border-light bg-app-bg p-4">
                      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                        <div>
                          <span className="text-xs font-mono text-primary">{so.name}</span>
                          {so.custom_plan && <Badge variant="info" className="ml-2">{so.custom_plan}</Badge>}
                          {so.custom_no_of_instalments && <Badge variant="default" className="ml-1">{so.custom_no_of_instalments}x</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-text-primary">₹{displayedTotal.toLocaleString("en-IN")}</span>
                          <Link href={`/dashboard/branch-manager/sales-orders/${encodeURIComponent(so.name)}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Order
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                        <span>Paid: <strong className="text-success">₹{paid.toLocaleString("en-IN")}</strong></span>
                        <span>Outstanding: <strong className="text-error">₹{invOutstanding.toLocaleString("en-IN")}</strong></span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                        <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                          <p className="text-text-tertiary">Overall Total Fees</p>
                          <p className="font-semibold text-text-primary">₹{Math.round(originalTotalFees).toLocaleString("en-IN")}</p>
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
                })}
              </div>
            )}
            {false && primarySalesOrder && (() => {
              const so = primarySalesOrder!;
              const soTotalGrand = so.grand_total ?? 0;
              const invTotal = salesInvoices.reduce((s: number, i: { grand_total: number }) => s + i.grand_total, 0);
              const invOutstanding = salesInvoices.reduce((s: number, i: { outstanding_amount: number; grand_total: number }) => s + Math.min(i.outstanding_amount, i.grand_total), 0);
              const displayedTotal = invTotal > 0 ? invTotal : soTotalGrand;
              const paid = invTotal - invOutstanding;
              const pct = displayedTotal > 0 ? Math.min(100, Math.round((paid / displayedTotal) * 100)) : 0;
              const totalDiscount = salesOrderDiscountMeta?.totalDiscount ?? 0;
              const discountRemark = salesOrderDiscountMeta?.remark;
              const originalTotalFees = displayedTotal + totalDiscount;
              const salesOrderCount = salesOrdersRes?.length ?? 0;
              const multipleOrders = salesOrderCount > 1;
              return (
                <div className="rounded-[12px] border border-border-light bg-app-bg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono text-primary">{so.name}</span>
                      {multipleOrders && <span className="text-[10px] text-text-tertiary ml-2">+{salesOrderCount - 1} more order{salesOrderCount > 2 ? "s" : ""}</span>}
                      {so.custom_plan && <Badge variant="info" className="ml-2">{so.custom_plan}</Badge>}
                      {so.custom_no_of_instalments && <Badge variant="default" className="ml-1">{so.custom_no_of_instalments}x</Badge>}
                    </div>
                    <span className="text-lg font-bold text-text-primary">₹{displayedTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                    <span>Paid: <strong className="text-success">₹{paid.toLocaleString("en-IN")}</strong></span>
                    <span>Outstanding: <strong className="text-error">₹{invOutstanding.toLocaleString("en-IN")}</strong></span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                    <div className="rounded-[8px] border border-border-light bg-surface p-2.5">
                      <p className="text-text-tertiary">Overall Total Fees</p>
                      <p className="font-semibold text-text-primary">₹{Math.round(originalTotalFees).toLocaleString("en-IN")}</p>
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
            {salesInvoices.length > 0 && (
              <div className="space-y-4">
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
                      {salesInvoices.map((inv: { name: string; due_date?: string; posting_date: string; grand_total: number; outstanding_amount: number; status: string }) => {
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
                                {formatInvoiceDueDate(dueDate)}
                                {isOverdue && <span className="text-[9px] font-bold ml-0.5">OVERDUE</span>}
                              </span>
                            </td>
                            <td className="py-2 text-right text-xs font-semibold text-text-primary">{formatCurrency(inv.grand_total)}</td>
                            <td className="py-2 text-right text-xs">
                              {isPaid ? (
                                <span className="text-success">-</span>
                              ) : (
                                <span className="font-semibold text-error">{formatCurrency(inv.outstanding_amount)}</span>
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

                {student?.custom_branch && (
                  <div className="rounded-[12px] border border-border-light bg-app-bg px-4 py-3">
                    <StudentTransactionHistory
                      studentId={id}
                      branch={student.custom_branch}
                    />
                  </div>
                )}
              </div>
            )}

            {salesInvoices.length === 0 && (salesOrdersRes?.length ?? 0) > 0 && (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {student.reason_for_leaving || student.custom_discontinuation_reason || "—"}
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

      {/* Convert Demo → Regular Modal */}
      {showConvertDemo && student && (
        <ConvertDemoModal
          student={student}
          onClose={() => setShowConvertDemo(false)}
          onSuccess={(result) => {
            setShowConvertDemo(false);
            if (result.invoiceError) {
              toast.warning(`${fullName} converted, but sale invoice creation failed. Sales Order ${result.salesOrderName} needs review.`);
            } else {
              toast.success(`${fullName} converted to Regular student successfully.`);
            }
            queryClient.invalidateQueries({ queryKey: ["student", id] });
            queryClient.invalidateQueries({ queryKey: ["enrollment", id] });
            queryClient.invalidateQueries({ queryKey: ["student-invoices", customerName] });
            queryClient.invalidateQueries({ queryKey: ["student-sales-orders", customerName] });
          }}
        />
      )}

      {/* Send Receipt Modal */}
      {showSendReceipt && latestPaidInvoice && (
        <SendReceiptModal
          isOpen={showSendReceipt}
          onClose={() => setShowSendReceipt(false)}
          invoice={latestPaidInvoice}
          defaultEmail={guardian?.email_address || ""}
          defaultPhone={guardian?.mobile_number || ""}
        />
      )}
    </motion.div>
  );
}
