"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldCheck,
} from "lucide-react";

type LevelUpQuestion = {
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
  questions: LevelUpQuestion[];
  initialAnswers: Record<string, string>;
};

export default function LevelUpExamPlayer({
  attemptId,
  studentName,
  examTitle,
  classLevel,
  durationMinutes,
  startedAt,
  questions,
  initialAnswers,
}: LevelUpExamPlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const total = durationMinutes * 60;
    return Math.max(0, total - elapsed);
  });

  // Autosave buffer ref
  const pendingAnswersRef = useRef<{ questionId: string; selectedOption: string }[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timeRemainingSeconds <= 0) {
      handleFinalSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemainingSeconds]);

  // Autosave flush interval
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (pendingAnswersRef.current.length > 0) {
        const payload = [...pendingAnswersRef.current];
        pendingAnswersRef.current = [];
        fetch(`/api/levelup/attempt/${attemptId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        }).catch((err) => {
          console.warn("[Autosave] Failed to sync:", err);
          pendingAnswersRef.current.push(...payload);
        });
      }
    }, 3000);

    return () => clearInterval(flushInterval);
  }, [attemptId]);

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    pendingAnswersRef.current.push({ questionId, selectedOption: optionKey });
  };

  const handleFinalSubmit = async (auto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (pendingAnswersRef.current.length > 0) {
        await fetch(`/api/levelup/attempt/${attemptId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: pendingAnswersRef.current }),
        }).catch(() => {});
      }

      const res = await fetch(`/api/levelup/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmitted: auto }),
      });

      if (res.ok) {
        router.push(`/levelup/result/${attemptId}`);
      } else {
        alert("Failed to submit exam. Please try again.");
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      alert("Submission error. Please check your internet connection.");
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#10141E] px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              LEVELUP GCC
            </span>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white truncate max-w-[200px] md:max-w-none">
                {examTitle}
              </h2>
              <p className="text-xs text-slate-400">
                Candidate: {studentName} • {classLevel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
                timeRemainingSeconds < 300
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                  : "bg-slate-900 border-slate-800 text-emerald-400"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
            >
              Finish Exam
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination View */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        {currentQ ? (
          <div className="bg-[#121722] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-xs font-medium text-emerald-400">
                Answered: {answeredCount}/{questions.length}
              </span>
            </div>

            <h3 className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed mb-6">
              {currentQ.questionText}
            </h3>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.optionKey;
                return (
                  <button
                    key={opt.id || opt.optionKey}
                    onClick={() => handleSelectOption(currentQ.id, opt.optionKey)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 text-white font-medium shadow-md shadow-emerald-950/20"
                        : "bg-[#181F2E] border-slate-800 text-slate-300 hover:bg-[#1f283a] hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isSelected
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {opt.optionKey}
                    </span>
                    <span className="flex-1">{opt.optionText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">No questions loaded for this test.</div>
        )}
      </main>

      {/* Footer Navigation Bar */}
      <footer className="border-t border-slate-800 bg-[#10141E] px-4 py-4 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              Submit Exam <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h4 className="text-xl font-bold text-white mb-2">Submit LevelUp Exam?</h4>
            <p className="text-sm text-slate-400 mb-6">
              You have answered <span className="text-emerald-400 font-bold">{answeredCount}</span> out of{" "}
              <span className="font-bold text-white">{questions.length}</span> questions. Once submitted,
              your answers will be sealed and your score will be generated immediately.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-sm font-semibold cursor-pointer"
              >
                Keep Reviewing
              </button>

              <button
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
