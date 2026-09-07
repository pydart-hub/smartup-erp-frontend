"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Send,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

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

type ScholarExamPlayerProps = {
  attemptId: string;
  studentName: string;
  examTitle: string;
  classLevel: string;
  durationMinutes: number;
  startedAt: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
};

export default function ScholarExamPlayer({
  attemptId,
  studentName,
  examTitle,
  classLevel,
  durationMinutes,
  startedAt,
  questions,
  initialAnswers,
}: ScholarExamPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [savingMap, setSavingMap] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const flushPendingAnswersRef = useRef<(options?: { keepalive?: boolean }) => Promise<boolean>>(async () => true);
  const autoSubmitRef = useRef<() => Promise<void>>(async () => {});
  const pendingAnswersRef = useRef<Record<string, string>>({});

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const totalQuestions = questions.length;
  const totalQuestionsRef = useRef(totalQuestions);
  totalQuestionsRef.current = totalQuestions;

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Flush pending answers to backend
  const flushPendingAnswers = async (options: { keepalive?: boolean } = {}) => {
    while (true) {
      if (flushPromiseRef.current) {
        const inFlightResult = await flushPromiseRef.current;
        if (!inFlightResult) return false;
      }

      const snapshot = { ...pendingAnswersRef.current };
      const payload = Object.entries(snapshot).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

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

      const token = sessionStorage.getItem(`scholar_token_${attemptId}`) || "";

      flushPromiseRef.current = (async () => {
        try {
          const res = await fetch(`/api/scholar/attempt/${attemptId}/answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-scholar-session-token": token,
            },
            body: JSON.stringify({ answers: payload }),
            keepalive: options.keepalive,
          });

          if (!res.ok) throw new Error("Failed to save answer");

          setSavingMap((prev) => {
            const next = { ...prev };
            for (const answer of payload) {
              next[answer.questionId] = "saved";
            }
            return next;
          });
          return true;
        } catch {
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

      const success = await flushPromiseRef.current;
      if (!success) return false;
    }
  };

  flushPendingAnswersRef.current = flushPendingAnswers;

  // Auto-submit logic when overall timer expires or final question expires
  const handleAutoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await flushPendingAnswersRef.current();

    try {
      const token = sessionStorage.getItem(`scholar_token_${attemptId}`) || "";
      const res = await fetch(`/api/scholar/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scholar-session-token": token,
        },
        body: JSON.stringify({ autoSubmitted: true }),
      });

      if (!res.ok) throw new Error("Auto-submit failed");
      router.push(`/scholar/result/${attemptId}`);
    } catch {
      router.push(`/scholar/result/${attemptId}`);
    }
  };

  autoSubmitRef.current = handleAutoSubmit;

  // Overall Exam Timer (30 mins)
  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = startTime + durationMs;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        autoSubmitRef.current();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startedAt, durationMinutes]);

  // Per-Question 1-Minute (60 Seconds) Timer:
  // When timer expires, auto-advances to the next question. If last question, auto-submits.
  useEffect(() => {
    setQuestionSecondsLeft(60);

    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
    }

    questionTimerRef.current = setInterval(() => {
      setQuestionSecondsLeft((prev) => {
        if (prev <= 1) {
          // Question time expired: flush answers and advance
          flushPendingAnswersRef.current();
          const curr = currentIndexRef.current;
          const total = totalQuestionsRef.current;

          if (curr < total - 1) {
            // Auto advance to next question
            setCurrentIndex(curr + 1);
            return 60;
          } else {
            // On last question, timer expired -> auto submit exam
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
            autoSubmitRef.current();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
    };
  }, [currentIndex]);

  // Page unload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushPendingAnswersRef.current({ keepalive: true });
      e.preventDefault();
      e.returnValue = "You have an exam in progress. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Handle option selection
  const handleSelectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    pendingAnswersRef.current[questionId] = optionKey;

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushPendingAnswersRef.current();
    }, 400);
  };

  // Submit confirmation handler
  const handleManualSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    await flushPendingAnswersRef.current();

    try {
      const token = sessionStorage.getItem(`scholar_token_${attemptId}`) || "";
      const res = await fetch(`/api/scholar/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scholar-session-token": token,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit exam");
      }

      router.push(`/scholar/result/${attemptId}`);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUrgent = remainingSeconds < 300; // < 5 mins

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between font-sans select-none">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Exam Tag */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <Image src="/smartup-logo-v2.png" alt="SmartUp" width={36} height={36} priority className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 leading-none">
                SMART UP
              </span>
              <span className="text-[10px] font-bold text-[#5C34A4] tracking-widest uppercase mt-0.5">
                Scholarship Exam
              </span>
            </div>
          </div>

          {/* Candidate Info */}
          <div className="hidden md:flex items-center gap-3 text-xs bg-purple-50/70 border border-purple-100 px-3.5 py-1.5 rounded-full">
            <span className="text-slate-500 font-medium">Candidate:</span>
            <span className="font-bold text-slate-900">{studentName}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-[#5C34A4] font-bold">Class {classLevel}</span>
          </div>

          {/* Timer & Submit CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Per-Question 1-Minute Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
                questionSecondsLeft <= 10
                  ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse ring-2 ring-rose-200"
                  : questionSecondsLeft <= 20
                  ? "bg-amber-50 text-amber-700 border border-amber-300"
                  : "bg-purple-50 text-[#5C34A4] border border-purple-200"
              }`}
              title="Time remaining for this question (auto-moves on 00:00)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-sans uppercase font-bold tracking-wider opacity-75">Q Time:</span>
              <span>00:{String(questionSecondsLeft).padStart(2, "0")}</span>
            </div>

            {/* Total 30-Min Exam Time */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold ${
                isUrgent
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
              title="Total 30-minute exam time"
            >
              <span className="text-[9px] text-slate-400 font-sans uppercase font-bold tracking-wider">Total:</span>
              <span>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="bg-[#5C34A4] hover:bg-[#4D2B8A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Submit</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Question Canvas + Palette */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Presentation Area */}
        <section className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            {/* 60s Question Timer Linear Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-5">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  questionSecondsLeft <= 10
                    ? "bg-rose-500"
                    : questionSecondsLeft <= 20
                    ? "bg-amber-500"
                    : "bg-[#5C34A4]"
                }`}
                style={{ width: `${(questionSecondsLeft / 60) * 100}%` }}
              />
            </div>

            {/* Question Top Status */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="bg-[#5C34A4] text-white text-xs font-black px-3 py-1 rounded-lg">
                  Q {currentIndex + 1}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  of {totalQuestions} Questions
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span
                  className={`text-xs font-bold font-mono ${
                    questionSecondsLeft <= 10
                      ? "text-rose-600 animate-pulse"
                      : questionSecondsLeft <= 20
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
                >
                  ⏱️ 00:{String(questionSecondsLeft).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {savingMap[currentQuestion?.id] === "saving" && (
                  <span className="text-[11px] text-amber-500 font-medium animate-pulse">Saving...</span>
                )}
                {savingMap[currentQuestion?.id] === "saved" && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C34A4] bg-purple-50 px-2.5 py-1 rounded-md">
                  1 Mark
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                {currentQuestion?.questionText}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion?.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.optionKey;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.optionKey)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                      isSelected
                        ? "border-[#5C34A4] bg-purple-50/70 text-slate-900 shadow-sm ring-2 ring-[#5C34A4]/20"
                        : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#5C34A4] text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {opt.optionKey}
                    </div>
                    <span className="text-sm sm:text-[15px] font-medium leading-normal">
                      {opt.optionText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Navigation Controls */}
          <div className="border-t border-slate-100 pt-6 mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-[#5C34A4] hover:bg-[#4D2B8A] text-white text-xs font-bold shadow-md shadow-purple-900/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Review &amp; Finish</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>

        {/* Right Column: 40-Question Palette & Progress */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Question Grid
              </h3>
              <span className="text-xs font-bold text-[#5C34A4]">
                {answeredCount} / {totalQuestions} Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-5">
              <div
                className="h-full bg-[#5C34A4] transition-all duration-300 rounded-full"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Questions Grid 1 to 40 */}
            <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-8 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? "ring-2 ring-[#5C34A4] bg-purple-100 text-[#5C34A4] font-black"
                        : isAnswered
                        ? "bg-[#5C34A4] text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/70"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-4 mt-5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#5C34A4]" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200" />
                <span>Pending ({totalQuestions - answeredCount})</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#5C34A4] shrink-0 mt-0.5" />
            <span>
              All answers are automatically saved in real time. Do not refresh or close your browser tab.
            </span>
          </div>
        </section>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#5C34A4] flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-xl font-black text-slate-900">Submit Scholarship Exam?</h4>
              <p className="text-xs text-slate-500">
                You have answered <strong className="text-[#5C34A4]">{answeredCount}</strong> of{" "}
                <strong className="text-slate-800">{totalQuestions}</strong> questions.
              </p>
            </div>

            {totalQuestions - answeredCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  You still have {totalQuestions - answeredCount} unanswered questions. Once submitted, you cannot change your answers.
                </span>
              </div>
            )}

            {submitError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleManualSubmit}
                className="py-3 px-4 rounded-xl bg-[#5C34A4] hover:bg-[#4D2B8A] text-white text-xs font-bold shadow-lg shadow-purple-900/20 transition cursor-pointer disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
