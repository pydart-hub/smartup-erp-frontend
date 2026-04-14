"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  Send,
  HandCoins,
  Fingerprint,
  Eye,
  EyeOff,
  MapPin,
  GraduationCap,
  BookOpen,
  Search,
  UserPlus,
  RotateCcw,
  X,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { subjectStudentSchema, type SubjectStudentFormValues } from "@/lib/validators/subjectStudent";
import { admitStudent, getAcademicYears, getBranches, getStudentGroups, getNextSrrId } from "@/lib/api/enrollment";
import { getFeeStructures } from "@/lib/api/fees";
import type { FeeConfigEntry, PaymentOptionSummary } from "@/lib/types/fee";
import { getAllPaymentOptions, applyReferralDiscount, getSubjectsForBranch, getLevelsForBranch, getSubjectsForBranchLevel, getProgramsForLevel, HSS_PROGRAMS, type SubjectLevel } from "@/lib/utils/feeSchedule";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import PostAdmissionPayment from "@/components/payments/PostAdmissionPayment";
import type { InvoiceForPayment } from "@/components/payments/PostAdmissionPayment";

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
  { id: 3, label: "Subject & Batch", icon: BookOpen },
  { id: 4, label: "Fee Details", icon: CreditCard },
];

const SIBLING_STEPS = [
  { id: 0, label: "Sibling", icon: UserPlus },
  { id: 1, label: "Student Info", icon: User },
  { id: 2, label: "Guardian", icon: Users },
  { id: 3, label: "Subject & Batch", icon: BookOpen },
  { id: 4, label: "Fee Details", icon: CreditCard },
];

// ── Sibling search types ──────────────────────────────────────
interface SiblingSearchResult {
  name: string;
  student_name: string;
  custom_srr_id: string;
  custom_branch: string;
  custom_branch_abbr?: string;
  student_email_id?: string;
  student_mobile_number?: string;
  custom_parent_name?: string;
  program?: string;
  academic_year?: string;
  batch?: string;
}

interface SiblingGuardianInfo {
  name: string;
  guardian_name: string;
  email_address: string;
  mobile_number: string;
  relation: string;
}

const PLAN_OPTIONS = [
  { value: "Basic", label: "Basic", description: "Standard curriculum" },
  { value: "Intermediate", label: "Intermediate", description: "Enhanced learning" },
  { value: "Advanced", label: "Advanced", description: "Premium programme" },
];

export default function SubjectAdmissionPage() {
  return (
    <Suspense>
      <SubjectAdmitPageContent />
    </Suspense>
  );
}

function SubjectAdmitPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isReferred = searchParams.get("referred") === "true";
  const basePath = pathname.includes("/branch-manager") ? "/dashboard/branch-manager" : "/dashboard/sales-user";
  const { defaultCompany, allowedCompanies } = useAuth();
  const [currentStep, setCurrentStep] = useState(isReferred ? 0 : 1);
  const [paymentAction, setPaymentAction] = useState<"pay_now" | "send_to_parent" | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number | null>(null);

  // ── Sibling selection state (only for referred/sibling flow) ──
  const [siblingQuery, setSiblingQuery] = useState("");
  const [siblingSearchResults, setSiblingSearchResults] = useState<SiblingSearchResult[]>([]);
  const [siblingSearching, setSiblingSearching] = useState(false);
  const [selectedSibling, setSelectedSibling] = useState<SiblingSearchResult | null>(null);
  const [siblingGuardian, setSiblingGuardian] = useState<SiblingGuardianInfo | null>(null);
  const [siblingGroup, setSiblingGroup] = useState<string | null>(null);
  const siblingSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSteps = isReferred ? SIBLING_STEPS : STEPS;

  // Post-admission payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [admissionResult, setAdmissionResult] = useState<{
    studentName: string;
    customerName: string;
    guardianName: string;
    guardianEmail: string;
    guardianPhone: string;
    mode: "Cash" | "Online";
    salesOrderName?: string;
    invoices: InvoiceForPayment[];
  } | null>(null);

  // ── Sibling search handler (debounced) ───────────────────────
  function handleSiblingSearch(query: string) {
    setSiblingQuery(query);
    if (siblingSearchTimer.current) clearTimeout(siblingSearchTimer.current);
    if (query.trim().length < 2) {
      setSiblingSearchResults([]);
      return;
    }
    setSiblingSearching(true);
    siblingSearchTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim() });
        const res = await fetch(`/api/admission/search-sibling?${params}`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setSiblingSearchResults(json.data ?? []);
        }
      } catch { /* ignore */ }
      setSiblingSearching(false);
    }, 350);
  }

  // ── When a sibling is selected, fetch guardian details ────────
  async function handleSiblingSelect(sibling: SiblingSearchResult) {
    setSelectedSibling(sibling);
    setSiblingSearchResults([]);
    setSiblingQuery("");
    try {
      const res = await fetch(
        `/api/admission/sibling-details?student=${encodeURIComponent(sibling.name)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.guardian) {
          const g = json.guardian as SiblingGuardianInfo;
          setSiblingGuardian(g);
          setValue("guardian_name", g.guardian_name || "");
          setValue("guardian_email", g.email_address || "");
          setValue("guardian_mobile", g.mobile_number || "");
          setValue("guardian_relation", g.relation || "Father");
          setValue("guardian_password", "SmartUp@123");
        }
        if (json.siblingGroup) {
          setSiblingGroup(json.siblingGroup);
        }
      }
    } catch {
      toast.error("Failed to fetch sibling details");
    }
  }

  function clearSelectedSibling() {
    setSelectedSibling(null);
    setSiblingGuardian(null);
    setSiblingGroup(null);
    setValue("guardian_name", "");
    setValue("guardian_email", "");
    setValue("guardian_mobile", "");
    setValue("guardian_relation", "");
    setValue("guardian_password", "");
  }

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SubjectStudentFormValues>({
    resolver: zodResolver(subjectStudentSchema),
    defaultValues: {
      enrollment_date: new Date().toISOString().split("T")[0],
      gender: "Male",
      academic_year: "2026-2027",
      custom_branch: defaultCompany || "",
      student_type: "fresher",
      custom_plan: "",
      custom_no_of_instalments: "",
      level: "",
      subject: "",
      program: "",
      custom_mode_of_payment: undefined as unknown as "Cash" | "Online",
    },
  });

  // Pre-select branch when defaultCompany loads
  useEffect(() => {
    if (defaultCompany && !getValues("custom_branch")) {
      setValue("custom_branch", defaultCompany);
    }
  }, [defaultCompany, getValues, setValue]);

  const selectedBranch = watch("custom_branch");
  const selectedLevel = watch("level") as SubjectLevel | "";
  const selectedSubject = watch("subject");
  const selectedProgram = watch("program");

  // Reset dependent fields when branch changes
  const prevBranchRef = useRef(selectedBranch);
  useEffect(() => {
    if (prevBranchRef.current !== selectedBranch) {
      prevBranchRef.current = selectedBranch;
      setValue("level", "");
      setValue("subject", "");
      setValue("program", "");
      setValue("student_batch_name", "");
      setValue("custom_srr_id", "");
      setValue("custom_plan", "");
      setValue("custom_no_of_instalments", "");
    }
  }, [selectedBranch, setValue]);

  // Reset subject + program + batch when level changes
  const prevLevelRef = useRef(selectedLevel);
  useEffect(() => {
    if (prevLevelRef.current !== selectedLevel) {
      prevLevelRef.current = selectedLevel;
      setValue("subject", "");
      setValue("program", "");
      setValue("student_batch_name", "");
    }
  }, [selectedLevel, setValue]);

  // Reset batch when program changes
  const prevProgRef = useRef(selectedProgram);
  useEffect(() => {
    if (prevProgRef.current !== selectedProgram) {
      prevProgRef.current = selectedProgram;
      setValue("student_batch_name", "");
    }
  }, [selectedProgram, setValue]);

  // ── Levels available at selected branch ───────────────────────
  const availableLevels = useMemo(() => {
    if (!selectedBranch) return [];
    return getLevelsForBranch(selectedBranch);
  }, [selectedBranch]);

  // ── Subjects available at selected branch + level ─────────────
  const availableSubjects = useMemo(() => {
    if (!selectedBranch || !selectedLevel) return [];
    return getSubjectsForBranchLevel(selectedBranch, selectedLevel as SubjectLevel);
  }, [selectedBranch, selectedLevel]);

  // Auto-select subject if only one option (e.g. "10 Cbse Maths" for 10 CBSE)
  useEffect(() => {
    if (availableSubjects.length === 1 && !watch("subject")) {
      setValue("subject", availableSubjects[0]);
    }
  }, [availableSubjects, setValue, watch]);

  // ── Auto-fill next SRR ID when branch selected ───────────────
  const { data: nextSrrId, isFetching: loadingSrrId } = useQuery({
    queryKey: ["next-srr-id", selectedBranch],
    queryFn: () => getNextSrrId(selectedBranch),
    enabled: !!selectedBranch,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (nextSrrId) setValue("custom_srr_id", nextSrrId);
  }, [nextSrrId, setValue]);

  // ── Reference data ────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  // Filter branches: only show those that have subject-wise data AND are allowed for this user
  const subjectBranches = useMemo(() => {
    const subjectOnly = branches.filter((b) => getSubjectsForBranch(b.name).length > 0);
    if (allowedCompanies.length > 0) {
      return subjectOnly.filter((b) => allowedCompanies.includes(b.name));
    }
    return subjectOnly;
  }, [branches, allowedCompanies]);

  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: getAcademicYears,
    staleTime: Infinity,
  });

  // ── HSS Programs available at selected branch ─────────────────
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

  // Filter programs by level — only show programs for the selected level that exist at the branch
  const levelPrograms = useMemo(() => {
    if (!selectedLevel) return [];
    const levelProgs = getProgramsForLevel(selectedLevel as SubjectLevel);
    const branchProgs = new Set(
      (branchGroupsRes?.data ?? [])
        .filter((g) => g.program)
        .map((g) => g.program!)
    );
    return levelProgs.filter((p) => branchProgs.has(p));
  }, [selectedLevel, branchGroupsRes]);

  // Auto-select program if only one available for the level
  useEffect(() => {
    if (levelPrograms.length === 1 && !selectedProgram) {
      setValue("program", levelPrograms[0]);
    }
  }, [levelPrograms, selectedProgram, setValue]);

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

  const groupOptions = useMemo(() => {
    return studentGroups.filter((g) => g.name);
  }, [studentGroups]);

  useEffect(() => {
    if (groupOptions.length === 1) {
      setValue("student_batch_name", groupOptions[0].name!);
    }
  }, [groupOptions, setValue]);

  // ── Fee structure lookup ──────────────────────────────────────
  const selectedPlan = watch("custom_plan");
  const selectedInstalments = watch("custom_no_of_instalments");
  const selectedAcademicYear = watch("academic_year");
  const selectedModeOfPayment = watch("custom_mode_of_payment");

  const prevModeRef = useRef(selectedModeOfPayment);
  useEffect(() => {
    if (prevModeRef.current !== selectedModeOfPayment) {
      prevModeRef.current = selectedModeOfPayment;
      setPaymentAction(selectedModeOfPayment === "Cash" ? "pay_now" : null);
    }
  }, [selectedModeOfPayment]);

  // Fee structures for the HSS program (for resolving fee_structure name)
  const { data: feeStructuresRes, isFetching: loadingFeeStructures } = useQuery({
    queryKey: ["fee-structures", selectedBranch, selectedProgram, selectedAcademicYear],
    queryFn: () =>
      getFeeStructures({
        company: selectedBranch,
        program: selectedProgram,
        academic_year: selectedAcademicYear,
        docstatus: 1,
      }),
    enabled: !!(selectedBranch && selectedProgram && selectedAcademicYear),
    staleTime: 60_000,
  });

  const feeStructures = useMemo(() => feeStructuresRes?.data ?? [], [feeStructuresRes]);

  const availablePlans: string[] = useMemo(() => {
    const plans = new Set<string>();
    feeStructures.forEach((fs) => { if (fs.custom_plan) plans.add(fs.custom_plan); });
    return Array.from(plans);
  }, [feeStructures]);

  // Fee config lookup — uses SUBJECT key instead of program key
  const { data: feeConfigRes, isFetching: loadingFeeConfig } = useQuery({
    queryKey: ["fee-config-subject", selectedBranch, selectedSubject, selectedPlan],
    queryFn: async () => {
      const params = new URLSearchParams({
        company: selectedBranch,
        plan: selectedPlan,
        subject: selectedSubject,
      });
      const res = await fetch(`/api/fee-config?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as FeeConfigEntry;
    },
    enabled: !!(selectedBranch && selectedSubject && selectedPlan),
    staleTime: 60_000,
  });

  const feeConfig: FeeConfigEntry | null = feeConfigRes ?? null;

  const selectedEnrollmentDate = watch("enrollment_date");
  const paymentOptions: PaymentOptionSummary[] = useMemo(() => {
    if (!feeConfig) return [];
    const options = getAllPaymentOptions(feeConfig, selectedAcademicYear, selectedEnrollmentDate);
    return isReferred ? applyReferralDiscount(options) : options;
  }, [feeConfig, selectedAcademicYear, selectedEnrollmentDate, isReferred]);

  const selectedOption: PaymentOptionSummary | null = useMemo(() => {
    if (!selectedInstalments || paymentOptions.length === 0) return null;
    return paymentOptions.find((o) => o.instalments === Number(selectedInstalments)) ?? null;
  }, [paymentOptions, selectedInstalments]);

  const matchedFeeStructure = useMemo(() => {
    if (!selectedPlan || !selectedInstalments) return null;
    return feeStructures.find(
      (fs) =>
        fs.custom_plan === selectedPlan &&
        fs.custom_no_of_instalments === selectedInstalments
    ) ?? null;
  }, [feeStructures, selectedPlan, selectedInstalments]);

  useEffect(() => {
    const name = matchedFeeStructure?.name ?? "";
    setValue("fee_structure", name);
  }, [matchedFeeStructure, setValue]);

  const prevPlanRef = useRef(selectedPlan);
  useEffect(() => {
    if (prevPlanRef.current !== selectedPlan) {
      prevPlanRef.current = selectedPlan;
      setValue("custom_no_of_instalments", "");
    }
  }, [selectedPlan, setValue]);

  // ── Submit ────────────────────────────────────────────────────
  async function onSubmit(data: SubjectStudentFormValues) {
    try {
      const selectedGroupName = data.student_batch_name || undefined;
      const matchedGroup = selectedGroupName
        ? studentGroups.find((g) => g.name === selectedGroupName)
        : undefined;

      const nameParts = data.full_name.trim().split(/\s+/);
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;

      const branchObj = branches.find((b) => b.name === data.custom_branch);

      const result = await admitStudent({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        blood_group: data.blood_group,
        student_email_id: data.student_email_id,
        student_mobile_number: data.student_mobile_number,
        custom_aadhaar: data.aadhaar_number || undefined,
        custom_disabilities: data.disabilities || undefined,
        custom_place: data.custom_place || undefined,
        custom_school_name: data.custom_school_name || undefined,
        custom_student_type: data.student_type === "fresher" ? "Fresher" : data.student_type === "existing" ? "Existing" : "Rejoining",
        custom_branch: data.custom_branch,
        custom_branch_abbr: (branchObj as { abbr?: string })?.abbr,
        custom_srr_id: data.custom_srr_id,
        // Enrolled in HSS program (not "Physics")
        program: data.program,
        academic_year: data.academic_year,
        student_batch_name: matchedGroup?.batch,
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
        custom_subject: data.subject,
        instalmentSchedule: selectedOption?.schedule.map((s) => ({
          amount: s.amount,
          dueDate: s.dueDate,
          label: s.label,
        })),
        // Sibling fields
        ...(isReferred && selectedSibling ? {
          siblingOf: selectedSibling.name,
          siblingGroup: siblingGroup || undefined,
          existingGuardianName: siblingGuardian?.name,
        } : {}),
      });

      const soMsg = result.salesOrder ? ` SO: ${result.salesOrder}.` : "";
      const invMsg = result.invoices?.length ? ` ${result.invoices.length} invoice(s) created.` : "";
      toast.success(`Subject student admitted successfully!${soMsg}${invMsg}`);

      if (result.warnings?.length) {
        for (const w of result.warnings) {
          toast.warning(w, { duration: 8000 });
        }
      }

      // ── Post-admission payment flow ──
      const hasInvoices = (result.invoices?.length ?? 0) > 0;
      const wantsAction = paymentAction === "pay_now" || paymentAction === "send_to_parent";

      if (wantsAction && hasInvoices && selectedOption) {
        const invoicesForPayment: InvoiceForPayment[] = (result.invoices ?? []).map(
          (invId, idx) => {
            const scheduleItem = selectedOption.schedule[idx];
            return {
              invoiceId: invId,
              label: scheduleItem?.label ?? `Instalment ${idx + 1}`,
              amount: scheduleItem?.amount ?? 0,
              dueDate: scheduleItem?.dueDate ?? new Date().toISOString().split("T")[0],
            };
          }
        );

        let customerName = "";
        if (result.salesOrder) {
          try {
            const soRes = await fetch(
              `/api/proxy/resource/Sales Order/${encodeURIComponent(result.salesOrder)}?fields=["customer"]`,
              { credentials: "include" }
            );
            if (soRes.ok) {
              const soData = await soRes.json();
              customerName = soData.data?.customer ?? "";
            }
          } catch { /* fall through */ }
        }

        setAdmissionResult({
          studentName: result.student.student_name,
          customerName,
          guardianName: data.guardian_name,
          guardianEmail: data.guardian_email,
          guardianPhone: data.guardian_mobile,
          mode: data.custom_mode_of_payment,
          salesOrderName: result.salesOrder,
          invoices: invoicesForPayment,
        });
        setShowPaymentDialog(true);
      } else {
        router.push(`${basePath}/students`);
      }
    } catch (err: unknown) {
      const typedErr = err as { __type?: string; stages?: unknown[]; student?: unknown; warnings?: string[]; message?: string };
      const msg = (err as Error)?.message || "Failed to create student";
      toast.error(msg);
      if (typedErr.warnings?.length) {
        for (const w of typedErr.warnings) {
          toast.warning(w, { duration: 8000 });
        }
      }
    }
  }

  async function nextStep() {
    // Step 0 (sibling selection) — no form validation needed, just ensure sibling is selected
    if (currentStep === 0) {
      if (isReferred && !selectedSibling) return;
      setCurrentStep(1);
      return;
    }
    const fieldsToValidate: Record<number, (keyof SubjectStudentFormValues)[]> = {
      1: ["student_type", "full_name", "date_of_birth", "gender"],
      2: ["guardian_name", "guardian_mobile", "guardian_relation", "guardian_email", "guardian_password"],
      3: ["custom_branch", "level", "subject", "program", "academic_year", "enrollment_date"],
    };
    const isValid = await trigger(fieldsToValidate[currentStep] ?? []);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, 4));
  }

  function handleFormError(formErrors: FieldErrors<SubjectStudentFormValues>) {
    const step1Keys: (keyof SubjectStudentFormValues)[] = [
      "full_name", "date_of_birth", "gender",
      "blood_group", "student_email_id", "student_mobile_number",
    ];
    const step2Keys: (keyof SubjectStudentFormValues)[] = [
      "guardian_name", "guardian_mobile", "guardian_relation", "guardian_email", "guardian_password",
    ];
    const step3Keys: (keyof SubjectStudentFormValues)[] = [
      "custom_branch", "level", "subject", "program", "academic_year", "enrollment_date", "custom_srr_id", "student_batch_name",
    ];
    const step4Keys: (keyof SubjectStudentFormValues)[] = [
      "custom_plan", "custom_no_of_instalments", "custom_mode_of_payment",
    ];
    const errorKeys = Object.keys(formErrors) as (keyof SubjectStudentFormValues)[];
    if (errorKeys.some((k) => step1Keys.includes(k))) {
      setCurrentStep(1);
      toast.error("Please fix the errors in Student Info (Step 1)");
    } else if (errorKeys.some((k) => step2Keys.includes(k))) {
      setCurrentStep(2);
      toast.error("Please fix the errors in Guardian Info (Step 2)");
    } else if (errorKeys.some((k) => step3Keys.includes(k))) {
      setCurrentStep(3);
      toast.error("Please fix the errors in Subject & Batch Details (Step 3)");
    } else if (errorKeys.some((k) => step4Keys.includes(k))) {
      setCurrentStep(4);
      toast.error("Please complete the Fee Details (Step 4)");
    }
  }

  function prevStep() {
    const minStep = isReferred ? 0 : 1;
    setCurrentStep((prev) => Math.max(prev - 1, minStep));
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
          <h1 className="text-2xl font-bold text-text-primary">{isReferred ? "Subject-Wise Sibling Admission" : "Subject-Wise Tuition Admission"}</h1>
          <p className="text-sm text-text-secondary">{isReferred ? "5% sibling discount applied on first instalment" : "Enrol a student for individual subject tuition (HSS level)"}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {activeSteps.map((step, index) => {
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
          if (e.key === "Enter" && currentStep < 4) e.preventDefault();
        }}
      >
        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 0: Sibling Selection (only for referred/sibling flow) */}
              {currentStep === 0 && isReferred && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Select Existing Sibling</h3>
                    <p className="text-sm text-text-secondary mt-0.5">
                      Search for the existing student who is a sibling of the new student being admitted
                    </p>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Search by student name or SRR ID..."
                        value={siblingQuery}
                        onChange={(e) => handleSiblingSearch(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {siblingSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-tertiary" />
                      )}
                    </div>

                    {/* Search results dropdown */}
                    {siblingSearchResults.length > 0 && !selectedSibling && (
                      <div className="absolute z-10 mt-1 w-full bg-surface border border-border-light rounded-[10px] shadow-lg max-h-64 overflow-y-auto">
                        {siblingSearchResults.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => handleSiblingSelect(s)}
                            className="w-full flex items-start gap-3 p-3 hover:bg-app-bg transition-colors text-left border-b border-border-light last:border-0"
                          >
                            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{s.student_name}</p>
                              <p className="text-xs text-text-tertiary">
                                SRR: {s.custom_srr_id} · {s.custom_branch?.replace("Smart Up ", "")}
                                {s.program ? ` · ${s.program}` : ""}
                              </p>
                              {s.custom_parent_name && (
                                <p className="text-xs text-text-tertiary">Guardian: {s.custom_parent_name}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected sibling card */}
                  {selectedSibling && (
                    <div className="bg-purple-50 rounded-[12px] border-2 border-purple-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                            <UserPlus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{selectedSibling.student_name}</p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              ID: {selectedSibling.name} · SRR: {selectedSibling.custom_srr_id}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {selectedSibling.custom_branch?.replace("Smart Up ", "")}
                              {selectedSibling.program ? ` · ${selectedSibling.program}` : ""}
                              {selectedSibling.academic_year ? ` · ${selectedSibling.academic_year}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedSibling}
                          className="p-1 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          <X className="h-4 w-4 text-purple-600" />
                        </button>
                      </div>

                      {/* Guardian auto-filled preview */}
                      {siblingGuardian && (
                        <div className="mt-3 pt-3 border-t border-purple-200 space-y-1">
                          <p className="text-xs font-medium text-purple-700">Guardian details will be auto-filled:</p>
                          <p className="text-xs text-purple-600">
                            {siblingGuardian.guardian_name} ({siblingGuardian.relation}) · {siblingGuardian.mobile_number} · {siblingGuardian.email_address}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hint when nothing selected */}
                  {!selectedSibling && siblingSearchResults.length === 0 && !siblingSearching && (
                    <div className="bg-app-bg rounded-[10px] p-4 border border-border-light">
                      <p className="text-sm text-text-tertiary text-center">
                        Search for an existing student to link as a sibling. Guardian details will be auto-filled from the selected sibling&apos;s record.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 1: Student Info — identical to regular admission */}
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

                  {/* Student Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-secondary">Student Type *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: "fresher", label: "Fresher", icon: UserPlus, desc: "First time joining" },
                        { value: "existing", label: "Existing", icon: Users, desc: "Currently enrolled" },
                        { value: "rejoining", label: "Rejoining", icon: RotateCcw, desc: "Returning after a break" },
                      ] as const).map(({ value, label, icon: Icon, desc }) => {
                        const selected = watch("student_type") === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setValue("student_type", value, { shouldValidate: true })}
                            className={`flex flex-col items-center gap-2 rounded-[12px] border-2 p-3 transition-all ${
                              selected
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border-input bg-surface text-text-secondary hover:border-primary/40"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-bold">{label}</span>
                            <span className="text-[10px] text-center leading-tight opacity-70">{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.student_type && <p className="text-xs text-error">{errors.student_type.message}</p>}
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
                      placeholder="9876543210"
                      leftIcon={<Phone className="h-4 w-4" />}
                      maxLength={10}
                      inputMode="numeric"
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                      {...register("student_mobile_number")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Aadhaar Number"
                      placeholder="123456789012"
                      maxLength={12}
                      leftIcon={<Fingerprint className="h-4 w-4" />}
                      error={errors.aadhaar_number?.message}
                      {...register("aadhaar_number")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Place"
                      placeholder="e.g. Ernakulam"
                      leftIcon={<MapPin className="h-4 w-4" />}
                      {...register("custom_place")}
                    />
                    <Input
                      label="School Name"
                      placeholder="e.g. St. Mary's School"
                      leftIcon={<GraduationCap className="h-4 w-4" />}
                      {...register("custom_school_name")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Disabilities / Special Needs</label>
                    <textarea
                      className="w-full rounded-xl border border-border-medium bg-surface-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      rows={3}
                      placeholder="e.g. Hearing impairment — seat in front row"
                      {...register("disabilities")}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Guardian Details — identical to regular admission */}
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
                    <Input label="Guardian Name *" placeholder="Full name" error={errors.guardian_name?.message} disabled={!!siblingGuardian} {...register("guardian_name")} />
                    <SelectField label="Relation" required error={errors.guardian_relation?.message}>
                      <select className={selectCls} disabled={!!siblingGuardian} {...register("guardian_relation")}>
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
                      placeholder="9876543210"
                      leftIcon={<Phone className="h-4 w-4" />}
                      maxLength={10}
                      inputMode="numeric"
                      disabled={!!siblingGuardian}
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                      error={errors.guardian_mobile?.message}
                      {...register("guardian_mobile")}
                    />
                    <Input
                      label="Guardian Email *"
                      type="email"
                      placeholder="guardian@email.com"
                      leftIcon={<Mail className="h-4 w-4" />}
                      disabled={!!siblingGuardian}
                      error={errors.guardian_email?.message}
                      {...register("guardian_email")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Parent Login Password *"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      leftIcon={<Lock className="h-4 w-4" />}
                      disabled={!!siblingGuardian}
                      rightIcon={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      error={errors.guardian_password?.message}
                      hint={siblingGuardian ? "Using existing parent account" : "This will be used to create a parent login account"}
                      {...register("guardian_password")}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Subject & Batch Details — NEW for subject-wise */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Subject & Batch Details</h3>
                    <p className="text-sm text-text-secondary mt-0.5">Select branch, subject, and batch for tuition enrolment</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Branch — only branches with subject-wise data */}
                    <SelectField label="Branch" required error={errors.custom_branch?.message}>
                      <select
                        className={selectCls}
                        {...register("custom_branch")}
                      >
                        <option value="">Select branch</option>
                        {subjectBranches.map((b) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </SelectField>

                    {/* Level — Plus One / Plus Two / 10 CBSE */}
                    <SelectField label="Level" required error={errors.level?.message}>
                      <select
                        className={selectCls}
                        disabled={!selectedBranch || availableLevels.length === 0}
                        {...register("level")}
                      >
                        {!selectedBranch ? (
                          <option value="">Select branch first</option>
                        ) : (
                          <>
                            <option value="">Select level</option>
                            {availableLevels.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Subject — filtered by branch + level */}
                    <SelectField label="Subject" required error={errors.subject?.message}>
                      <select
                        className={selectCls}
                        disabled={!selectedLevel || availableSubjects.length === 0}
                        {...register("subject")}
                      >
                        {!selectedLevel ? (
                          <option value="">Select level first</option>
                        ) : availableSubjects.length === 0 ? (
                          <option value="">No subjects available</option>
                        ) : (
                          <>
                            <option value="">Select subject</option>
                            {availableSubjects.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </SelectField>

                    {/* Program — filtered by level */}
                    <SelectField label="Program" required error={errors.program?.message}>
                      <select
                        className={selectCls}
                        disabled={!selectedLevel || loadingBranchPrograms}
                        {...register("program")}
                      >
                        {!selectedLevel ? (
                          <option value="">Select level first</option>
                        ) : loadingBranchPrograms ? (
                          <option value="">Loading…</option>
                        ) : levelPrograms.length === 0 ? (
                          <option value="">No programs found</option>
                        ) : (
                          <>
                            <option value="">Select program</option>
                            {levelPrograms.map((p) => (
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
                      readOnly
                      className="cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="SRR ID *"
                      placeholder={loadingSrrId ? "Loading…" : "e.g. 550"}
                      error={errors.custom_srr_id?.message}
                      hint="Auto-generated"
                      {...register("custom_srr_id")}
                      readOnly
                      className="cursor-not-allowed opacity-70"
                    />
                  </div>

                  {selectedBranch && selectedProgram && (
                    <SelectField label="Batch" required error={errors.student_batch_name?.message}>
                      <select className={selectCls} {...register("student_batch_name")}>
                        <option value="">Select a batch</option>
                        {groupOptions.map((g) => {
                          const count = g.students?.length ?? "—";
                          const max = g.max_strength ?? 60;
                          return (
                            <option key={g.name} value={g.name}>
                              {g.name} ({count}/{max} students)
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

                  {selectedBranch && selectedSubject && (
                    <div className="bg-brand-wash rounded-[10px] p-4 border border-primary/10 flex items-start gap-2">
                      <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-primary">
                        {selectedLevel && <><span className="font-medium">{selectedLevel}</span> — </>}
                        Subject: <span className="font-semibold">{selectedSubject}</span> — Student will be enrolled in the program batch but billed at subject-wise rates.
                      </p>
                    </div>
                  )}

                  {selectedBranch && selectedProgram && studentGroups.length === 0 && (
                    <div className="bg-warning/10 rounded-[10px] p-4 border border-warning/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-warning">
                        No batches found for {selectedProgram} at {selectedBranch.replace("Smart Up ", "")}. Please contact the Branch Manager.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: Fee Details — same structure but uses subject fee config */}
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
                      Subject-wise fee for <span className="font-medium text-primary">{selectedSubject || "—"}</span>
                      {!selectedBranch || !selectedSubject
                        ? " — please select branch & subject in Step 3 first"
                        : ""}
                    </p>
                  </div>

                  {/* Fee structure matching is best-effort for subject-wise admission;
                      pricing comes from the local fee config JSON, not Frappe. */}

                  {/* Plan selection — always show for subject-wise when branch + subject are selected */}
                  {selectedBranch && selectedSubject && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Fee Plan *</label>
                      <div className={`grid gap-3 ${availablePlans.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
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

                  {/* Payment Option Selection */}
                  {selectedPlan && (loadingFeeConfig || paymentOptions.length > 0) && (
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
                      ) : paymentOptions.length === 0 ? (
                        <div className="bg-warning/10 rounded-[10px] p-4 border border-warning/20 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-warning">
                            No pricing found for <span className="font-medium">{selectedSubject}</span> ({selectedPlan} plan) at {selectedBranch.replace("Smart Up ", "")}. Please contact the administrator.
                          </p>
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

                  {/* Payment Action — only for Online */}
                  {selectedModeOfPayment === "Online" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">
                        Payment Action *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentAction("pay_now")}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 transition-all text-center ${
                            paymentAction === "pay_now"
                              ? "border-success bg-success/5"
                              : "border-border-input bg-surface hover:border-border-input/80"
                          }`}
                        >
                          <HandCoins className={`h-5 w-5 ${paymentAction === "pay_now" ? "text-success" : "text-text-tertiary"}`} />
                          <span className={`text-sm font-semibold ${paymentAction === "pay_now" ? "text-success" : "text-text-secondary"}`}>
                            Pay Now
                          </span>
                          <span className="text-xs text-text-tertiary">Parent is present — collect immediately</span>
                          {paymentAction === "pay_now" && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAction("send_to_parent")}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 transition-all text-center ${
                            paymentAction === "send_to_parent"
                              ? "border-info bg-info/5"
                              : "border-border-input bg-surface hover:border-border-input/80"
                          }`}
                        >
                          <Send className={`h-5 w-5 ${paymentAction === "send_to_parent" ? "text-info" : "text-text-tertiary"}`} />
                          <span className={`text-sm font-semibold ${paymentAction === "send_to_parent" ? "text-info" : "text-text-secondary"}`}>
                            Send to Parent
                          </span>
                          <span className="text-xs text-text-tertiary">Email payment link to parent</span>
                          {paymentAction === "send_to_parent" && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-info flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Advance amount input */}
                  {paymentAction === "pay_now" && selectedOption && selectedOption.schedule.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">
                        Amount to Collect Now
                      </label>
                      <div className="bg-app-bg rounded-[12px] border border-border-light p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">1st Instalment</span>
                          <span className="font-semibold text-text-primary">
                            ₹{selectedOption.schedule[0].amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min={1}
                            max={selectedOption.schedule[0].amount}
                            placeholder={`₹${selectedOption.schedule[0].amount.toLocaleString("en-IN")} (full amount)`}
                            value={advanceAmount ?? ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              if (val !== null && val > selectedOption!.schedule[0].amount) {
                                setAdvanceAmount(selectedOption!.schedule[0].amount);
                              } else {
                                setAdvanceAmount(val);
                              }
                            }}
                          />
                          <p className="text-xs text-text-tertiary mt-1">
                            Leave blank to collect full 1st instalment. Enter a lower amount to collect advance only.
                          </p>
                        </div>
                        {advanceAmount !== null && advanceAmount > 0 && advanceAmount < selectedOption.schedule[0].amount && (
                          <div className="flex items-center justify-between text-xs bg-warning-light rounded-lg px-3 py-2 border border-warning/20">
                            <span className="text-warning font-medium">
                              Advance: ₹{advanceAmount.toLocaleString("en-IN")}
                            </span>
                            <span className="text-text-secondary">
                              Remaining: ₹{(selectedOption.schedule[0].amount - advanceAmount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Admission summary */}
                  <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-sm space-y-1.5 text-text-secondary">
                    <p className="font-semibold text-text-primary mb-2">Admission Summary</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Student:</span> {watch("full_name") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Guardian:</span> {watch("guardian_name") || "—"}{watch("guardian_relation") ? ` (${watch("guardian_relation")})` : ""}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Branch:</span> {watch("custom_branch") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Level:</span> {watch("level") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Subject:</span> <span className="font-medium text-primary">{watch("subject") || "—"}</span></p>
                    <p><span className="text-text-tertiary w-36 inline-block">Program:</span> {watch("program") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Academic Year:</span> {watch("academic_year") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">SRR ID:</span> {watch("custom_srr_id") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Batch:</span> {watch("student_batch_name") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Enrollment Date:</span> {watch("enrollment_date") || "—"}</p>
                    <p><span className="text-text-tertiary w-36 inline-block">Fee Plan:</span> {selectedPlan || "—"}</p>
                    <p>
                      <span className="text-text-tertiary w-36 inline-block">Instalments:</span>
                      {selectedInstalments ? (selectedInstalments === "1" ? "One-Time" : `${selectedInstalments} Instalments`) : "—"}
                    </p>
                    <p><span className="text-text-tertiary w-36 inline-block">Payment Mode:</span> {selectedModeOfPayment || "—"}</p>
                    <p>
                      <span className="text-text-tertiary w-36 inline-block">Payment Action:</span>
                      {paymentAction === "pay_now"
                        ? selectedModeOfPayment === "Online" ? "Pay Now (Razorpay)" : "Pay Now (Cash)"
                        : paymentAction === "send_to_parent"
                          ? "Send Request to Parent"
                          : "—"
                      }
                    </p>
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
                disabled={currentStep === (isReferred ? 0 : 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  disabled={currentStep === 0 && isReferred && !selectedSibling}
                >
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

      {/* Post-Admission Payment Dialog */}
      {admissionResult && (
        <PostAdmissionPayment
          open={showPaymentDialog}
          onClose={() => {
            setShowPaymentDialog(false);
            setAdmissionResult(null);
            router.push(`${basePath}/students`);
          }}
          studentName={admissionResult.studentName}
          customerName={admissionResult.customerName}
          guardianName={admissionResult.guardianName}
          guardianEmail={admissionResult.guardianEmail}
          guardianPhone={admissionResult.guardianPhone}
          mode={admissionResult.mode}
          action={paymentAction || "send_to_parent"}
          invoices={admissionResult.invoices}
          salesOrderName={admissionResult.salesOrderName}
          advanceAmount={advanceAmount ?? undefined}
        />
      )}
    </motion.div>
  );
}
