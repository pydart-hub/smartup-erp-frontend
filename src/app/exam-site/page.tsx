"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  ArrowUpRight,
  GraduationCap,
  MapPin,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  TimerReset,
  User,
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
  const [error, setError] = useState<string | null>(null);

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

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return setError("Please enter your name");
    if (!studentBranch) return setError("Please select your branch");
    if (!studentPhone.trim()) return setError("Please enter your phone number");
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
          studentPhone,
          classLevel,
          publishingId: selectedExamId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start the exam");
        return;
      }

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
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(145deg,#f3efe6_0%,#eef4ef_32%,#eef5fb_68%,#f6f1ea_100%)] text-text-primary selection:bg-primary-light selection:text-primary dark:bg-[linear-gradient(160deg,#08111f_0%,#0c1628_38%,#111c2f_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-95 dark:opacity-100">
        <div className="absolute -left-24 top-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(234,117,64,0.22),transparent_58%)] dark:bg-[radial-gradient(circle,rgba(236,119,64,0.18),transparent_58%)]" />
        <div className="absolute left-[28%] top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(77,115,255,0.18),transparent_60%)] dark:bg-[radial-gradient(circle,rgba(101,128,255,0.18),transparent_60%)]" />
        <div className="absolute -right-10 bottom-0 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(74,171,135,0.18),transparent_58%)] dark:bg-[radial-gradient(circle,rgba(74,171,135,0.14),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.35),transparent_30%,transparent_70%,rgba(255,255,255,0.22))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.03),transparent_30%,transparent_70%,rgba(255,255,255,0.04))]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-[0_10px_30px_rgba(21,31,52,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6f4bd8,#8f63ff)] shadow-[0_10px_24px_rgba(111,75,216,0.28)]">
            <Image src="/smartup-logo-v2.png" alt="SmartUp Logo" width={28} height={28} className="object-contain brightness-0 invert" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">SmartUp</div>
            <div className="text-base font-bold text-slate-900 dark:text-white">Diagnosis Exam</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push("/auth/login")}
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(21,31,52,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-16 lg:pt-8">
        <section className="flex flex-col justify-between gap-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7a5af8]/20 bg-white/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#6d4be0] backdrop-blur-xl dark:border-[#8f78ff]/20 dark:bg-white/6 dark:text-[#b09dff]">
              <Sparkles className="h-4 w-4" />
              Curated Premium Experience
            </div>

            <h1 className="mt-6 max-w-4xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
              <span className="block text-5xl leading-[0.95] sm:text-6xl lg:text-[5.6rem]">Diagnosis,</span>
              <span className="mt-1 block text-5xl leading-[0.95] sm:text-6xl lg:text-[5.6rem]">reframed</span>
              <span className="mt-3 block max-w-3xl text-xl font-semibold tracking-[-0.03em] text-slate-600 sm:text-2xl dark:text-slate-300">
                Give every student a polished exam journey with a focused entry flow, elegant interaction, and a report that feels presentation-ready.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-400 sm:text-lg">
              This diagnosis workspace is designed for clarity, trust, and speed. Select the class, branch, and active paper, then launch directly into a cleaner assessment experience.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <EditorialCard
              eyebrow="Refined"
              title="Live autosave"
              description="Answers keep syncing in the background so the student flow stays stress-free."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <EditorialCard
              eyebrow="Adaptive"
              title="Theme aware"
              description="Light and dark mode carry through the diagnosis pages with one consistent feel."
              icon={<Sparkles className="h-4 w-4" />}
            />
            <EditorialCard
              eyebrow="Compact"
              title="Better exports"
              description="Reports are structured for concise printing instead of long, repetitive page stacks."
              icon={<TimerReset className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[36px] border border-white/60 bg-white/78 p-6 shadow-[0_24px_80px_rgba(19,30,48,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] dark:shadow-[0_30px_90px_rgba(0,0,0,0.38)] sm:p-8 lg:p-9">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(122,90,248,0.18),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(122,90,248,0.18),transparent_62%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(234,117,64,0.16),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(234,117,64,0.12),transparent_62%)]" />

          <div className="relative z-10 mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Student Access</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">Begin Your Diagnosis</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
                Fill in the student details and choose the active paper. The entry flow is intentionally crisp, fast, and premium.
              </p>
            </div>
            <div className="hidden rounded-3xl border border-slate-200/80 bg-slate-50/80 p-3 text-slate-500 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:block">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={handleStartExam} className="relative z-10 space-y-5">
            <InputField icon={<User className="h-4.5 w-4.5" />} label="Student Full Name">
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="h-14 w-full rounded-[22px] border border-slate-200/80 bg-slate-50/78 px-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7a5af8]/40 focus:bg-white focus:ring-4 focus:ring-[#7a5af8]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/7"
              />
            </InputField>

            <InputField icon={<MapPin className="h-4.5 w-4.5" />} label="Select Your Branch">
              <select
                required
                value={studentBranch}
                onChange={(e) => setStudentBranch(e.target.value)}
                className="h-14 w-full appearance-none rounded-[22px] border border-slate-200/80 bg-slate-50/78 px-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-[#7a5af8]/40 focus:bg-white focus:ring-4 focus:ring-[#7a5af8]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/7"
              >
                <option value="" disabled>Select your branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </InputField>

            <InputField icon={<Phone className="h-4.5 w-4.5" />} label="Phone Number">
              <input
                type="tel"
                required
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="Enter phone number"
                className="h-14 w-full rounded-[22px] border border-slate-200/80 bg-slate-50/78 px-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7a5af8]/40 focus:bg-white focus:ring-4 focus:ring-[#7a5af8]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/7"
              />
            </InputField>

            <div className="grid gap-4 sm:grid-cols-3">
              {LEVEL_OPTIONS.map((level) => {
                const active = classLevel === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setClassLevel(level.value)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? "border-[#7a5af8]/35 bg-[linear-gradient(135deg,rgba(122,90,248,0.16),rgba(122,90,248,0.06))] shadow-[0_14px_30px_rgba(122,90,248,0.12)] dark:border-[#8f78ff]/35 dark:bg-[linear-gradient(135deg,rgba(143,120,255,0.18),rgba(143,120,255,0.05))]"
                        : "border-slate-200/80 bg-slate-50/70 hover:border-[#7a5af8]/25 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-[#7a5af8] text-white" : "bg-white text-slate-500 dark:bg-white/10 dark:text-slate-300"}`}>
                        <GraduationCap className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{level.label}</div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Level</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {classLevel ? (
              <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/72 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Active Subject Papers</div>
                {fetchingExams ? (
                  <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/6 dark:text-slate-400">
                    Checking active exams...
                  </div>
                ) : exams.length === 0 ? (
                  <div className="flex gap-3 rounded-[22px] border border-amber-300/40 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>No active diagnosis exams are available for {LEVEL_OPTIONS.find((item) => item.value === classLevel)?.label} right now.</span>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {exams.map((exam) => {
                      const isSelected = selectedExamId === exam.publishingId;
                      return (
                        <button
                          key={exam.publishingId}
                          type="button"
                          onClick={() => setSelectedExamId(exam.publishingId)}
                          className={`rounded-[22px] border px-4 py-4 text-left transition-all ${
                            isSelected
                              ? "border-[#7a5af8]/35 bg-[linear-gradient(135deg,rgba(122,90,248,0.16),rgba(122,90,248,0.05))] shadow-[0_14px_30px_rgba(122,90,248,0.12)] dark:border-[#8f78ff]/35 dark:bg-[linear-gradient(135deg,rgba(143,120,255,0.2),rgba(143,120,255,0.05))]"
                              : "border-slate-200/80 bg-white/70 hover:border-[#7a5af8]/25 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/8"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{exam.subjectName}</div>
                              <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                                {exam.totalQuestions} questions · {exam.totalMarks} marks · {exam.durationMinutes} mins
                              </div>
                            </div>
                            <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-[#7a5af8] bg-[#7a5af8]" : "border-slate-300 dark:border-slate-600"}`}>
                              <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-white" : "bg-transparent"}`} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {error ? (
              <div className="flex gap-3 rounded-[22px] border border-rose-300/40 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !selectedExamId || fetchingExams}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(135deg,#6f4bd8,#8b61ff)] px-6 text-sm font-bold text-white shadow-[0_20px_34px_rgba(111,75,216,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(111,75,216,0.35)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Start Diagnosis Exam
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function EditorialCard({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_14px_34px_rgba(22,31,52,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{eyebrow}</span>
        <span className="rounded-full border border-slate-200/80 bg-white/80 p-2 text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
          {icon}
        </span>
      </div>
      <div className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function InputField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{label}</label>
      <div className="relative text-slate-400 dark:text-slate-500">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>
        {children}
      </div>
    </div>
  );
}
