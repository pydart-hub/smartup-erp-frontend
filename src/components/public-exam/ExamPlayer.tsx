"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  MoonStar,
  Send,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type Question = {
  id: string;
  classLevel: string;
  questionText: string;
  difficulty: string;
  marks: number;
  displayOrder: number;
  options: Array<{
    id: string;
    optionKey: string;
    optionText: string;
  }>;
};

type ExamPlayerProps = {
  attemptId: string;
  studentName: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
};

export default function ExamPlayer({
  attemptId,
  studentName,
  examTitle,
  durationMinutes,
  startedAt,
  questions,
  initialAnswers,
}: ExamPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [savingMap, setSavingMap] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingAnswersRef = useRef<Record<string, string>>({});

  const flushPendingAnswers = async (options: { keepalive?: boolean } = {}) => {
    while (true) {
      if (flushPromiseRef.current) {
        const inFlightResult = await flushPromiseRef.current;
        if (!inFlightResult) return false;
      }

      const snapshot = { ...pendingAnswersRef.current };
      const payload = Object.entries(snapshot).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));

      if (payload.length === 0) {
        return true;
      }

      pendingAnswersRef.current = {};
      setSavingMap((prev) => {
        const next = { ...prev };
        for (const answer of payload) {
          next[answer.questionId] = "saving";
        }
        return next;
      });

      const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

      flushPromiseRef.current = (async () => {
        try {
          const res = await fetch(`/api/public-exam/attempt/${attemptId}/answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-exam-session-token": token,
            },
            body: JSON.stringify({ answers: payload }),
            keepalive: options.keepalive,
          });

          if (!res.ok) {
            throw new Error("Bulk save failed");
          }

          setSavingMap((prev) => {
            const next = { ...prev };
            for (const answer of payload) {
              if (pendingAnswersRef.current[answer.questionId] === undefined) {
                next[answer.questionId] = "saved";
              }
            }
            return next;
          });

          return true;
        } catch (error) {
          console.error(error);
          for (const answer of payload) {
            if (pendingAnswersRef.current[answer.questionId] === undefined) {
              pendingAnswersRef.current[answer.questionId] = answer.selectedOption;
            }
          }

          setSavingMap((prev) => {
            const next = { ...prev };
            for (const answer of payload) {
              next[answer.questionId] = "error";
            }
            return next;
          });

          return false;
        } finally {
          flushPromiseRef.current = null;
        }
      })();

      const result = await flushPromiseRef.current;
      if (!result) {
        return false;
      }
    }
  };

  flushPendingAnswersRef.current = flushPendingAnswers;

  const scheduleFlush = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    flushTimerRef.current = setTimeout(() => {
      void flushPendingAnswers();
    }, 2500);
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    const flushed = await flushPendingAnswers();
    const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

    try {
      if (flushed) {
        await fetch(`/api/public-exam/attempt/${attemptId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-exam-session-token": token,
          },
          body: JSON.stringify({ autoSubmitted: true }),
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      router.push(`/exam-site/result/${attemptId}`);
    }
  };

  autoSubmitRef.current = handleAutoSubmit;

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        void autoSubmitRef.current();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startedAt, durationMinutes]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPendingAnswersRef.current({ keepalive: true });
      }
    };

    const handleBeforeUnload = () => {
      void flushPendingAnswersRef.current({ keepalive: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h > 0 ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
      .filter(Boolean)
      .join(":");
  };

  const handleSelectOption = (optionKey: string) => {
    const activeQuestion = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: optionKey }));
    pendingAnswersRef.current[activeQuestion.id] = optionKey;
    setSavingMap((prev) => ({ ...prev, [activeQuestion.id]: "saving" }));
    scheduleFlush();
  };

  const handleMoveQuestion = async (nextIndex: number) => {
    await flushPendingAnswers();
    setCurrentIndex(nextIndex);
  };

  const handleOpenSubmitModal = async () => {
    await flushPendingAnswers();
    setShowSubmitModal(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

    try {
      const flushed = await flushPendingAnswers();
      if (!flushed) {
        setSubmitError("Some answers are still unsaved. Please wait a moment and try again.");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/public-exam/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-exam-session-token": token,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      router.push(`/exam-site/result/${attemptId}`);
    } catch (error) {
      console.error(error);
      setSubmitError("Failed to submit exam. Please verify your internet connection.");
      setSubmitting(false);
    }
  };

  const activeQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const remainingCount = questions.length - answeredCount;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-app-bg text-text-primary relative overflow-hidden selection:bg-primary-light selection:text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,58,183,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(130,195,91,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(126,87,194,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_28%)]" />

      <header className="sticky top-0 z-20 border-b border-border-light bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-tertiary">Diagnosis Workspace</div>
            <h1 className="mt-1 text-lg font-black text-text-primary sm:text-xl">{examTitle}</h1>
            <p className="mt-1 text-sm text-text-secondary">Candidate: {studentName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-app-bg px-4 py-2 text-xs font-semibold text-text-secondary">
              <Activity className="h-4 w-4 text-success" />
              Autosave active
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-sm font-bold ${remainingSeconds < 300 ? "border-error/25 bg-error/10 text-error" : "border-border-light bg-app-bg text-text-primary"}`}>
              <Clock className="h-4 w-4" />
              {formatTime(remainingSeconds)}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <section className="flex-1 rounded-[30px] border border-border-light bg-surface p-5 shadow-card sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Question {currentIndex + 1} of {questions.length}</div>
              <div className="mt-1 text-sm font-semibold text-text-secondary">{activeQuestion.marks} mark question</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <MoonStar className="h-3.5 w-3.5" />
              {activeQuestion.difficulty}
            </div>
          </div>

          <div className="rounded-[26px] border border-border-light bg-app-bg/65 p-5 sm:p-6">
            <div className="text-lg font-bold leading-8 text-text-primary sm:text-xl">{activeQuestion.questionText}</div>

            <div className="mt-6 grid gap-3">
              {activeQuestion.options.map((opt) => {
                const isSelected = answers[activeQuestion.id] === opt.optionKey;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.optionKey)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${isSelected ? "border-primary bg-primary/8 shadow-card" : "border-border-light bg-surface hover:border-primary/30 hover:bg-primary/4"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isSelected ? "bg-primary text-white" : "bg-app-bg text-text-secondary"}`}>
                        {opt.optionKey}
                      </div>
                      <div className="text-sm font-medium leading-6 text-text-primary">{opt.optionText}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-light pt-4">
            <button
              disabled={currentIndex === 0}
              onClick={() => void handleMoveQuestion(currentIndex - 1)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border-light bg-app-bg px-4 text-sm font-bold text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="text-xs text-text-secondary">
              {savingMap[activeQuestion.id] === "saving" && "Autosaving..."}
              {savingMap[activeQuestion.id] === "saved" && "Saved"}
              {savingMap[activeQuestion.id] === "error" && <span className="font-bold text-error">Unsaved</span>}
            </div>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => void handleOpenSubmitModal()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(103,58,183,0.22)] transition hover:bg-primary-hover"
              >
                <Send className="h-4 w-4" />
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() => void handleMoveQuestion(currentIndex + 1)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(103,58,183,0.22)] transition hover:bg-primary-hover"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        <aside className="w-full shrink-0 lg:w-[320px] xl:w-[360px]">
          <div className="rounded-[30px] border border-border-light bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2 border-b border-border-light pb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm font-black uppercase tracking-[0.2em] text-text-secondary">Assessment Summary</div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border-light bg-app-bg p-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-text-tertiary">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border-light">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <StatCard value={String(answeredCount)} label="Answered" tone="success" />
                <StatCard value={String(remainingCount)} label="Remaining" tone="neutral" />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-text-tertiary">Question Palette</div>
              <div className="grid max-h-[380px] grid-cols-5 gap-2 overflow-y-auto pr-1">
                {questions.map((question, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!answers[question.id];
                  const saveStatus = savingMap[question.id];

                  let style = "border-border-light bg-app-bg text-text-secondary hover:border-primary/30";
                  if (isAnswered && saveStatus === "error") style = "border-error/25 bg-error/10 text-error";
                  else if (isAnswered) style = "border-success/25 bg-success/10 text-success";
                  if (isCurrent) style = "border-primary bg-primary text-white shadow-card";

                  return (
                    <button
                      key={question.id}
                      onClick={() => void handleMoveQuestion(idx)}
                      className={`aspect-square rounded-2xl border text-xs font-bold transition ${style}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {showSubmitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-border-light bg-surface p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3 text-text-primary">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <h3 className="text-xl font-black">Submit Assessment?</h3>
            </div>

            <p className="mt-4 text-sm leading-7 text-text-secondary">
              You answered {answeredCount} out of {questions.length} questions. Once submitted, the paper cannot be changed.
            </p>

            {submitError ? (
              <div className="mt-4 rounded-2xl border border-error/20 bg-error/8 px-4 py-4 text-sm text-error">
                {submitError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="inline-flex h-11 items-center rounded-2xl border border-border-light bg-app-bg px-4 text-sm font-bold text-text-primary transition hover:bg-surface disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinalSubmit()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle className="h-4 w-4" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ value, label, tone }: { value: string; label: string; tone: "success" | "neutral" }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "success" ? "border-success/20 bg-success/10" : "border-border-light bg-surface"}`}>
      <div className={`text-2xl font-black ${tone === "success" ? "text-success" : "text-text-primary"}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">{label}</div>
    </div>
  );
}




