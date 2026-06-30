"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Send,
  AlertTriangle,
  CheckCircle,
  Activity,
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

type ExamPlayerProps = {
  attemptId: string;
  studentName: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string;
  questions: Question[];
  initialAnswers: Record<string, string>; // Maps questionId -> selectedOption
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

  // Initialize and run countdown timer
  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    };

    updateTimer(); // initial run
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startedAt, durationMinutes]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, "0") : null,
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  // Background autosave logic
  const saveAnswerToDb = async (qId: string, optionKey: string) => {
    setSavingMap((prev) => ({ ...prev, [qId]: "saving" }));

    // Get fall-back session token from sessionStorage if cookies are blocked
    const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

    try {
      const res = await fetch(`/api/public-exam/attempt/${attemptId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-exam-session-token": token,
        },
        body: JSON.stringify({ questionId: qId, selectedOption: optionKey }),
      });

      if (res.ok) {
        setSavingMap((prev) => ({ ...prev, [qId]: "saved" }));
      } else {
        setSavingMap((prev) => ({ ...prev, [qId]: "error" }));
      }
    } catch (err) {
      console.error(err);
      setSavingMap((prev) => ({ ...prev, [qId]: "error" }));
    }
  };

  const handleSelectOption = (optionKey: string) => {
    const activeQuestion = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: optionKey }));
    saveAnswerToDb(activeQuestion.id, optionKey);
  };

  const handleAutoSubmit = async () => {
    console.log("Timer expired. Triggering auto-submit...");
    setSubmitting(true);
    const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

    try {
      const res = await fetch(`/api/public-exam/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-exam-session-token": token,
        },
        body: JSON.stringify({ autoSubmitted: true }),
      });

      if (res.ok) {
        router.push(`/exam-site/result/${attemptId}`);
      } else {
        router.push(`/exam-site/result/${attemptId}`);
      }
    } catch (err) {
      console.error(err);
      router.push(`/exam-site/result/${attemptId}`);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const token = sessionStorage.getItem(`exam_token_${attemptId}`) || "";

    try {
      const res = await fetch(`/api/public-exam/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-exam-session-token": token,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });

      if (res.ok) {
        router.push(`/exam-site/result/${attemptId}`);
      } else {
        const data = await res.json();
        setSubmitError(data.error || "Submission failed");
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to submit exam. Please verify your internet connection.");
      setSubmitting(false);
    }
  };

  const activeQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Top Banner / Timer Bar */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 relative z-10 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">{examTitle}</h2>
            <div className="text-xs text-slate-400 mt-0.5">Candidate: {studentName}</div>
          </div>

          <div className="flex items-center gap-6">
            {/* Connection / Auto-save Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Autosave active</span>
            </div>

            {/* Visual Timer */}
            <div className={`flex items-center gap-2.5 px-4.5 py-2 rounded-2xl border font-mono text-lg font-bold shadow-md transition-all duration-300 ${
              remainingSeconds < 300
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                : "bg-slate-900 border-slate-800 text-slate-200"
            }`}>
              <Clock className="w-5 h-5 shrink-0" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Left Side: Question Pane */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 sm:p-8 flex-1 flex flex-col gap-6 shadow-xl relative min-h-0">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 shrink-0">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Question {currentIndex + 1} of {questions.length}
              </div>
              <div className="text-xs text-slate-500">
                Weight: {activeQuestion.marks} Mark(s)
              </div>
            </div>

            {/* Question Stem */}
            <div className="flex-1 overflow-y-auto text-base sm:text-lg text-slate-100 font-medium leading-relaxed pr-2">
              {activeQuestion.questionText}
            </div>

            {/* Options list */}
            <div className="grid grid-cols-1 gap-3 shrink-0">
              {activeQuestion.options.map((opt) => {
                const isSelected = answers[activeQuestion.id] === opt.optionKey;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.optionKey)}
                    className={`w-full text-left p-4.5 rounded-2xl border transition-all duration-150 flex items-center justify-between text-sm sm:text-base font-semibold group cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors duration-150 ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-slate-950"
                          : "bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600 group-hover:text-slate-200"
                      }`}>
                        {opt.optionKey}
                      </div>
                      <div className="mt-0.5">{opt.optionText}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between border-t border-slate-700/50 pt-4 shrink-0">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((idx) => idx - 1)}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:text-slate-600 disabled:hover:text-slate-600 transition-colors duration-150 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="text-xs text-slate-500">
                {savingMap[activeQuestion.id] === "saving" && "Autosaving..."}
                {savingMap[activeQuestion.id] === "saved" && "Saved successfully"}
                {savingMap[activeQuestion.id] === "error" && (
                  <span className="text-rose-400 font-bold">Unsaved (offline)</span>
                )}
              </div>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 transition-all duration-150 py-2.5 px-5 rounded-xl shadow-lg hover:shadow-emerald-500/20 cursor-pointer animate-pulse"
                >
                  <Send className="w-4 h-4 fill-current" />
                  <span>Submit Exam</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((idx) => idx + 1)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors duration-150 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Navigation Palette */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-700/50 pb-3">
              Assessment Summary
            </h3>

            {/* Answer Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-emerald-400">{answeredCount}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Answered</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-slate-400">{questions.length - answeredCount}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Remaining</div>
              </div>
            </div>

            {/* Grid of Numbers */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">Question Palette</div>
              <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!answers[q.id];
                  const saveStatus = savingMap[q.id];

                  let btnBg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300";
                  if (isAnswered) {
                    if (saveStatus === "error") {
                      btnBg = "bg-rose-500/10 border-rose-500 text-rose-400";
                    } else {
                      btnBg = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                    }
                  }
                  if (isCurrent) {
                    btnBg = "bg-slate-200 border-white text-slate-950 font-extrabold shadow-md scale-105";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-full aspect-square text-xs font-bold rounded-xl border flex items-center justify-center transition-all duration-150 cursor-pointer ${btnBg}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Palette Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-500 border-t border-slate-700/50 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500 shrink-0" />
                <span>Answered</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800 shrink-0" />
                <span>Unvisited</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-white shrink-0" />
                <span>Active</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <span>Submit Assessment?</span>
            </h3>

            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Are you sure you want to finish the exam? You have answered **{answeredCount}** out of **{questions.length}** questions. You cannot edit your choices after submission.
            </p>

            {submitError && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-rose-400 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-700/50 hover:text-white transition-colors duration-150 disabled:opacity-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
