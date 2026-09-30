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
  Lock,
} from "lucide-react";
import ExamSecurityGuard from "@/components/public-exam/ExamSecurityGuard";

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

type LevelUpExamPlayerProps = {
  attemptId: string;
  studentName: string;
  studentPhone?: string;
  examTitle: string;
  classLevel: string;
  durationMinutes: number;
  startedAt: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
};

function cleanExamText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s*---\s*PAGE\s*\d+\s*---\s*/gi, "")
    .replace(/^All questions are compulsory.*?\b\d+\.\s*/i, "")
    .replace(/(?:\s+\d+\.)+\s*$/, "")
    .replace(/^\s*(?:\d+\.\s*){2,}/, "")
    .replace(/■/g, "₹")
    .trim();
}

export default function LevelUpExamPlayer({
  attemptId,
  studentName,
  studentPhone,
  examTitle,
  classLevel,
  durationMinutes,
  startedAt,
  questions,
  initialAnswers,
}: LevelUpExamPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [savingMap, setSavingMap] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(60);
  const [expiredQuestionIds, setExpiredQuestionIds] = useState<Set<string>>(new Set());
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
      } else {
        break;
      }
    }

    const payload = Object.entries(pendingAnswersRef.current).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));

    if (payload.length === 0) return true;

    payload.forEach((p) => {
      setSavingMap((prev) => ({ ...prev, [p.questionId]: "saving" }));
    });

    const promise = (async () => {
      try {
        const res = await fetch(`/api/levelup/attempt/${attemptId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
          keepalive: Boolean(options.keepalive),
        });

        if (!res.ok) throw new Error("Autosave failed");

        payload.forEach((p) => {
          if (pendingAnswersRef.current[p.questionId] === p.selectedOption) {
            delete pendingAnswersRef.current[p.questionId];
          }
          setSavingMap((prev) => ({ ...prev, [p.questionId]: "saved" }));
        });
        return true;
      } catch (err) {
        console.error("Autosave error:", err);
        payload.forEach((p) => {
          setSavingMap((prev) => ({ ...prev, [p.questionId]: "error" }));
        });
        return false;
      } finally {
        flushPromiseRef.current = null;
      }
    })();

    flushPromiseRef.current = promise;
    return promise;
  };

  flushPendingAnswersRef.current = flushPendingAnswers;

  // Handle option select
  const handleSelectOption = (optionKey: string) => {
    if (!currentQuestion) return;
    if (expiredQuestionIds.has(currentQuestion.id)) return; // locked

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionKey }));
    pendingAnswersRef.current[currentQuestion.id] = optionKey;
    setSavingMap((prev) => ({ ...prev, [currentQuestion.id]: "saving" }));

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      void flushPendingAnswersRef.current();
    }, 600);
  };

  // Submit flow
  const handleFinalSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    await flushPendingAnswersRef.current();

    try {
      const res = await fetch(`/api/levelup/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmitted: auto }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit exam");
      }

      router.push(`/levelup/result/${attemptId}`);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await flushPendingAnswersRef.current();

    try {
      const res = await fetch(`/api/levelup/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmitted: true }),
      });

      if (!res.ok) throw new Error("Auto-submit failed");
      router.push(`/levelup/result/${attemptId}`);
    } catch {
      router.push(`/levelup/result/${attemptId}`);
    }
  };

  autoSubmitRef.current = handleAutoSubmit;

  // Overall Exam Timer: 1 min per question
  const totalExamMinutes = questions.length > 0 ? questions.length : (durationMinutes || 40);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const durationMs = totalExamMinutes * 60 * 1000;
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
  }, [startedAt, totalExamMinutes]);

  // Per-Question 1-Minute (60s) Timer
  useEffect(() => {
    setQuestionSecondsLeft(60);

    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
    }

    questionTimerRef.current = setInterval(() => {
      setQuestionSecondsLeft((prev) => {
        if (prev <= 1) {
          flushPendingAnswersRef.current();
          const curr = currentIndexRef.current;
          const total = totalQuestionsRef.current;

          const timedOutQ = questions[curr];
          if (timedOutQ) {
            setExpiredQuestionIds((prevSet) => {
              const updated = new Set(prevSet);
              updated.add(timedOutQ.id);
              return updated;
            });
          }

          if (curr < total - 1) {
            setCurrentIndex(curr + 1);
            return 60;
          } else {
            clearInterval(questionTimerRef.current!);
            autoSubmitRef.current();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, questions]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUrgent = remainingSeconds < 300;

  return (
    <ExamSecurityGuard
      studentName={studentName}
      studentPhone={studentPhone}
      attemptId={attemptId}
      onAutoSubmit={handleAutoSubmit}
    >
      <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between selection:bg-[#5C34A4] selection:text-white font-sans">
        {/* Top Header Bar */}
        <header className="w-full bg-white border-b border-slate-200/80 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Brand Logo & Exam Badge */}
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <Image
                  src="/smartup-logo-v2.png"
                  alt="SmartUp LevelUp GCC"
                  width={36}
                  height={36}
                  priority
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-black tracking-tight text-slate-900 leading-none">
                  SMART UP
                </span>
                <span className="text-[9px] font-bold text-[#5C34A4] tracking-widest uppercase mt-0.5">
                  LevelUp GCC Exam
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{studentName}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#5C34A4] font-bold text-[11px]">
                  {classLevel}
                </span>
              </div>
            </div>

            {/* Timers & Submit CTA */}
            <div className="flex items-center gap-3">
              {/* Question Timer Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-colors ${
                  questionSecondsLeft <= 10
                    ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse"
                    : questionSecondsLeft <= 20
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : "bg-purple-50 text-[#5C34A4] border border-purple-200/60"
                }`}
                title="Current Question 1-minute countdown"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Q: {String(questionSecondsLeft).padStart(2, "0")}s</span>
              </div>

              {/* Total Exam Time */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold ${
                  isUrgent
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
                title="Total exam time"
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
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </span>
                  )}
                  {savingMap[currentQuestion?.id] === "error" && (
                    <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Retry
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              {currentQuestion ? (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed mb-6 whitespace-pre-line">
                    {cleanExamText(currentQuestion.questionText)}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.optionKey;
                      const isLocked = expiredQuestionIds.has(currentQuestion.id);

                      return (
                        <button
                          key={option.id || option.optionKey}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleSelectOption(option.optionKey)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer disabled:cursor-not-allowed ${
                            isSelected
                              ? "bg-purple-50/80 border-[#5C34A4] shadow-sm ring-1 ring-[#5C34A4]"
                              : isLocked
                              ? "bg-slate-50 border-slate-200/60 opacity-60"
                              : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#5C34A4] text-white"
                                : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                            }`}
                          >
                            {option.optionKey}
                          </span>
                          <span className={`text-sm ${isSelected ? "font-bold text-[#5C34A4]" : "text-slate-700"}`}>
                            {cleanExamText(option.optionText)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">Loading question...</div>
              )}
            </div>

            {/* Bottom Nav Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  void flushPendingAnswersRef.current();
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="text-xs text-slate-400 font-medium hidden sm:block">
                Press next or pick from the palette
              </div>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    void flushPendingAnswersRef.current();
                    setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#5C34A4] hover:bg-[#4D2B8A] font-bold text-xs text-white flex items-center gap-1.5 shadow-md shadow-purple-900/20 cursor-pointer transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
                >
                  <span>Finish &amp; Submit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </section>

          {/* Right Column: Question Palette Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Status Summary Widget */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5C34A4]" />
                <span>Question Palette</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                  <span className="text-slate-600">Answered:</span>
                  <span className="font-bold text-[#5C34A4]">{answeredCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Remaining:</span>
                  <span className="font-bold text-slate-700">{totalQuestions - answeredCount}</span>
                </div>
              </div>

              {/* Grid of Question Number Buttons */}
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-2 pt-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(answers[q.id]);
                  const isLocked = expiredQuestionIds.has(q.id);

                  let bgClass = "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent";
                  if (isAnswered) {
                    bgClass = "bg-[#5C34A4] text-white font-bold border-transparent";
                  }
                  if (isCurrent) {
                    bgClass = "ring-2 ring-purple-600 ring-offset-2 font-bold " + (isAnswered ? "bg-[#5C34A4] text-white" : "bg-purple-100 text-[#5C34A4]");
                  }
                  if (isLocked && !isAnswered) {
                    bgClass = "bg-rose-50 text-rose-400 border border-rose-200/60";
                  }

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => {
                        void flushPendingAnswersRef.current();
                        setCurrentIndex(idx);
                      }}
                      className={`h-9 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#5C34A4]" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-100" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-100 ring-1 ring-purple-600" />
                  <span>Current</span>
                </div>
              </div>
            </div>

            {/* Test Security Reminder */}
            <div className="bg-gradient-to-br from-slate-900 to-[#121722] text-white rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Anti-Cheat AI Active</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Tabs, window switches, and screenshot attempts are monitored. Each question gives you 1 minute.
              </p>
            </div>
          </aside>
        </main>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#5C34A4] flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900">Ready to Submit Exam?</h3>
                <p className="text-xs text-slate-500">
                  You have answered <strong className="text-[#5C34A4]">{answeredCount}</strong> of{" "}
                  <strong>{totalQuestions}</strong> questions.
                </p>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                  {submitError}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Questions Attempted:</span>
                  <span className="font-bold text-slate-900">{answeredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Questions Skipped:</span>
                  <span className="font-bold text-slate-900">{totalQuestions - answeredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Remaining:</span>
                  <span className="font-bold text-[#5C34A4]">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Return to Exam
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="flex-1 py-3 rounded-xl bg-[#5C34A4] hover:bg-[#4D2B8A] text-white font-bold text-xs transition shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Yes, Submit Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExamSecurityGuard>
  );
}
