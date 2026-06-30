"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  GraduationCap,
  MapPin,
  Phone,
  Play,
  Sparkles,
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
    <div className="min-h-screen bg-app-bg text-text-primary relative overflow-hidden selection:bg-primary-light selection:text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,58,183,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(130,195,91,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(234,247,245,0.65))] dark:bg-[radial-gradient(circle_at_top_left,rgba(126,87,194,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(11,17,32,0.98),rgba(17,24,39,0.96))]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-full border border-border-light bg-surface/85 px-4 py-2 shadow-card backdrop-blur">
          <Image src="/smartup-logo-v2.png" alt="SmartUp Logo" width={36} height={36} className="object-contain" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-tertiary">SmartUp</div>
            <div className="text-sm font-semibold text-text-primary">Diagnosis Exam</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push("/auth/login")}
            className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface/85 px-4 py-2 text-sm font-semibold text-text-secondary shadow-card backdrop-blur transition-colors hover:bg-app-bg hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-7xl gap-8 px-4 pb-10 pt-2 sm:px-6 lg:grid-cols-[1fr_560px] lg:px-8 lg:pb-14">
        <section className="flex flex-col justify-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-4 w-4" />
              Premium Diagnosis Experience
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Start a clean, focused diagnosis exam with a premium result report.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-text-secondary sm:text-lg">
              Choose your class, branch, and subject exam. The full flow now supports theme switching and a compact export-ready diagnosis report.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <FeatureCard title="Smart Theme" description="Light and dark mode across diagnosis pages." />
            <FeatureCard title="Live Autosave" description="Exam answers save continuously while you work." />
            <FeatureCard title="Compact Report" description="Export is optimized for short premium summaries." />
          </div>
        </section>

        <section className="rounded-[32px] border border-border-light bg-surface/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-tertiary">Student Access</div>
            <h2 className="mt-2 text-2xl font-black text-text-primary">Begin Your Diagnosis</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Fill in your details and select the active exam paper for your class.
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-5">
            <InputField icon={<User className="h-4.5 w-4.5" />} label="Student Full Name">
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="h-13 w-full rounded-2xl border border-border-light bg-app-bg px-11 pr-4 text-sm text-text-primary outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </InputField>

            <InputField icon={<MapPin className="h-4.5 w-4.5" />} label="Select Your Branch">
              <select
                required
                value={studentBranch}
                onChange={(e) => setStudentBranch(e.target.value)}
                className="h-13 w-full appearance-none rounded-2xl border border-border-light bg-app-bg px-11 pr-10 text-sm text-text-primary outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
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
                className="h-13 w-full rounded-2xl border border-border-light bg-app-bg px-11 pr-4 text-sm text-text-primary outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </InputField>

            <InputField icon={<GraduationCap className="h-4.5 w-4.5" />} label="Select Your Class">
              <select
                required
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="h-13 w-full appearance-none rounded-2xl border border-border-light bg-app-bg px-11 pr-10 text-sm text-text-primary outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              >
                <option value="" disabled>Select your class</option>
                <option value="8">Class 8</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
              </select>
            </InputField>

            {classLevel ? (
              <div className="rounded-[24px] border border-border-light bg-app-bg/70 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">Available Subject Exams</div>
                {fetchingExams ? (
                  <div className="rounded-2xl border border-border-light bg-surface px-4 py-6 text-center text-sm text-text-secondary">
                    Checking active exams...
                  </div>
                ) : exams.length === 0 ? (
                  <div className="flex gap-3 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-4 text-sm text-warning">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>No active diagnosis exams are available for Class {classLevel} right now.</span>
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
                          className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/8 shadow-card"
                              : "border-border-light bg-surface hover:border-primary/30 hover:bg-primary/4"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-bold text-text-primary">{exam.subjectName}</div>
                              <div className="mt-1 text-xs text-text-secondary">
                                {exam.totalQuestions} questions - {exam.totalMarks} marks - {exam.durationMinutes} mins
                              </div>
                            </div>
                            <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary" : "border-border-input"}`}>
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
              <div className="flex gap-3 rounded-2xl border border-error/20 bg-error/8 px-4 py-4 text-sm text-error">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !selectedExamId || fetchingExams}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-white shadow-[0_16px_30px_rgba(103,58,183,0.24)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border-input disabled:shadow-none"
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

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-border-light bg-surface/80 p-5 shadow-card backdrop-blur">
      <div className="text-sm font-bold text-text-primary">{title}</div>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
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
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{label}</label>
      <div className="relative text-text-tertiary">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>
        {children}
      </div>
    </div>
  );
}
