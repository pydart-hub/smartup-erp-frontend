"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  GraduationCap,
  History,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  User,
  WalletCards,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type ActiveExam = {
  publishingId: string;
  slug: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
};

type AttemptHistoryItem = {
  id: string;
  studentName: string;
  studentBranch: string | null;
  classLevel: string;
  examTitle: string;
  status: string;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  createdAt: string;
  reportUrl: string | null;
};

const BRANCHES = [
  "SmartUp KADAVANTHARA",
  "SmartUp Edappally",
  "SmartUp VENNALA",
  "SmartUp ERAVELI",
  "SmartUp FORTKOCHI",
  "SmartUp CHULLIKAL",
  "SmartUp PALLURUTHY",
  "SmartUp THOPPUMPADY",
  "SmartUp MOOLAMKUZHI",
];

const LEVEL_OPTIONS = [
  { value: "8", label: "Class 8" },
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
];

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExamSiteLandingPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [exams, setExams] = useState<ActiveExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingExams, setFetchingExams] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<AttemptHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedDetails, setHasSavedDetails] = useState(false);

  const normalizedPhone = useMemo(() => studentPhone.replace(/\D/g, ""), [studentPhone]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smartup_exam_student_name");
      const savedBranch = localStorage.getItem("smartup_exam_student_branch");
      const savedPhone = localStorage.getItem("smartup_exam_student_phone");
      const savedClass = localStorage.getItem("smartup_exam_student_class");

      if (savedName && savedBranch && savedPhone && savedClass) {
        setStudentName(savedName);
        setStudentBranch(savedBranch);
        setStudentPhone(savedPhone);
        setClassLevel(savedClass);
        setHasSavedDetails(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!classLevel) {
      setExams([]);
      setSelectedExamId("");
      return;
    }

    const fetchActiveExams = async () => {
      setFetchingExams(true);
      setError(null);
      try {
        const res = await fetch(`/api/public-exam/active?classLevel=${classLevel}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load exams");
          return;
        }
        setExams(data.exams || []);
        setSelectedExamId(data.exams?.[0]?.publishingId || "");
      } catch (err) {
        console.error(err);
        setError("Network error fetching exams");
      } finally {
        setFetchingExams(false);
      }
    };

    fetchActiveExams();
  }, [classLevel]);

  useEffect(() => {
    if (normalizedPhone.length !== 10) {
      setHistoryItems([]);
      setFetchingHistory(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setFetchingHistory(true);
      try {
        const res = await fetch(`/api/public-exam/history?phone=${normalizedPhone}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setHistoryItems(data.attempts || []);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setFetchingHistory(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [normalizedPhone]);

  const handleClearDetails = () => {
    localStorage.removeItem("smartup_exam_student_name");
    localStorage.removeItem("smartup_exam_student_branch");
    localStorage.removeItem("smartup_exam_student_phone");
    localStorage.removeItem("smartup_exam_student_class");
    setStudentName("");
    setStudentBranch("");
    setStudentPhone("");
    setClassLevel("");
    setHasSavedDetails(false);
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) return setError("Please enter your name");
    if (!studentBranch) return setError("Please select your branch");
    if (!normalizedPhone) return setError("Please enter your phone number");
    if (!/^\d{10}$/.test(normalizedPhone)) return setError("Please enter a valid 10-digit phone number");
    if (!classLevel) return setError("Please select your class");
    if (!selectedExamId) return setError("No active exam selected");

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentBranch,
          studentPhone: normalizedPhone,
          classLevel,
          publishingId: selectedExamId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start the exam");
        return;
      }

      // Save student details for seamless one-by-one exam flow
      localStorage.setItem("smartup_exam_student_name", studentName.trim());
      localStorage.setItem("smartup_exam_student_branch", studentBranch.trim());
      localStorage.setItem("smartup_exam_student_phone", normalizedPhone);
      localStorage.setItem("smartup_exam_student_class", classLevel);
      setHasSavedDetails(true);

      sessionStorage.setItem(`exam_token_${data.attemptId}`, data.sessionToken);
      router.push(`/exam-site/attempt/${data.attemptId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to establish server connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f6f1ff_0%,#fbf8ff_42%,#ffffff_100%)] text-text-primary selection:bg-[#eee7ff] selection:text-[#5d35d5] dark:bg-[radial-gradient(circle_at_top,#17122b_0%,#141028_42%,#0d0b1a_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-2rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(103,58,183,0.16),transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(103,58,183,0.2),transparent_68%)]" />
        <div className="absolute left-[32%] top-[8%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(149,117,205,0.18),transparent_72%)] blur-3xl animate-[floatSoft_12s_ease-in-out_infinite] dark:bg-[radial-gradient(circle,rgba(149,117,205,0.14),transparent_72%)]" />
        <div className="absolute bottom-[-8rem] right-[-6rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(126,87,194,0.12),transparent_72%)] blur-3xl animate-[floatSoft_15s_ease-in-out_infinite_reverse] dark:bg-[radial-gradient(circle,rgba(126,87,194,0.14),transparent_72%)]" />
      </div>

      <header className="relative z-10 border-b border-[#e9deff] bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#eadfff] bg-white shadow-[0_12px_24px_rgba(93,53,213,0.08)] dark:border-white/10 dark:bg-white/8 sm:h-11 sm:w-11">
              <Image src="/smartup-logo-v2.png" alt="SmartUp Logo" width={26} height={26} className="object-contain" priority />
            </div>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[1.5rem] font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-[1.9rem]">Smartup</span>
              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-[#673ab7] sm:text-sm">Exam</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/auth/login")}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#e9deff] bg-white/92 px-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(93,53,213,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d7c5ff] hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:bg-white/10 sm:h-12 sm:px-5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-74px)] w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_0.98fr] lg:items-start lg:px-8 lg:py-10 xl:gap-10">
        <section className="order-1 max-w-xl lg:order-1 lg:pl-8">
          <div className="max-w-md">
            <h1 className="text-[2.15rem] font-bold tracking-[-0.06em] text-slate-950 dark:text-white sm:text-5xl lg:text-[3.8rem] lg:leading-[1.02]">
              <span className="block pb-1">Begin Your</span>
              <span className="mt-1 block bg-[linear-gradient(135deg,#5d35d5,#7e57c2)] bg-clip-text pb-2 text-transparent">Diagnosis</span>
            </h1>
            <div className="mt-4 h-1 w-24 rounded-full bg-[linear-gradient(90deg,#5d35d5,#7e57c2)] sm:mt-5 sm:w-28" />
            <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-400 sm:text-lg sm:leading-9">
              A focused, premium exam experience designed for clarity and performance.
            </p>
          </div>

          <div className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
            <InfoRow icon={<Sparkles className="h-5 w-5" />} title="Fast & Focused" description="Intentionally crisp and time-efficient flow." />
            <InfoRow icon={<ShieldCheck className="h-5 w-5" />} title="Secure & Private" description="Your data and progress are always protected." />
            <InfoRow icon={<WalletCards className="h-5 w-5" />} title="Insightful Reports" description="Concise reports that help you improve." />
          </div>
        </section>

        <section className="order-2 lg:order-2 [perspective:1800px] space-y-4">
          <div className="relative mx-auto max-w-[620px] overflow-hidden rounded-[28px] border border-[#eee4ff] bg-white/88 p-4 shadow-[0_16px_42px_rgba(93,53,213,0.08)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:[transform:rotateX(1.5deg)_rotateY(-2deg)_translateY(-4px)] hover:shadow-[0_24px_58px_rgba(93,53,213,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] dark:shadow-[0_22px_56px_rgba(0,0,0,0.3)] sm:p-5 lg:ml-auto lg:p-6 [transform-style:preserve-3d]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(103,58,183,0.12),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(126,87,194,0.16),transparent_72%)]" />
            <div className="pointer-events-none absolute -right-10 top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(103,58,183,0.14),transparent_70%)] blur-2xl animate-[pulseGlow_6s_ease-in-out_infinite]" />

            <div className="relative mb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,rgba(103,58,183,0.14),rgba(103,58,183,0.05))] text-[#673ab7] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-[linear-gradient(180deg,rgba(149,117,205,0.2),rgba(149,117,205,0.08))] sm:h-12 sm:w-12">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#673ab7] sm:text-xs">Step 1 of 3</div>
                <h2 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[1.8rem]">Student Details</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fill in your details to continue</p>
              </div>
            </div>

            <form onSubmit={handleStartExam} className="relative space-y-4">
              {hasSavedDetails ? (
                <div className="relative overflow-hidden rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#673ab7] dark:text-[#9575cd]">Registered Student</div>
                      <div className="mt-1 text-base font-bold text-slate-950 dark:text-white">{studentName}</div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Class {classLevel} · {studentBranch} · {studentPhone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearDetails}
                      className="shrink-0 text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      Change Details
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <InputField icon={<User className="h-[18px] w-[18px]" />}>
                    <input type="text" required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full Name" className="h-13 w-full rounded-[18px] border border-[#e9deff] bg-white/92 px-12 pr-4 text-[15px] text-slate-900 outline-none transition duration-300 placeholder:text-slate-400 hover:border-[#d7c5ff] focus:border-[#673ab7] focus:shadow-[0_0_0_4px_rgba(103,58,183,0.08),0_14px_24px_rgba(103,58,183,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/15" />
                  </InputField>

                  <InputField icon={<WalletCards className="h-[18px] w-[18px]" />}>
                    <select required value={studentBranch} onChange={(e) => setStudentBranch(e.target.value)} className="h-13 w-full appearance-none rounded-[18px] border border-[#e9deff] bg-white/92 px-12 pr-12 text-[15px] text-slate-900 outline-none transition duration-300 hover:border-[#d7c5ff] focus:border-[#673ab7] focus:shadow-[0_0_0_4px_rgba(103,58,183,0.08),0_14px_24px_rgba(103,58,183,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:border-white/15">
                      <option value="" disabled>Select Your Branch</option>
                      {BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d79b4] dark:text-slate-500" />
                  </InputField>

                  <InputField icon={<Phone className="h-[18px] w-[18px]" />}>
                    <input
                      type="tel"
                      required
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Phone Number"
                      inputMode="numeric"
                      maxLength={10}
                      className="h-13 w-full rounded-[18px] border border-[#e9deff] bg-white/92 px-12 pr-4 text-[15px] text-slate-900 outline-none transition duration-300 placeholder:text-slate-400 hover:border-[#d7c5ff] focus:border-[#673ab7] focus:shadow-[0_0_0_4px_rgba(103,58,183,0.08),0_14px_24px_rgba(103,58,183,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/15"
                    />
                  </InputField>
                </>
              )}

              {normalizedPhone.length === 10 ? (
                <div className="rounded-[20px] border border-[#eee4ff] bg-[#fbf8ff]/92 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7e6a9f] dark:text-slate-400">
                    <History className="h-3.5 w-3.5 text-[#673ab7]" />
                    Previous History
                  </div>
                  {fetchingHistory ? (
                    <div className="rounded-[16px] border border-[#e9deff] bg-white px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                      Checking previous attempts...
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="rounded-[16px] border border-[#e9deff] bg-white px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                      No previous diagnosis history found for this mobile number.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyItems.map((item) => (
                        <div key={item.id} className="rounded-[18px] border border-[#e9deff] bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.05]">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.examTitle}</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {item.studentName} · Class {item.classLevel} · {item.studentBranch || "Branch not set"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatHistoryDate(item.createdAt)}</div>
                            </div>
                            <div className="flex items-center gap-2 self-start">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-[#efe8ff] text-[#673ab7]"}`}>
                                {item.status === "in_progress" ? "In Progress" : `${item.percentage}%`}
                              </span>
                              {item.reportUrl ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(item.reportUrl!)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#d7c5ff] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#673ab7] transition hover:bg-[#f7f3ff]"
                                >
                                  View Report
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-4">
                            <span className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-center dark:bg-white/10">Score {item.scoreObtained}/{item.totalMarks}</span>
                            <span className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-center dark:bg-white/10">{item.correctCount} correct</span>
                            <span className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-center dark:bg-white/10">{item.wrongCount} wrong</span>
                            <span className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-center dark:bg-white/10">{item.unansweredCount} skipped</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {!hasSavedDetails && (
                <div className="pt-1">
                  <label className="mb-3 block text-[1rem] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">Select Class Level</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {LEVEL_OPTIONS.map((level) => {
                      const active = classLevel === level.value;
                      return (
                        <button key={level.value} type="button" onClick={() => setClassLevel(level.value)} className={`relative rounded-[20px] border px-3 py-4 text-center transition duration-300 [transform-style:preserve-3d] hover:-translate-y-1 hover:[transform:translateY(-4px)_rotateX(2deg)] ${active ? "border-[#673ab7] bg-[linear-gradient(180deg,rgba(103,58,183,0.08),rgba(103,58,183,0.02))] shadow-[0_14px_24px_rgba(103,58,183,0.1)]" : "border-[#e9deff] bg-white hover:border-[#d7c5ff] hover:shadow-[0_14px_22px_rgba(93,53,213,0.06)] dark:border-white/10 dark:bg-white/[0.05]"}`}>
                          {active ? <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#673ab7] text-white shadow-[0_12px_20px_rgba(103,58,183,0.28)] animate-[pulseGlow_4s_ease-in-out_infinite]"><span className="text-xs">✓</span></div> : null}
                          <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-[#efe8ff] text-[#673ab7]" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"}`}><GraduationCap className="h-5 w-5" /></div>
                          <div className="mt-3 text-[15px] font-semibold text-slate-950 dark:text-white">{level.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {classLevel ? (
                <div className="rounded-[20px] border border-[#eee4ff] bg-[#fbf8ff]/92 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7e6a9f] dark:text-slate-400">Available Subject Exams</div>
                  {fetchingExams ? (
                    <div className="rounded-[16px] border border-[#e9deff] bg-white px-4 py-4 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">Checking active exams...</div>
                  ) : exams.length === 0 ? (
                    <div className="flex gap-3 rounded-[16px] border border-amber-300/40 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>No active diagnosis exams are available for {LEVEL_OPTIONS.find((item) => item.value === classLevel)?.label} right now.</span></div>
                  ) : (
                    <div className="grid gap-3">
                      {exams.map((exam) => {
                        const isSelected = selectedExamId === exam.publishingId;
                        return (
                          <button key={exam.publishingId} type="button" onClick={() => setSelectedExamId(exam.publishingId)} className={`rounded-[18px] border px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${isSelected ? "border-[#673ab7]/35 bg-[linear-gradient(145deg,rgba(103,58,183,0.12),rgba(103,58,183,0.03))] shadow-[0_12px_22px_rgba(103,58,183,0.12)] dark:border-[#9575cd]/40 dark:bg-[linear-gradient(145deg,rgba(149,117,205,0.16),rgba(149,117,205,0.05))]" : "border-[#e9deff] bg-white hover:border-[#d7c5ff] hover:shadow-[0_10px_20px_rgba(93,53,213,0.06)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.07]"}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-slate-950 dark:text-white">{exam.subjectName}</div>
                                <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{exam.totalQuestions} questions · {exam.totalMarks} marks · {exam.durationMinutes} mins</div>
                              </div>
                              <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition duration-200 ${isSelected ? "border-[#673ab7] bg-[#673ab7]" : "border-slate-300 dark:border-slate-600"}`}><div className={`h-2 w-2 rounded-full ${isSelected ? "bg-white" : "bg-transparent"}`} /></div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-3 rounded-[16px] border border-rose-300/40 bg-rose-50 px-4 py-3.5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" disabled={loading || !selectedExamId || fetchingExams} className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#5d35d5,#7e57c2)] px-6 text-[15px] font-semibold text-white shadow-[0_18px_30px_rgba(93,53,213,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_36px_rgba(93,53,213,0.3)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700">
                {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Play className="h-4 w-4 fill-current" />Start Diagnosis Exam<span className="ml-1 text-lg">→</span></>}
              </button>

              <div className="flex items-center justify-center gap-2 text-sm text-[#7a6897] dark:text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                No registration required
              </div>
            </form>
          </div>
        </section>
      </main>

      <style jsx>{`
        @keyframes floatSoft {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -18px, 0);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.75;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(103,58,183,0.12),rgba(103,58,183,0.04))] text-[#673ab7] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-[linear-gradient(180deg,rgba(149,117,205,0.18),rgba(149,117,205,0.05))] sm:h-14 sm:w-14">{icon}</div>
      <div>
        <div className="text-base font-semibold text-slate-950 dark:text-white sm:text-[1.05rem]">{title}</div>
        <p className="mt-1.5 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-base">{description}</p>
      </div>
    </div>
  );
}

function InputField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative text-[#8d79b4] dark:text-slate-500">
      <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2">{icon}</div>
      {children}
    </div>
  );
}
